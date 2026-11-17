import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  anonClient,
  assign,
  cleanup,
  createUser,
  RUN,
  serviceClient,
  structure,
  withDb,
  type TestUser,
} from "../support/supabase";

/**
 * App access (D-16): rules in PI-CORE decide which app roles a member gets; apps call my_app_roles().
 * Baseline rules: ARK "pengurus" for Departemen CMIT and Departemen Pelayanan Khusus, divisions included.
 */
let superAdmin: TestUser;
let admin: TestUser; // stored admin, no position
let musik: TestUser; // Staff in Musik (division of Pelayanan Khusus) -> pengurus through the baseline rule
let eo: TestUser; // Staff in EO (division of Departemen Internal) -> nothing from the baseline
let outsider: TestUser; // no assignment
let temp: TestUser; // Staff in IT (division of CMIT) but still on a temporary password
let gone: TestUser; // Staff in Desain (division of CMIT), then deactivated
let s: Awaited<ReturnType<typeof structure>>;
const note = `itest ${RUN}`;

const roles = async (u: TestUser, app = "ark") => {
  const { data, error } = await u.client.rpc("my_app_roles", { p_app: app });
  if (error) throw error;
  return data;
};

/** Adds a rule as the super admin (through RLS, like the app) and returns its id. */
async function addRule(row: {
  app_role_key: string;
  subject_type: "member" | "role" | "position" | "org_unit";
  member_id?: string;
  role_id?: string;
  position_id?: string;
  org_unit_id?: string;
  include_child_units?: boolean;
}) {
  const { data, error } = await superAdmin.client
    .from("app_access_rules")
    .insert({ app_key: "ark", note, ...row })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

beforeAll(async () => {
  [superAdmin, admin, musik, eo, outsider, temp, gone] = await Promise.all([
    createUser("aa-super", "super_admin"),
    createUser("aa-admin", "admin"),
    createUser("aa-musik", "member"),
    createUser("aa-eo", "member"),
    createUser("aa-outsider", "member"),
    createUser("aa-temp", "member", { mustChangePassword: true }),
    createUser("aa-gone", "member"),
  ]);
  s = await structure();
  const staff = s.position("division", "Staff");
  await assign(musik.memberId, s.unit("Musik"), staff, s.activePeriodId);
  await assign(eo.memberId, s.unit("EO"), staff, s.activePeriodId);
  await assign(temp.memberId, s.unit("IT"), staff, s.activePeriodId);
  await assign(gone.memberId, s.unit("Desain"), staff, s.activePeriodId);
  await serviceClient().from("members").update({ is_active: false }).eq("id", gone.memberId);
});

afterAll(async () => {
  await withDb((db) => db.query("delete from public.app_access_rules where note = $1", [note]));
  await cleanup();
});

describe("baseline rules", () => {
  it("registers pmk-form with one admin role", async () => {
    const { data } = await serviceClient().from("app_roles").select("key").eq("app_key", "form");
    expect(data!.map((r) => r.key)).toEqual(["admin"]);
  });

  it("seeds PMK ARK with an admin and a pengurus role", async () => {
    const { data } = await serviceClient().from("app_roles").select("key").eq("app_key", "ark").order("key");
    expect(data!.map((r) => r.key)).toEqual(["admin", "pengurus"]);
  });

  it("gives pengurus to a division of Pelayanan Khusus, nothing to Departemen Internal or the unassigned", async () => {
    expect(await roles(musik)).toEqual(["pengurus"]);
    expect(await roles(eo)).toEqual([]);
    expect(await roles(outsider)).toEqual([]);
  });

  it("gives nothing to a member on a temporary password or a deactivated member", async () => {
    expect(await roles(temp)).toEqual([]);
    const { data: goneClientResult } = await gone.client.rpc("my_app_roles", { p_app: "ark" });
    expect(goneClientResult ?? []).toEqual([]);
    const { data: holders } = await admin.client.rpc("app_access_holders", { p_app: "ark" });
    const ids = (holders ?? []).map((h) => h.member_id);
    expect(ids).toContain(musik.memberId);
    expect(ids).not.toContain(temp.memberId);
    expect(ids).not.toContain(gone.memberId);
  });

  it("lists a temporary-password member as pending (admins only), not as a holder", async () => {
    const { data: pending } = await admin.client.rpc("app_access_pending", { p_app: "ark" });
    const mine = (pending ?? []).filter((p) => p.member_id === temp.memberId);
    expect(mine.map((p) => p.app_role_key)).toEqual(["pengurus"]);
    expect(mine[0].never_signed_in).toBe(false); // createUser signs in once
    expect((pending ?? []).map((p) => p.member_id)).not.toContain(gone.memberId); // deactivated: not pending either
    expect((pending ?? []).map((p) => p.member_id)).not.toContain(musik.memberId); // already has access
    const { data: asMember } = await musik.client.rpc("app_access_pending", { p_app: "ark" });
    expect(asMember ?? []).toEqual([]);
  });

  it("returns nothing for an unknown app", async () => {
    expect(await roles(musik, "nope")).toEqual([]);
  });
});

describe("PI-LYNK baseline", () => {
  it("makes CMIT admin and every department pengurus", async () => {
    expect(await roles(musik, "lynk")).toEqual(["pengurus"]); // Pelayanan Khusus division
    expect(await roles(eo, "lynk")).toEqual(["pengurus"]); // Departemen Internal division
    expect(await roles(outsider, "lynk")).toEqual([]);
    const cmit = await createUser("aa-pubdok", "member");
    await assign(cmit.memberId, s.unit("Pubdok"), s.position("division", "Staff"), s.activePeriodId);
    expect(await roles(cmit, "lynk")).toEqual(["admin", "pengurus"]);
  });
});

describe("website baseline (per menu)", () => {
  it("gives Pelayanan Khusus nothing, Internal acara, CMIT admin", async () => {
    expect(await roles(musik, "web")).toEqual([]);
    expect(await roles(eo, "web")).toEqual(["acara"]);
    const rohani = await createUser("aa-doa", "member");
    await assign(rohani.memberId, s.unit("Doa"), s.position("division", "Staff"), s.activePeriodId);
    expect(await roles(rohani, "web")).toEqual(["artikel", "renungan"]);
    const desain = await createUser("aa-desain", "member");
    await assign(desain.memberId, s.unit("Desain"), s.position("division", "Staff"), s.activePeriodId);
    expect(await roles(desain, "web")).toEqual(["admin"]);
  });
});

describe("rule kinds", () => {
  it("member rule: holds without any assignment; disabling it removes the role", async () => {
    const id = await addRule({ app_role_key: "admin", subject_type: "member", member_id: outsider.memberId });
    expect(await roles(outsider)).toEqual(["admin"]);
    await superAdmin.client.from("app_access_rules").update({ is_enabled: false }).eq("id", id);
    expect(await roles(outsider)).toEqual([]);
  });

  it("role rule: matches positions carrying that PI-CORE role in the active period", async () => {
    await addRule({ app_role_key: "admin", subject_type: "role", role_id: s.role("staff") });
    expect(await roles(eo)).toEqual(["admin"]);
    expect(await roles(musik)).toEqual(["admin", "pengurus"]);
  });

  it("position rule and unit rule without child units", async () => {
    const t = await createUser("aa-sekdep", "member");
    await assign(t.memberId, s.unit("Departemen Eksternal"), s.position("department", "Sekretaris Departemen"), s.activePeriodId);
    expect(await roles(t)).toEqual([]);
    await addRule({
      app_role_key: "pengurus",
      subject_type: "position",
      position_id: s.position("department", "Sekretaris Departemen"),
    });
    expect(await roles(t)).toEqual(["pengurus"]);

    // A unit rule without child units does not reach a division's staff.
    const u = await createUser("aa-intra", "member");
    await assign(u.memberId, s.unit("Intra Kampus"), s.position("division", "Staff"), s.activePeriodId);
    const before = await roles(u); // Staff role rule from the previous test gives admin
    await addRule({ app_role_key: "pengurus", subject_type: "org_unit", org_unit_id: s.unit("Departemen Eksternal") });
    expect(await roles(u)).toEqual(before);
  });
});

describe("who may read and change rules", () => {
  it("lets only super admins write rules", async () => {
    const insert = await admin.client
      .from("app_access_rules")
      .insert({ app_key: "ark", app_role_key: "admin", subject_type: "member", member_id: admin.memberId, note });
    expect(insert.error?.code).toBe("42501");

    const { data: rule } = await serviceClient().from("app_access_rules").select("id").eq("note", "Aturan awal").limit(1).single();
    const update = await admin.client.from("app_access_rules").update({ is_enabled: false }).eq("id", rule!.id).select("id");
    expect(update.data ?? []).toEqual([]);
    const del = await admin.client.from("app_access_rules").delete().eq("id", rule!.id).select("id");
    expect(del.data ?? []).toEqual([]);
    const { data: still } = await serviceClient().from("app_access_rules").select("is_enabled").eq("id", rule!.id).single();
    expect(still!.is_enabled).toBe(true);
  });

  it("lets admins read rules and holders, regular members neither", async () => {
    const { data: asAdmin } = await admin.client.from("app_access_rules").select("id").eq("app_key", "ark");
    expect(asAdmin!.length).toBeGreaterThanOrEqual(2);
    const { data: asMember } = await musik.client.from("app_access_rules").select("id");
    expect(asMember).toEqual([]);
    const { data: holders } = await musik.client.rpc("app_access_holders", { p_app: "ark" });
    expect(holders ?? []).toEqual([]);
    const { data: apps } = await musik.client.from("apps").select("key");
    expect(apps).toEqual([]);
  });

  it("refuses anonymous callers and malformed or duplicate rules", async () => {
    const anon = await anonClient().rpc("my_app_roles", { p_app: "ark" });
    expect(anon.error).not.toBeNull();

    const twoSubjects = await superAdmin.client.from("app_access_rules").insert({
      app_key: "ark",
      app_role_key: "admin",
      subject_type: "member",
      member_id: outsider.memberId,
      role_id: s.role("staff"),
      note,
    });
    expect(twoSubjects.error?.code).toBe("23514");

    const unknownRole = await superAdmin.client
      .from("app_access_rules")
      .insert({ app_key: "ark", app_role_key: "owner", subject_type: "member", member_id: outsider.memberId, note });
    expect(unknownRole.error?.code).toBe("23503");

    const dup = await superAdmin.client.from("app_access_rules").insert({
      app_key: "ark",
      app_role_key: "admin",
      subject_type: "member",
      member_id: outsider.memberId,
      note,
    });
    expect(dup.error?.code).toBe("23505");
  });

  it("writes every rule change to the audit log", async () => {
    const { count } = await serviceClient()
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("table_name", "app_access_rules");
    expect(count ?? 0).toBeGreaterThan(0);
  });
});

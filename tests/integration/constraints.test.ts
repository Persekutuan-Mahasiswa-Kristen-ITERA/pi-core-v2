import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assign,
  cleanup,
  createUser,
  RUN,
  serviceClient,
  structure,
  testPeriodLabels,
  withDb,
  type TestUser,
} from "../support/supabase";

let superAdmin: TestUser;
let admin: TestUser;
let member: TestUser;
let other: TestUser;
let s: Awaited<ReturnType<typeof structure>>;

beforeAll(async () => {
  [superAdmin, admin, member, other] = await Promise.all([
    createUser("csuper", "super_admin"),
    createUser("cadmin", "admin"),
    createUser("cmember", "member"),
    createUser("cother", "member"),
  ]);
  s = await structure();
});

afterAll(async () => {
  // Restore the seed's active period before removing test periods.
  await admin.client.rpc("set_active_period", { p_period_id: s.activePeriodId });
  await cleanup();
});

/** Insert through the admin's RLS-bound client, the way the app does. */
const insertAssignment = (memberId: string, unit: string, position: string, periodId: string) =>
  admin.client
    .from("assignments")
    .insert({ member_id: memberId, org_unit_id: unit, position_id: position, period_id: periodId } as never)
    .select("id");

describe("baseline structure from PI-CORE v1", () => {
  it("has 1 root, 1 BPH, 7 departments, 1 bureau and 16 divisions", async () => {
    const { data } = await serviceClient().from("org_units").select("type").not("name", "like", `%${RUN}%`);
    const count = (t: string) => data!.filter((u) => u.type === t).length;
    expect([count("organization"), count("bph"), count("department"), count("bureau"), count("division")]).toEqual([
      1, 1, 7, 1, 16,
    ]);
  });

  it("gives admin access through Ketua Umum, Sekjen, Sekum 1/2, Kepala Departemen and Kepala Biro only", async () => {
    const { data } = await serviceClient()
      .from("position_roles")
      .select("positions(name), roles!inner(grants_admin)")
      .eq("roles.grants_admin", true);
    expect(data!.map((r) => r.positions.name).sort()).toEqual([
      "Kepala Biro",
      "Kepala Departemen",
      "Ketua Umum",
      "Sekretaris Jenderal",
      "Sekretaris Umum 1",
      "Sekretaris Umum 2",
    ]);
  });
});

describe("org unit tree rules", () => {
  it("rejects a division directly under the organization and a department under a department", async () => {
    const a = await superAdmin.client
      .from("org_units")
      .insert({ parent_id: s.unit("PMK ITERA"), type: "division", name: `Itest Div ${RUN}` });
    expect(a.error?.code).toBe("P0001");
    const b = await superAdmin.client
      .from("org_units")
      .insert({ parent_id: s.unit("Departemen CMIT"), type: "department", name: `Itest Dept ${RUN}` });
    expect(b.error?.code).toBe("P0001");
  });

  it("rejects a second root", async () => {
    const { error } = await serviceClient()
      .from("org_units")
      .insert({ type: "organization", name: `Itest Root ${RUN}` });
    expect(error).not.toBeNull();
  });

  it("does not let clients move a unit or change its type", async () => {
    const { error } = await superAdmin.client
      .from("org_units")
      .update({ type: "bureau" } as never)
      .eq("id", s.unit("IT"));
    expect(error?.code).toBe("42501");
  });

  it("enforces unique names per parent, case-insensitively", async () => {
    const { error } = await superAdmin.client
      .from("org_units")
      .insert({ parent_id: s.unit("Departemen CMIT"), type: "division", name: "it" });
    expect(error?.code).toBe("23505");
  });
});

describe("periods: exactly one active", () => {
  it("new periods start inactive while another is active", async () => {
    const { data } = await admin.client
      .from("periods")
      .insert({ label: testPeriodLabels[0] })
      .select("is_active")
      .single();
    expect(data!.is_active).toBe(false);
  });

  it("is_active cannot be written directly, only through set_active_period()", async () => {
    const { error } = await admin.client
      .from("periods")
      .update({ is_active: true } as never)
      .eq("label", testPeriodLabels[0]);
    expect(error?.code).toBe("42501");
  });

  it("the database rejects a second active period even for the service role", async () => {
    const { error } = await serviceClient()
      .from("periods")
      .update({ is_active: true })
      .eq("label", testPeriodLabels[0]);
    expect(error?.code).toBe("23505");
  });

  it("rejects malformed labels at the database too", async () => {
    const { error } = await admin.client.from("periods").insert({ label: "2090/2095" });
    expect(error?.code).toBe("23514");
  });
});

describe("assignments", () => {
  let periodId: string;
  beforeAll(async () => {
    const { data } = await admin.client.from("periods").insert({ label: testPeriodLabels[1] }).select("id").single();
    periodId = data!.id;
  });

  it("rejects a position from another kind of unit", async () => {
    const { error } = await insertAssignment(
      member.memberId,
      s.unit("Departemen CMIT"),
      s.position("division", "Kepala Divisi"),
      periodId,
    );
    expect(error?.code).toBe("P0001");
    expect(error?.hint).toBe("unit_type_mismatch");
  });

  it("allows one Kepala Divisi per division per period, but many Staff", async () => {
    const kadiv = s.position("division", "Kepala Divisi");
    expect((await insertAssignment(member.memberId, s.unit("Musik"), kadiv, periodId)).error).toBeNull();
    const second = await insertAssignment(other.memberId, s.unit("Musik"), kadiv, periodId);
    expect(second.error?.code).toBe("23505");
    // the same position in another division is fine
    expect((await insertAssignment(other.memberId, s.unit("Worship"), kadiv, periodId)).error).toBeNull();

    const staff = s.position("division", "Staff");
    expect((await insertAssignment(member.memberId, s.unit("Doa"), staff, periodId)).error).toBeNull();
    expect((await insertAssignment(other.memberId, s.unit("Doa"), staff, periodId)).error).toBeNull();
  });

  it("rejects exact duplicates", async () => {
    const { error } = await insertAssignment(member.memberId, s.unit("Doa"), s.position("division", "Staff"), periodId);
    expect(error?.code).toBe("23505");
  });

  it("does not let clients write the copied unit_type / is_unique_per_unit", async () => {
    const { error } = await admin.client.from("assignments").insert({
      member_id: member.memberId,
      org_unit_id: s.unit("Pubdok"),
      position_id: s.position("division", "Staff"),
      period_id: periodId,
      unit_type: "division",
      is_unique_per_unit: false,
    });
    expect(error?.code).toBe("42501");
  });

  it("refuses new assignments in an inactive unit but keeps existing ones", async () => {
    const { data: unit } = await superAdmin.client
      .from("org_units")
      .insert({ parent_id: s.unit("Departemen Talenta"), type: "division", name: `Itest Old Div ${RUN}` })
      .select("id")
      .single();
    const staff = s.position("division", "Staff");
    expect((await insertAssignment(member.memberId, unit!.id, staff, periodId)).error).toBeNull();
    await superAdmin.client.from("org_units").update({ is_active: false }).eq("id", unit!.id);
    const { error } = await insertAssignment(other.memberId, unit!.id, staff, periodId);
    expect(error?.hint).toBe("unit_inactive");
    const { count } = await serviceClient()
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("org_unit_id", unit!.id);
    expect(count).toBe(1);
  });

  it("refuses to assign a deactivated member", async () => {
    const gone = await createUser("gone", "member");
    await admin.client.from("members").update({ is_active: false }).eq("id", gone.memberId);
    const { error } = await insertAssignment(
      gone.memberId,
      s.unit("Pubdok"),
      s.position("division", "Staff"),
      periodId,
    );
    expect(error?.hint).toBe("member_inactive");
  });

  it("refuses to give a dosen (lecturer) a position, whatever their access level", async () => {
    const pembina = await createUser("pembina", "super_admin", { memberType: "lecturer" });
    const { error } = await insertAssignment(
      pembina.memberId,
      s.unit("Doa"),
      s.position("division", "Staff"),
      periodId,
    );
    expect(error?.hint).toBe("member_lecturer");
    // ...while their super admin access does not depend on a position
    expect((await pembina.client.rpc("current_access")).data).toBe("super_admin");
  });

  it("ties the identifier to the member type: no NIM for dosen, no NIP for mahasiswa", async () => {
    const svc = serviceClient();
    const dosenWithNim = await svc
      .from("members")
      .insert({ full_name: "Dosen Nim", email: `itest-dn-${RUN}@example.com`, member_type: "lecturer", nim: "123456" });
    expect(dosenWithNim.error?.code).toBe("23514");
    const studentWithNip = await svc
      .from("members")
      .insert({ full_name: "Mhs Nip", email: `itest-mn-${RUN}@example.com`, nip: "198001012010011001" });
    expect(studentWithNip.error?.code).toBe("23514");
  });

  it("blocks deleting a position or unit that has assignments", async () => {
    const pos = await serviceClient().from("positions").delete().eq("id", s.position("division", "Staff"));
    expect(pos.error?.code).toBe("23503");
    const unit = await serviceClient().from("org_units").delete().eq("id", s.unit("Doa"));
    expect(unit.error?.code).toBe("23503");
  });

  it("turning 'one per unit' on fails while a unit has two holders, and works for history of deactivated members", async () => {
    const { data: pos } = await superAdmin.client
      .from("positions")
      .insert({ name: `Itest Koor ${RUN}`, unit_type: "division", rank: 65 })
      .select("id")
      .single();
    await assign(member.memberId, s.unit("Logistik"), pos!.id, periodId);
    await assign(other.memberId, s.unit("Logistik"), pos!.id, periodId);
    const clash = await superAdmin.client.from("positions").update({ is_unique_per_unit: true }).eq("id", pos!.id);
    expect(clash.error?.code).toBe("23505");

    // remove one holder, deactivate the other: the cascade must not trip the inactive-member rule
    await serviceClient().from("assignments").delete().eq("member_id", other.memberId).eq("position_id", pos!.id);
    const leaver = await createUser("leaver", "member");
    await assign(leaver.memberId, s.unit("Akomodasi"), pos!.id, periodId);
    await serviceClient().from("members").update({ is_active: false }).eq("id", leaver.memberId);
    const ok = await superAdmin.client.from("positions").update({ is_unique_per_unit: true }).eq("id", pos!.id);
    expect(ok.error).toBeNull();
    const { data: copied } = await serviceClient()
      .from("assignments")
      .select("is_unique_per_unit")
      .eq("position_id", pos!.id);
    expect(copied!.every((a) => a.is_unique_per_unit)).toBe(true);
  });
});

describe("active period drives position-based admin access and role counts", () => {
  let periodId: string;
  let roleId: string;
  let kabiro: TestUser;

  beforeAll(async () => {
    const { data: period } = await admin.client
      .from("periods")
      .insert({ label: testPeriodLabels[2] })
      .select("id")
      .single();
    periodId = period!.id;
    const { data: role } = await superAdmin.client
      .from("roles")
      .insert({ name: `Itest Count ${RUN}` })
      .select("id")
      .single();
    roleId = role!.id;
    const { data: pos } = await superAdmin.client
      .from("positions")
      .insert({ name: `Itest Anggota ${RUN}`, unit_type: "division", rank: 75 })
      .select("id")
      .single();
    await superAdmin.client.from("position_roles").insert({ position_id: pos!.id, role_id: roleId });
    // one member, two units: counted once
    await assign(member.memberId, s.unit("EO"), pos!.id, periodId);
    await assign(member.memberId, s.unit("Harmonisasi"), pos!.id, periodId);

    kabiro = await createUser("kabiro", "member");
    await assign(kabiro.memberId, s.unit("Biro Kewirausahaan"), s.position("bureau", "Kepala Biro"), s.activePeriodId);
  });

  it("role_overview counts distinct active members in the ACTIVE period only", async () => {
    const before = await admin.client
      .from("role_overview")
      .select("active_member_count, position_count")
      .eq("id", roleId)
      .single();
    expect(before.data).toEqual({ active_member_count: 0, position_count: 1 });
    await admin.client.rpc("set_active_period", { p_period_id: periodId });
    const after = await admin.client.from("role_overview").select("active_member_count").eq("id", roleId).single();
    expect(after.data!.active_member_count).toBe(1);
  });

  it("a Kepala Biro is admin only while their period is active", async () => {
    // the previous test switched to the test period, where kabiro holds nothing
    expect((await kabiro.client.rpc("current_access")).data).toBe("member");
    await admin.client.rpc("set_active_period", { p_period_id: s.activePeriodId });
    expect((await kabiro.client.rpc("current_access")).data).toBe("admin");
  });

  it("removing grants_admin from the role removes the access immediately", async () => {
    await withDb(async (db) => {
      await db.query("begin");
      try {
        // act as kabiro inside this transaction (auth.uid() reads request.jwt.claims)
        await db.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: kabiro.userId, role: "authenticated" }),
        ]);
        const access = async () => (await db.query("select public.current_access() as access")).rows[0].access;
        expect(await access()).toBe("admin");
        await db.query("update public.roles set grants_admin = false where id = $1", [s.role("organization_admin")]);
        expect(await access()).toBe("member");
      } finally {
        await db.query("rollback");
      }
    });
  });
});

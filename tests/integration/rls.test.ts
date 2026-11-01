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
 * Access model (docs/SECURITY.md):
 *   super admin  - stored level; manages structure, roles, access levels, super admin accounts, settings
 *   admin        - stored level, or an active-period position that carries a grants_admin role
 *   member       - own profile and assignments, plus the (non-sensitive) structure
 */
let superAdmin: TestUser;
let admin: TestUser; // stored admin, no position
let kadep: TestUser; // stored member, Kepala Departemen in the active period -> admin through position
let alice: TestUser; // member, Staff in a division
let bob: TestUser; // member, Staff in another division
let s: Awaited<ReturnType<typeof structure>>;

beforeAll(async () => {
  [superAdmin, admin, kadep, alice, bob] = await Promise.all([
    createUser("super", "super_admin"),
    createUser("admin", "admin"),
    createUser("kadep", "member"),
    createUser("alice", "member"),
    createUser("bob", "member"),
  ]);
  s = await structure();
  await assign(
    kadep.memberId,
    s.unit("Departemen CMIT"),
    s.position("department", "Kepala Departemen"),
    s.activePeriodId,
  );
  await assign(alice.memberId, s.unit("Pubdok"), s.position("division", "Staff"), s.activePeriodId);
  await assign(bob.memberId, s.unit("Desain"), s.position("division", "Staff"), s.activePeriodId);
});

afterAll(cleanup);

describe("unauthenticated (anon key, no session)", () => {
  it.each([
    "members",
    "org_units",
    "roles",
    "positions",
    "position_roles",
    "periods",
    "assignments",
    "org_settings",
    "audit_log",
    "role_overview",
  ] as const)("gets nothing from %s", async (table) => {
    // The table name is a runtime parameter here; the typed client cannot narrow a union.
    const { data, error } = await anonClient()
      .from(table as "members")
      .select("*");
    // Privileges are revoked from anon: PostgREST answers with a permission error and no rows.
    expect(data ?? []).toEqual([]);
    expect(error?.code).toBe("42501");
  });

  it("cannot call set_active_period or current_access", async () => {
    expect((await anonClient().rpc("set_active_period", { p_period_id: s.activePeriodId })).error).not.toBeNull();
    expect((await anonClient().rpc("current_access")).error).not.toBeNull();
  });

  it("cannot sign up (public sign-up disabled)", async () => {
    const { data, error } = await anonClient().auth.signUp({
      email: `itest-signup-${RUN}@example.com`,
      password: "Signup12345",
    });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
  });
});

describe("current_access()", () => {
  it.each([
    ["super admin", () => superAdmin, "super_admin"],
    ["stored admin", () => admin, "admin"],
    ["Kepala Departemen in the active period", () => kadep, "admin"],
    ["Staff", () => alice, "member"],
  ] as const)("%s → %s", async (_label, user, expected) => {
    const { data, error } = await user().client.rpc("current_access");
    expect(error).toBeNull();
    expect(data).toBe(expected);
  });
});

describe("regular member", () => {
  it("reads only their own member row", async () => {
    const { data, error } = await alice.client.from("members").select("id, email");
    expect(error).toBeNull();
    expect(data).toEqual([{ id: alice.memberId, email: alice.email }]);
  });

  it("cannot read another member by id (IDOR)", async () => {
    const { data } = await alice.client.from("members").select("id").eq("id", bob.memberId);
    expect(data).toEqual([]);
  });

  it("reads only their own assignments, and only the roles their position carries", async () => {
    const { data: assignments } = await alice.client.from("assignments").select("member_id");
    expect(assignments).toEqual([{ member_id: alice.memberId }]);
    const { data: roles } = await alice.client.from("roles").select("id");
    expect(roles!.map((r) => r.id)).toEqual([s.role("staff")]);
  });

  it("reads the organization structure (units and positions)", async () => {
    const { count: units } = await alice.client.from("org_units").select("id", { count: "exact", head: true });
    const { count: positions } = await alice.client.from("positions").select("id", { count: "exact", head: true });
    expect(units).toBeGreaterThanOrEqual(26);
    expect(positions).toBeGreaterThanOrEqual(13);
  });

  it("cannot escalate by updating their own row", async () => {
    const { data, error } = await alice.client
      .from("members")
      .update({ access_level: "super_admin" })
      .eq("id", alice.memberId)
      .select("id");
    expect(error === null ? data : []).toEqual([]);
    const { data: fresh } = await serviceClient()
      .from("members")
      .select("access_level")
      .eq("id", alice.memberId)
      .single();
    expect(fresh!.access_level).toBe("member");
  });

  it("cannot create members, units, positions, roles, periods or assignments", async () => {
    const results = await Promise.all([
      alice.client.from("members").insert({ full_name: "Nope", email: `nope-${RUN}@example.com` }),
      alice.client.from("org_units").insert({ parent_id: s.unit("PMK ITERA"), type: "bureau", name: `Nope ${RUN}` }),
      alice.client.from("positions").insert({ name: `Nope ${RUN}`, unit_type: "division", rank: 99 }),
      alice.client.from("roles").insert({ name: `Nope ${RUN}` }),
      alice.client.from("periods").insert({ label: "2099/2100" }),
      alice.client.from("assignments").insert({
        member_id: alice.memberId,
        org_unit_id: s.unit("Pubdok"),
        position_id: s.position("division", "Kepala Divisi"),
        period_id: s.activePeriodId,
      } as never),
    ]);
    for (const r of results) expect(r.error).not.toBeNull();
  });

  it("cannot read the audit log or switch the active period", async () => {
    expect((await alice.client.from("audit_log").select("id")).data).toEqual([]);
    const { error } = await alice.client.rpc("set_active_period", { p_period_id: s.activePeriodId });
    expect(error?.code).toBe("42501");
  });

  it("sees nothing once deactivated, even with a live session", async () => {
    const carol = await createUser("carol", "member");
    expect((await carol.client.from("members").select("id")).data).toHaveLength(1);
    await serviceClient().from("members").update({ is_active: false }).eq("id", carol.memberId);
    expect((await carol.client.from("members").select("id")).data).toHaveLength(0);
    expect((await carol.client.from("org_settings").select("org_name")).data).toHaveLength(0);
    expect((await carol.client.from("org_units").select("id")).data).toHaveLength(0);
  });
});

describe("admin through a position (Kepala Departemen)", () => {
  it("reads all members and manages assignments", async () => {
    const { data } = await kadep.client.from("members").select("id").in("id", [alice.memberId, bob.memberId]);
    expect(data).toHaveLength(2);
    const { error } = await kadep.client.from("assignments").insert({
      member_id: bob.memberId,
      org_unit_id: s.unit("Desain"),
      position_id: s.position("division", "Kepala Divisi"),
      period_id: s.activePeriodId,
    } as never);
    expect(error).toBeNull();
  });

  it("cannot grant admin access, on create or on update", async () => {
    const created = await kadep.client
      .from("members")
      .insert({ full_name: "Nope Admin", email: `nope-admin-${RUN}@example.com`, access_level: "admin" });
    expect(created.error).not.toBeNull();
    const updated = await kadep.client.from("members").update({ access_level: "admin" }).eq("id", alice.memberId);
    expect(updated.error?.code).toBe("42501");
  });

  it("cannot touch a super admin's account", async () => {
    const { data } = await kadep.client
      .from("members")
      .update({ full_name: "Renamed" })
      .eq("id", superAdmin.memberId)
      .select("id");
    expect(data ?? []).toEqual([]);
    const deactivate = await kadep.client
      .from("members")
      .update({ is_active: false })
      .eq("id", superAdmin.memberId)
      .select("id");
    expect(deactivate.data ?? []).toEqual([]);
  });

  it("can deactivate a regular member", async () => {
    const dave = await createUser("dave", "member");
    const { data } = await kadep.client
      .from("members")
      .update({ is_active: false })
      .eq("id", dave.memberId)
      .select("id");
    expect(data).toEqual([{ id: dave.memberId }]);
  });

  it("cannot change the structure, roles or settings", async () => {
    const results = await Promise.all([
      kadep.client.from("org_units").insert({ parent_id: s.unit("PMK ITERA"), type: "bureau", name: `Nope ${RUN}` }),
      kadep.client.from("positions").insert({ name: `Nope ${RUN}`, unit_type: "division", rank: 99 }),
      kadep.client.from("roles").insert({ name: `Nope ${RUN}` }),
      kadep.client.from("position_roles").insert({
        position_id: s.position("division", "Staff"),
        role_id: s.role("organization_admin"),
      }),
    ]);
    for (const r of results) expect(r.error).not.toBeNull();
    const renamed = await kadep.client
      .from("roles")
      .update({ grants_admin: true })
      .eq("id", s.role("staff"))
      .select("id");
    expect(renamed.data ?? []).toEqual([]);
    const settings = await kadep.client
      .from("org_settings")
      .update({ org_name: "Hijacked" })
      .eq("id", true)
      .select("id");
    expect(settings.data ?? []).toEqual([]);
  });
});

describe("stored admin (no position)", () => {
  it("is an admin but not a super admin", async () => {
    const { data } = await admin.client.from("members").select("id").eq("id", alice.memberId);
    expect(data).toHaveLength(1);
    const { error } = await admin.client.from("roles").insert({ name: `Nope ${RUN}` });
    expect(error).not.toBeNull();
  });
});

describe("super admin", () => {
  it("manages the structure: units, positions, roles and the position → role mapping", async () => {
    const unit = await superAdmin.client
      .from("org_units")
      .insert({ parent_id: s.unit("PMK ITERA"), type: "bureau", name: `Itest Biro ${RUN}` })
      .select("id")
      .single();
    expect(unit.error).toBeNull();
    const position = await superAdmin.client
      .from("positions")
      .insert({ name: `Itest Koordinator ${RUN}`, unit_type: "bureau", rank: 65 })
      .select("id")
      .single();
    expect(position.error).toBeNull();
    const role = await superAdmin.client
      .from("roles")
      .insert({ name: `Itest Role ${RUN}` })
      .select("id")
      .single();
    expect(role.error).toBeNull();
    const mapping = await superAdmin.client
      .from("position_roles")
      .insert({ position_id: position.data!.id, role_id: role.data!.id });
    expect(mapping.error).toBeNull();
  });

  it("sets access levels", async () => {
    const erin = await createUser("erin", "member");
    const { error } = await superAdmin.client.from("members").update({ access_level: "admin" }).eq("id", erin.memberId);
    expect(error).toBeNull();
    const { data } = await erin.client.rpc("current_access");
    expect(data).toBe("admin");
  });

  it("cannot delete a system role", async () => {
    const { data } = await superAdmin.client.from("roles").delete().eq("id", s.role("staff")).select("id");
    expect(data ?? []).toEqual([]);
  });

  it("cannot write audit columns or the audit log directly", async () => {
    const forged = await superAdmin.client.from("audit_log").insert({ table_name: "x", action: "INSERT" } as never);
    expect(forged.error).not.toBeNull();
    const { data: role, error } = await superAdmin.client
      .from("roles")
      .insert({ name: `Itest Stamped ${RUN}`, created_by: alice.userId } as never)
      .select("id");
    // created_by is not an insertable column for authenticated users.
    expect(error?.code).toBe("42501");
    expect(role).toBeNull();
  });

  it("writes audit rows attributed to the actor", async () => {
    const { data: role } = await superAdmin.client
      .from("roles")
      .insert({ name: `Itest Audited ${RUN}` })
      .select("id, created_by")
      .single();
    expect(role!.created_by).toBe(superAdmin.userId);
    const { data: audit } = await superAdmin.client
      .from("audit_log")
      .select("actor_id, action, table_name")
      .eq("record_id", role!.id);
    expect(audit).toEqual([{ actor_id: superAdmin.userId, action: "INSERT", table_name: "roles" }]);
  });

  it("enforces case-insensitive unique role names", async () => {
    await superAdmin.client.from("roles").insert({ name: `Itest Dup ${RUN}` });
    const { error } = await superAdmin.client.from("roles").insert({ name: `ITEST DUP ${RUN}` });
    expect(error?.code).toBe("23505");
  });

  it("cannot remove the last active super admin (database guard)", async () => {
    await withDb(async (db) => {
      await db.query("begin");
      try {
        await expect(
          db.query(
            `update public.members set access_level = 'member' where access_level = 'super_admin' and is_active`,
          ),
        ).rejects.toThrow(/last active super admin/);
      } finally {
        await db.query("rollback");
      }
    });
  });
});

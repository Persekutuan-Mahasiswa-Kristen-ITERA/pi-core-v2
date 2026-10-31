import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, cleanup, createUser, RUN, serviceClient, withDb, type TestUser } from "../support/supabase";

let admin: TestUser;
let alice: TestUser; // regular member
let bob: TestUser; // another regular member
let roleId: string;
let otherRoleId: string;

beforeAll(async () => {
  admin = await createUser("admin", "admin");
  alice = await createUser("alice", "member");
  bob = await createUser("bob", "member");

  const svc = serviceClient();
  const { data: roles } = await svc
    .from("roles")
    .insert([{ name: `Itest Role A ${RUN}` }, { name: `Itest Role B ${RUN}` }])
    .select("id, name")
    .order("name");
  roleId = roles![0].id;
  otherRoleId = roles![1].id;
  const { data: positions } = await svc
    .from("positions")
    .insert([{ role_id: roleId, name: "Ketua" }, { role_id: otherRoleId, name: "Anggota" }])
    .select("id, role_id");
  const { data: period } = await svc.from("periods").select("id").eq("is_active", true).single();
  await svc.from("assignments").insert([
    { member_id: alice.memberId, role_id: roleId, position_id: positions!.find((p) => p.role_id === roleId)!.id, period_id: period!.id },
    { member_id: bob.memberId, role_id: otherRoleId, position_id: positions!.find((p) => p.role_id === otherRoleId)!.id, period_id: period!.id },
  ]);
});

afterAll(cleanup);

describe("unauthenticated (anon key, no session)", () => {
  it.each(["members", "roles", "positions", "periods", "assignments", "org_settings", "audit_log", "role_overview"] as const)(
    "gets nothing from %s",
    async (table) => {
      const { data, error } = await anonClient().from(table).select("*");
      // Privileges are revoked from anon: PostgREST answers with a permission error and no rows.
      expect(data ?? []).toEqual([]);
      expect(error?.code).toBe("42501");
    },
  );

  it("cannot call set_active_period", async () => {
    const { error } = await anonClient().rpc("set_active_period", { p_period_id: roleId });
    expect(error).not.toBeNull();
  });

  it("cannot sign up (public sign-up disabled)", async () => {
    const { data, error } = await anonClient().auth.signUp({ email: `itest-signup-${RUN}@example.com`, password: "Signup12345" });
    expect(error).not.toBeNull();
    expect(data.user).toBeNull();
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

  it("reads only their own assignments, and only the roles on them", async () => {
    const { data: assignments } = await alice.client.from("assignments").select("member_id, role_id");
    expect(assignments!.every((a) => a.member_id === alice.memberId)).toBe(true);
    expect(assignments!.length).toBe(1);
    const { data: roles } = await alice.client.from("roles").select("id");
    expect(roles!.map((r) => r.id)).toEqual([roleId]);
  });

  it("cannot escalate to admin by updating their own row", async () => {
    const { data, error } = await alice.client.from("members").update({ access_level: "admin" }).eq("id", alice.memberId).select("id");
    expect(error === null ? data : []).toEqual([]);
    const { data: fresh } = await serviceClient().from("members").select("access_level").eq("id", alice.memberId).single();
    expect(fresh!.access_level).toBe("member");
  });

  it("cannot create members, roles, periods or assignments", async () => {
    const results = await Promise.all([
      alice.client.from("members").insert({ full_name: "Nope", email: `nope-${RUN}@example.com` }),
      alice.client.from("roles").insert({ name: `Nope ${RUN}` }),
      alice.client.from("periods").insert({ label: "2099/2100" }),
      alice.client.from("assignments").insert({ member_id: alice.memberId, role_id: roleId, position_id: roleId, period_id: roleId }),
    ]);
    for (const r of results) expect(r.error).not.toBeNull();
  });

  it("cannot delete or change roles and assignments", async () => {
    const del = await alice.client.from("roles").delete().eq("id", roleId).select("id");
    expect(del.data ?? []).toEqual([]);
    const upd = await alice.client.from("assignments").update({ role_id: otherRoleId }).eq("member_id", alice.memberId).select("id");
    expect(upd.data ?? []).toEqual([]);
    const { count } = await serviceClient().from("roles").select("id", { count: "exact", head: true }).eq("id", roleId);
    expect(count).toBe(1);
  });

  it("cannot read the audit log or switch the active period", async () => {
    const { data } = await alice.client.from("audit_log").select("id");
    expect(data).toEqual([]);
    const { data: period } = await serviceClient().from("periods").select("id").eq("is_active", true).single();
    const { error } = await alice.client.rpc("set_active_period", { p_period_id: period!.id });
    expect(error?.code).toBe("42501");
  });

  it("sees nothing once deactivated, even with a live session", async () => {
    const carol = await createUser("carol", "member");
    expect((await carol.client.from("members").select("id")).data).toHaveLength(1);
    await serviceClient().from("members").update({ is_active: false }).eq("id", carol.memberId);
    expect((await carol.client.from("members").select("id")).data).toHaveLength(0);
    expect((await carol.client.from("org_settings").select("org_name")).data).toHaveLength(0);
  });
});

describe("admin", () => {
  it("reads all members", async () => {
    const { data } = await admin.client.from("members").select("id").in("id", [alice.memberId, bob.memberId]);
    expect(data).toHaveLength(2);
  });

  it("cannot write audit columns or the audit log directly", async () => {
    const forged = await admin.client.from("audit_log").insert({ table_name: "x", action: "INSERT" } as never);
    expect(forged.error).not.toBeNull();
    const { data: role, error } = await admin.client
      .from("roles")
      .insert({ name: `Itest Stamped ${RUN}`, created_by: alice.userId } as never)
      .select("id");
    // created_by is not an insertable column for authenticated users.
    expect(error?.code).toBe("42501");
    expect(role).toBeNull();
  });

  it("writes audit rows attributed to the acting admin", async () => {
    const { data: role } = await admin.client.from("roles").insert({ name: `Itest Audited ${RUN}` }).select("id, created_by").single();
    expect(role!.created_by).toBe(admin.userId);
    const { data: audit } = await admin.client.from("audit_log").select("actor_id, action, table_name").eq("record_id", role!.id);
    expect(audit).toEqual([{ actor_id: admin.userId, action: "INSERT", table_name: "roles" }]);
  });

  it("enforces case-insensitive unique role names", async () => {
    await admin.client.from("roles").insert({ name: `Itest Dup ${RUN}` });
    const { error } = await admin.client.from("roles").insert({ name: `ITEST DUP ${RUN}` });
    expect(error?.code).toBe("23505");
  });

  it("cannot remove the last active admin (database guard)", async () => {
    await withDb(async (db) => {
      await db.query("begin");
      try {
        await expect(db.query(`update public.members set access_level = 'member' where access_level = 'admin' and is_active`)).rejects.toThrow(
          /last active admin/,
        );
      } finally {
        await db.query("rollback");
      }
    });
  });
});

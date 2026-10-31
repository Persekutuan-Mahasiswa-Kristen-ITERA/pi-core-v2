import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { cleanup, createUser, RUN, serviceClient, testPeriodLabels, type TestUser } from "../support/supabase";

let admin: TestUser;
let member: TestUser;
let originalActiveId: string;

beforeAll(async () => {
  admin = await createUser("cadmin", "admin");
  member = await createUser("cmember", "member");
  const { data } = await serviceClient().from("periods").select("id").eq("is_active", true).single();
  originalActiveId = data!.id;
});

afterAll(async () => {
  // Restore the seed's active period before removing test periods.
  await admin.client.rpc("set_active_period", { p_period_id: originalActiveId });
  await cleanup();
});

describe("periods: exactly one active", () => {
  it("new periods start inactive while another is active", async () => {
    const { data } = await admin.client.from("periods").insert({ label: testPeriodLabels[0] }).select("is_active").single();
    expect(data!.is_active).toBe(false);
  });

  it("is_active cannot be written directly, only through set_active_period()", async () => {
    const { error } = await admin.client.from("periods").update({ is_active: true } as never).eq("label", testPeriodLabels[0]);
    expect(error?.code).toBe("42501");
  });

  it("the database rejects a second active period even for the service role", async () => {
    const { error } = await serviceClient().from("periods").update({ is_active: true }).eq("label", testPeriodLabels[0]);
    expect(error?.code).toBe("23505");
  });

  it("set_active_period switches atomically and leaves exactly one active", async () => {
    const { data: target } = await admin.client.from("periods").select("id").eq("label", testPeriodLabels[0]).single();
    const { error } = await admin.client.rpc("set_active_period", { p_period_id: target!.id });
    expect(error).toBeNull();
    const { data: active } = await serviceClient().from("periods").select("id").eq("is_active", true);
    expect(active).toEqual([{ id: target!.id }]);
  });

  it("rejects malformed labels at the database too", async () => {
    const { error } = await admin.client.from("periods").insert({ label: "2090/2095" });
    expect(error?.code).toBe("23514");
  });
});

describe("assignments", () => {
  let roleId: string;
  let otherRoleId: string;
  let positionId: string;
  let periodId: string;

  beforeAll(async () => {
    const { data: roles } = await admin.client
      .from("roles")
      .insert([{ name: `Itest Assign ${RUN}` }, { name: `Itest Other ${RUN}` }])
      .select("id, name");
    roleId = roles!.find((r) => r.name.startsWith("Itest Assign"))!.id;
    otherRoleId = roles!.find((r) => r.name.startsWith("Itest Other"))!.id;
    const { data: position } = await admin.client.from("positions").insert({ role_id: roleId, name: "Ketua" }).select("id").single();
    positionId = position!.id;
    const { data: period } = await admin.client.from("periods").insert({ label: testPeriodLabels[1] }).select("id").single();
    periodId = period!.id;
  });

  it("allows several roles for one member in one period, but no exact duplicates", async () => {
    const row = { member_id: member.memberId, role_id: roleId, position_id: positionId, period_id: periodId };
    expect((await admin.client.from("assignments").insert(row)).error).toBeNull();
    const dup = await admin.client.from("assignments").insert(row);
    expect(dup.error?.code).toBe("23505");

    const { data: p2 } = await admin.client.from("positions").insert({ role_id: roleId, name: "Wakil" }).select("id").single();
    expect((await admin.client.from("assignments").insert({ ...row, position_id: p2!.id })).error).toBeNull();
  });

  it("rejects a position that belongs to a different role (composite FK)", async () => {
    const { error } = await admin.client
      .from("assignments")
      .insert({ member_id: member.memberId, role_id: otherRoleId, position_id: positionId, period_id: periodId });
    expect(error?.code).toBe("23503");
  });

  it("blocks deleting a role that still has assignments", async () => {
    const { error } = await admin.client.from("roles").delete().eq("id", roleId);
    expect(error?.code).toBe("23503");
    const { count } = await admin.client.from("roles").select("id", { count: "exact", head: true }).eq("id", roleId);
    expect(count).toBe(1);
  });

  it("deletes a role without assignments, cascading its unused positions", async () => {
    await admin.client.from("positions").insert({ role_id: otherRoleId, name: "Unused" });
    const { error } = await admin.client.from("roles").delete().eq("id", otherRoleId);
    expect(error).toBeNull();
    const { count } = await serviceClient().from("positions").select("id", { count: "exact", head: true }).eq("role_id", otherRoleId);
    expect(count).toBe(0);
  });

  it("refuses to assign a deactivated member", async () => {
    const gone = await createUser("gone", "member");
    await admin.client.from("members").update({ is_active: false }).eq("id", gone.memberId);
    const { error } = await admin.client
      .from("assignments")
      .insert({ member_id: gone.memberId, role_id: roleId, position_id: positionId, period_id: periodId });
    expect(error?.code).toBe("P0001");
  });

  it("role_overview counts distinct active members in the ACTIVE period only", async () => {
    // Assignments above are in a non-active period, so the active-period count is 0.
    const { data } = await admin.client.from("role_overview").select("active_member_count, assignment_count").eq("id", roleId).single();
    expect(data).toEqual({ active_member_count: 0, assignment_count: 2 });
    await admin.client.rpc("set_active_period", { p_period_id: periodId });
    const { data: after } = await admin.client.from("role_overview").select("active_member_count").eq("id", roleId).single();
    // Two assignments, one member: counted once.
    expect(after!.active_member_count).toBe(1);
  });
});

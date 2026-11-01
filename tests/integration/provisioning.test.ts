import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { provisionMember } from "@/lib/members/provisioning";
import { anonClient, cleanup, createUser, RUN, serviceClient, withDb, type TestUser } from "../support/supabase";

let admin: TestUser;
let superAdmin: TestUser;
let member: TestUser;

beforeAll(async () => {
  admin = await createUser("padmin", "admin");
  superAdmin = await createUser("psuper", "super_admin");
  member = await createUser("pmember", "member");
});
afterAll(cleanup);

const input = (label: string) => ({
  fullName: `Provisioned ${label}`,
  email: `itest-prov-${label}-${RUN}@example.com`,
  memberType: "student" as const,
  nim: null,
  nip: null,
  phone: null,
  accessLevel: "member" as const,
});

async function authUserExists(email: string) {
  return withDb(async (db) => (await db.query("select 1 from auth.users where email = $1", [email])).rowCount === 1);
}

describe("admin-only member provisioning", () => {
  it("an admin creates a member whose temporary password works and must be changed", async () => {
    const data = input("ok");
    const result = await provisionMember(admin.client, serviceClient(), data);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { data: row } = await serviceClient()
      .from("members")
      .select("must_change_password, access_level, created_by")
      .eq("id", result.memberId)
      .single();
    expect(row).toEqual({ must_change_password: true, access_level: "member", created_by: admin.userId });

    const login = await anonClient().auth.signInWithPassword({ email: data.email, password: result.temporaryPassword });
    expect(login.error).toBeNull();
  });

  it("a regular member cannot create members, and no orphan login is left behind", async () => {
    const data = input("denied");
    const result = await provisionMember(member.client, serviceClient(), data);
    expect(result.ok).toBe(false);
    expect(await authUserExists(data.email)).toBe(false);
  });

  it("rejects a duplicate email before creating a login", async () => {
    const result = await provisionMember(admin.client, serviceClient(), { ...input("dup"), email: member.email });
    expect(result).toMatchObject({ ok: false, field: "email" });
  });

  it("only a super admin can create an admin; otherwise the login is rolled back", async () => {
    const denied = input("asadmin");
    const result = await provisionMember(admin.client, serviceClient(), { ...denied, accessLevel: "admin" });
    expect(result.ok).toBe(false);
    expect(await authUserExists(denied.email)).toBe(false);

    const allowed = input("bysuper");
    const ok = await provisionMember(superAdmin.client, serviceClient(), { ...allowed, accessLevel: "admin" });
    expect(ok.ok).toBe(true);
  });

  it("creates a dosen (lecturer) super admin identified by NIP, with no NIM", async () => {
    const data = {
      ...input("dosen"),
      memberType: "lecturer" as const,
      nip: `19${RUN.replace(/\D/g, "").padEnd(16, "7")}`.slice(0, 18),
    };
    const result = await provisionMember(superAdmin.client, serviceClient(), { ...data, accessLevel: "super_admin" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { data: row } = await serviceClient()
      .from("members")
      .select("member_type, nim, nip, access_level")
      .eq("id", result.memberId)
      .single();
    expect(row).toEqual({ member_type: "lecturer", nim: null, nip: data.nip, access_level: "super_admin" });
  });
});

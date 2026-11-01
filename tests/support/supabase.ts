import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import { assignmentRow, type AccessLevel, type Database } from "@/lib/supabase/types";

/**
 * Integration helpers. They talk to the LOCAL Supabase started by `supabase start` and refuse any
 * other host. Users are created through the Auth admin API and then used through real sessions
 * with the publishable key, so every query below goes through RLS exactly as the app's do.
 */
export const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";
const dbUrl = process.env.SUPABASE_DB_URL ?? "";

const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();
if (!["127.0.0.1", "localhost"].includes(host) || !publishable || !secret || !dbUrl) {
  throw new Error("Integration tests need the local Supabase env (.env.local) and only run against localhost.");
}

const noPersist = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
export type Client = SupabaseClient<Database>;

export const serviceClient = (): Client => createClient<Database>(url, secret, noPersist);
export const anonClient = (): Client => createClient<Database>(url, publishable, noPersist);

export const RUN = randomUUID().slice(0, 8);
export const TEST_PASSWORD = `Itest-${randomUUID().slice(0, 12)}9`;

export type TestUser = { userId: string; memberId: string; email: string; client: Client };

const createdUserIds: string[] = [];

export async function createUser(
  label: string,
  accessLevel: AccessLevel,
  opts: { mustChangePassword?: boolean; memberType?: "student" | "lecturer" } = {},
): Promise<TestUser> {
  const admin = serviceClient();
  const email = `itest-${label}-${RUN}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: TEST_PASSWORD, email_confirm: true });
  if (error) throw error;
  createdUserIds.push(data.user.id);
  const { data: member, error: mErr } = await admin
    .from("members")
    .insert({
      user_id: data.user.id,
      full_name: `Itest ${label}`,
      email,
      access_level: accessLevel,
      member_type: opts.memberType ?? "student",
      must_change_password: opts.mustChangePassword ?? false,
    })
    .select("id")
    .single();
  if (mErr) throw mErr;
  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (signInError) throw signInError;
  return { userId: data.user.id, memberId: member.id, email, client };
}

export async function withDb<T>(fn: (db: pg.Client) => Promise<T>): Promise<T> {
  const db = new pg.Client({ connectionString: dbUrl });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

/** Ids of the baseline structure (from the migrations), looked up by name. */
export async function structure() {
  const svc = serviceClient();
  const [units, positions, roles, period] = await Promise.all([
    svc.from("org_units").select("id, name, type"),
    svc.from("positions").select("id, name, unit_type"),
    svc.from("roles").select("id, key"),
    svc.from("periods").select("id").eq("is_active", true).single(),
  ]);
  if (units.error || positions.error || roles.error || period.error) throw new Error("baseline structure missing");
  const unit = (name: string) => units.data.find((u) => u.name === name)!.id;
  const position = (unitType: string, name: string) =>
    positions.data.find((p) => p.unit_type === unitType && p.name === name)!.id;
  const role = (key: string) => roles.data.find((r) => r.key === key)!.id;
  return { unit, position, role, activePeriodId: period.data.id };
}

/** Inserts an assignment as the service role (test setup). */
export async function assign(memberId: string, orgUnitId: string, positionId: string, periodId: string) {
  const { data, error } = await serviceClient()
    .from("assignments")
    .insert(
      assignmentRow({ member_id: memberId, org_unit_id: orgUnitId, position_id: positionId, period_id: periodId }),
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Removes everything this run created (as the DB owner, bypassing RLS and grants). */
export async function cleanup() {
  await withDb(async (db) => {
    const like = `%${RUN}%`;
    await db.query(
      `delete from public.assignments where member_id in (select id from public.members where email like $1)
         or period_id in (select id from public.periods where label in (select unnest($2::text[])))
         or position_id in (select id from public.positions where name like $1)
         or org_unit_id in (select id from public.org_units where name like $1)`,
      [like, testPeriodLabels],
    );
    await db.query(`delete from public.roles where name like $1`, [like]);
    await db.query(`delete from public.positions where name like $1`, [like]);
    // children first: parent_id is ON DELETE RESTRICT, checked row by row
    await db.query(`delete from public.org_units where name like $1 and type = 'division'`, [like]);
    await db.query(`delete from public.org_units where name like $1`, [like]);
    await db.query(`delete from public.periods where label = any($1::text[]) and not is_active`, [testPeriodLabels]);
    await db.query(`delete from public.members where email like $1`, [like]);
    await db.query(`delete from auth.users where email like $1`, [like]);
  });
  createdUserIds.length = 0;
}

/** Year labels far in the future so they never collide with seed data. */
export const testPeriodLabels = ["2090/2091", "2091/2092", "2092/2093"];

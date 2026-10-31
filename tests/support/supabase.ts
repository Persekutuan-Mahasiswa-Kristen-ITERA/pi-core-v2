import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import type { Database } from "@/lib/supabase/types";

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
  accessLevel: "admin" | "member",
  opts: { mustChangePassword?: boolean } = {},
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

/** Removes everything this run created (as the DB owner, bypassing RLS and grants). */
export async function cleanup() {
  await withDb(async (db) => {
    const like = `%${RUN}%`;
    await db.query(
      `delete from public.assignments where member_id in (select id from public.members where email like $1)`,
      [like],
    );
    await db.query(
      `delete from public.assignments where role_id in (select id from public.roles where name like $1)
         or period_id in (select id from public.periods where label in (select unnest($2::text[])))`,
      [like, testPeriodLabels],
    );
    await db.query(`delete from public.roles where name like $1`, [like]);
    await db.query(`delete from public.periods where label = any($1::text[]) and not is_active`, [testPeriodLabels]);
    await db.query(`delete from public.members where email like $1`, [like]);
    await db.query(`delete from auth.users where email like $1`, [like]);
  });
  createdUserIds.length = 0;
}

/** Year labels far in the future so they never collide with seed data. */
export const testPeriodLabels = ["2090/2091", "2091/2092", "2092/2093"];

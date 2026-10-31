#!/usr/bin/env node
/**
 * Creates the FIRST PI-CORE admin. Run once per environment by the maintainer.
 *
 *   node --env-file=.env.local scripts/bootstrap-admin.mjs --email you@example.org --name "Your Name"
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in the environment (never in git).
 * A random temporary password is printed ONCE to this terminal; it must be changed at first login.
 * Refuses to run if an active admin already exists — after that, admins are created in the app.
 */
import { randomInt } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } });
const email = values.email?.trim().toLowerCase();
const fullName = values.name?.trim();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !fullName || fullName.length < 2) {
  console.error('Usage: node --env-file=.env.local scripts/bootstrap-admin.mjs --email <email> --name "<full name>"');
  process.exit(2);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  process.exit(2);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const { count, error: countError } = await admin
  .from("members")
  .select("id", { count: "exact", head: true })
  .eq("access_level", "admin")
  .eq("is_active", true);
if (countError) {
  console.error("Could not read members (are the migrations applied?):", countError.message);
  process.exit(1);
}
if (count && count > 0) {
  console.error(`Refusing: ${count} active admin(s) already exist. Create further admins from the app.`);
  process.exit(1);
}

const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
let password = "";
while (!(/[A-Za-z]/.test(password) && /[0-9]/.test(password))) {
  password = Array.from({ length: 16 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

const { data: created, error: authError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});
if (authError) {
  console.error("Could not create the auth user:", authError.message);
  process.exit(1);
}

const { error: insertError } = await admin.from("members").insert({
  user_id: created.user.id,
  full_name: fullName,
  email,
  access_level: "admin",
  must_change_password: true,
});
if (insertError) {
  await admin.auth.admin.deleteUser(created.user.id);
  console.error("Could not create the member profile (auth user rolled back):", insertError.message);
  process.exit(1);
}

console.log(`First admin created: ${email}`);
console.log(`Temporary password (shown once): ${password}`);
console.log("Log in and choose a new password. Do not store this temporary password.");

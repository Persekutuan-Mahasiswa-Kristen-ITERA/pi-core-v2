#!/usr/bin/env node
/**
 * LOCAL DEVELOPMENT ONLY. Creates fake accounts (example.com) and a few assignments.
 *
 *   SEED_PASSWORD='<choose one>' node --env-file=.env.local scripts/seed-dev-users.mjs
 *
 * Refuses to run against anything but a local Supabase (127.0.0.1 / localhost).
 * All users get SEED_PASSWORD and no forced password change, for convenience in dev and E2E.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secret = process.env.SUPABASE_SECRET_KEY;
const password = process.env.SEED_PASSWORD;
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();
if (!["127.0.0.1", "localhost"].includes(host)) {
  console.error(`Refusing to seed users into a non-local Supabase (${host || "unset"}).`);
  process.exit(2);
}
if (!secret || !password || password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
  console.error("Set SUPABASE_SECRET_KEY and SEED_PASSWORD (8+ chars, letters and digits).");
  process.exit(2);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

export const DEV_USERS = [
  { email: "admin@example.com", fullName: "Admin Contoh", accessLevel: "admin", assign: [["BPH", "Ketua Umum"]] },
  {
    email: "maria@example.com",
    fullName: "Maria Contoh",
    accessLevel: "member",
    assign: [["Sekretaris", "Sekretaris Umum"]],
  },
  {
    email: "yohanes@example.com",
    fullName: "Yohanes Contoh",
    accessLevel: "member",
    assign: [
      ["Kepala Departemen", "Kepala Departemen Musik"],
      ["Panitia", "Ketua Panitia Natal"],
    ],
  },
  { email: "ruth@example.com", fullName: "Ruth Contoh", accessLevel: "member", assign: [] },
];

const { data: period } = await admin.from("periods").select("id").eq("is_active", true).single();
const { data: positions } = await admin.from("positions").select("id, name, role_id, roles(name)");

for (const user of DEV_USERS) {
  const { data: existing } = await admin.from("members").select("id").eq("email", user.email).maybeSingle();
  if (existing) {
    console.log(`skip ${user.email} (exists)`);
    continue;
  }
  const { data: created, error } = await admin.auth.admin.createUser({
    email: user.email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const { data: member, error: insertError } = await admin
    .from("members")
    .insert({
      user_id: created.user.id,
      full_name: user.fullName,
      email: user.email,
      access_level: user.accessLevel,
      must_change_password: false,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  for (const [roleName, positionName] of user.assign) {
    const position = positions.find((p) => p.roles?.name === roleName && p.name === positionName);
    if (!position || !period) continue;
    const { error: aError } = await admin
      .from("assignments")
      .insert({ member_id: member.id, role_id: position.role_id, position_id: position.id, period_id: period.id });
    if (aError) throw aError;
  }
  console.log(`created ${user.email} (${user.accessLevel})`);
}

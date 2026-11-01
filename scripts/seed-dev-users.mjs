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

// One account per access path: super admin, dosen super admin (pembina), admin through a position (Kepala Departemen carries
// Organization Admin), member with a non-admin position, member without assignments.
// `assign` = [unit name, position name] in the active period.
export const DEV_USERS = [
  {
    email: "admin@example.com",
    fullName: "Admin Contoh",
    accessLevel: "super_admin",
    assign: [["IT", "Kepala Divisi"]],
  },
  { email: "maria@example.com", fullName: "Maria Contoh", accessLevel: "member", assign: [["Musik", "Staff"]] },
  {
    email: "yohanes@example.com",
    fullName: "Yohanes Contoh",
    accessLevel: "member",
    assign: [["Departemen Pelayanan Khusus", "Kepala Departemen"]],
  },
  { email: "ruth@example.com", fullName: "Ruth Contoh", accessLevel: "member", assign: [] },
  // The pembina is a dosen: identified by NIP, super admin, no position.
  {
    email: "pembina@example.com",
    fullName: "Pembina Contoh",
    accessLevel: "super_admin",
    memberType: "lecturer",
    nip: "198001012010011001",
    assign: [],
  },
];

const { data: period } = await admin.from("periods").select("id").eq("is_active", true).single();
const { data: units } = await admin.from("org_units").select("id, name, type");
const { data: positions } = await admin.from("positions").select("id, name, unit_type");

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
      member_type: user.memberType ?? "student",
      nip: user.nip ?? null,
      must_change_password: false,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  for (const [unitName, positionName] of user.assign) {
    const unit = units.find((u) => u.name === unitName);
    const position = unit && positions.find((p) => p.unit_type === unit.type && p.name === positionName);
    if (!position || !period) throw new Error(`No ${positionName} in ${unitName} (or no active period).`);
    const { error: aError } = await admin
      .from("assignments")
      .insert({ member_id: member.id, org_unit_id: unit.id, position_id: position.id, period_id: period.id });
    if (aError) throw aError;
  }
  console.log(`created ${user.email} (${user.accessLevel})`);
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { describeDbError } from "@/lib/db-errors";
import { generateTemporaryPassword } from "@/lib/password";
import type { MemberInput } from "@/lib/validation";

type Client = SupabaseClient<Database>;
const MEMBER_UNIQUE = {
  members_email_key: "A member with this email already exists.",
  members_nim_key: "A member with this NIM already exists.",
  members_nip_key: "A member with this NIP/NIDN already exists.",
};

/** Ban length used for deactivated accounts (~100 years). Lifted again on reactivation. */
export const DEACTIVATED_BAN = "876000h";

export type ProvisionResult =
  | { ok: true; memberId: string; email: string; temporaryPassword: string }
  | { ok: false; message: string; field?: "email" | "nim" | "nip" };

/**
 * Admin-only account provisioning. The caller has already been verified as an admin; the member
 * row is inserted with the ADMIN'S client, so RLS re-checks that and the audit log records them.
 * The service-role client is used only for the Auth admin API.
 *
 * 1. Create the auth user with a random temporary password (email marked confirmed: there is no
 *    SMTP, so no confirmation mail can be sent — see docs/AUTH.md).
 * 2. Insert the member profile linked by user_id, with must_change_password = true.
 * 3. If step 2 fails, delete the auth user so no orphan login exists.
 */
export async function provisionMember(actor: Client, admin: Client, input: MemberInput): Promise<ProvisionResult> {
  const { data: existing, error: lookupError } = await actor
    .from("members")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();
  if (lookupError) return { ok: false, message: describeDbError(lookupError) };
  if (existing) return { ok: false, message: MEMBER_UNIQUE.members_email_key, field: "email" };

  const temporaryPassword = generateTemporaryPassword();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (authError || !created.user) {
    if (authError?.code === "email_exists") {
      return {
        ok: false,
        message: "A login with this email already exists but has no member profile. Ask the maintainer to resolve it.",
        field: "email",
      };
    }
    return { ok: false, message: "Could not create the login for this member. Try again." };
  }

  const { data: member, error: insertError } = await actor
    .from("members")
    .insert({
      user_id: created.user.id,
      full_name: input.fullName,
      email: input.email,
      member_type: input.memberType,
      nim: input.nim,
      nip: input.nip,
      phone: input.phone,
      access_level: input.accessLevel ?? "member",
      must_change_password: true,
    })
    .select("id")
    .single();

  if (insertError || !member) {
    await admin.auth.admin.deleteUser(created.user.id);
    const message = insertError ? describeDbError(insertError, MEMBER_UNIQUE) : "Could not save the member.";
    const field =
      message === MEMBER_UNIQUE.members_nim_key ? "nim" : message === MEMBER_UNIQUE.members_nip_key ? "nip" : undefined;
    return { ok: false, message, field };
  }

  return { ok: true, memberId: member.id, email: input.email, temporaryPassword };
}

export { MEMBER_UNIQUE };

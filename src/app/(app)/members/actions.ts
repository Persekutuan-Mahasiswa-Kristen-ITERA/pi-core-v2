"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { AuthorizationError, requireAdminAction } from "@/lib/auth";
import { describeDbError } from "@/lib/db-errors";
import { DEACTIVATED_BAN, MEMBER_UNIQUE, provisionMember } from "@/lib/members/provisioning";
import { generateTemporaryPassword } from "@/lib/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { idSchema, memberSchema, parseForm } from "@/lib/validation";

const FIELDS = ["fullName", "email", "nim", "phone", "accessLevel"] as const;

export type IssuedPassword = { memberId: string; email: string; temporaryPassword: string };

function denied(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return { ok: false, message: error.message };
  if (error instanceof z.ZodError) return { ok: false, message: "Invalid request." };
  throw error;
}

export async function createMember(_prev: ActionResult<IssuedPassword>, formData: FormData): Promise<ActionResult<IssuedPassword>> {
  try {
    const { supabase } = await requireAdminAction();
    const parsed = parseForm(memberSchema, formData, FIELDS);
    if (!parsed.success) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    const result = await provisionMember(supabase, createAdminClient(), parsed.data);
    if (!result.ok) {
      return { ok: false, message: result.message, fieldErrors: result.field ? { [result.field]: [result.message] } : undefined };
    }
    return {
      ok: true,
      message: `${parsed.data.fullName} was added.`,
      data: { memberId: result.memberId, email: result.email, temporaryPassword: result.temporaryPassword },
    };
  } catch (error) {
    return denied(error);
  }
}

export async function updateMember(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, member: actor } = await requireAdminAction();
    const memberId = idSchema.parse(id);
    const parsed = parseForm(memberSchema, formData, FIELDS);
    if (!parsed.success) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    const input = parsed.data;

    if (memberId === actor.id && input.accessLevel !== "admin") {
      return { ok: false, message: "You cannot remove your own admin access.", fieldErrors: { accessLevel: ["Ask another admin to change this."] } };
    }

    const { data: current, error: readError } = await supabase.from("members").select("id, user_id, email").eq("id", memberId).maybeSingle();
    if (readError) return { ok: false, message: describeDbError(readError) };
    if (!current) return { ok: false, message: "Member not found." };

    const { error } = await supabase
      .from("members")
      .update({ full_name: input.fullName, email: input.email, nim: input.nim, phone: input.phone, access_level: input.accessLevel })
      .eq("id", memberId);
    if (error) {
      const message = describeDbError(error, MEMBER_UNIQUE);
      const field = message === MEMBER_UNIQUE.members_email_key ? "email" : message === MEMBER_UNIQUE.members_nim_key ? "nim" : null;
      return { ok: false, message, fieldErrors: field ? { [field]: [message] } : undefined };
    }

    // Keep the login email in sync. If Auth rejects it, roll the profile back.
    if (current.user_id && current.email !== input.email) {
      const { error: authError } = await createAdminClient().auth.admin.updateUserById(current.user_id, { email: input.email, email_confirm: true });
      if (authError) {
        await supabase.from("members").update({ email: current.email }).eq("id", memberId);
        return { ok: false, message: "That email cannot be used for login (it may belong to another account).", fieldErrors: { email: ["Email is already in use."] } };
      }
    }
    return { ok: true, message: "Member saved." };
  } catch (error) {
    return denied(error);
  }
}

/** "Delete" in the prototype = deactivate: history and assignments are kept, login is blocked. */
export async function deactivateMember(id: string): Promise<ActionResult> {
  try {
    const { supabase, member: actor } = await requireAdminAction();
    const memberId = idSchema.parse(id);
    if (memberId === actor.id) return { ok: false, message: "You cannot deactivate your own account." };
    const { data, error } = await supabase.from("members").update({ is_active: false }).eq("id", memberId).select("user_id");
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data.length) return { ok: false, message: "Member not found." };
    const userId = data[0].user_id;
    if (userId) {
      const { error: banError } = await createAdminClient().auth.admin.updateUserById(userId, { ban_duration: DEACTIVATED_BAN });
      if (banError) {
        // The profile is inactive, so RLS already shows this account nothing; report the partial state.
        return { ok: true, message: "Member deactivated. Their login could not be blocked; they still see no data." };
      }
    }
    return { ok: true, message: "Member deactivated." };
  } catch (error) {
    return denied(error);
  }
}

export async function reactivateMember(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const memberId = idSchema.parse(id);
    const { data, error } = await supabase.from("members").update({ is_active: true }).eq("id", memberId).select("user_id");
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data.length) return { ok: false, message: "Member not found." };
    const userId = data[0].user_id;
    if (userId) {
      const { error: unbanError } = await createAdminClient().auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (unbanError) return { ok: false, message: "Profile reactivated, but the login is still blocked. Try again." };
    }
    return { ok: true, message: "Member reactivated." };
  } catch (error) {
    return denied(error);
  }
}

/** Issues a new temporary password (shown once) and forces a change at next login. */
export async function resetMemberPassword(id: string): Promise<ActionResult<IssuedPassword>> {
  try {
    const { supabase, member: actor } = await requireAdminAction();
    const memberId = idSchema.parse(id);
    if (memberId === actor.id) return { ok: false, message: "Use Profile to change your own password." };
    const { data: target, error } = await supabase.from("members").select("id, user_id, email, is_active").eq("id", memberId).maybeSingle();
    if (error) return { ok: false, message: describeDbError(error) };
    if (!target?.user_id) return { ok: false, message: "Member not found." };
    if (!target.is_active) return { ok: false, message: "Reactivate the member first." };

    const temporaryPassword = generateTemporaryPassword();
    const { error: authError } = await createAdminClient().auth.admin.updateUserById(target.user_id, { password: temporaryPassword });
    if (authError) return { ok: false, message: "Could not reset the password. Try again." };
    const { error: flagError } = await supabase.from("members").update({ must_change_password: true }).eq("id", memberId);
    if (flagError) return { ok: false, message: describeDbError(flagError) };
    return { ok: true, message: "Temporary password issued.", data: { memberId, email: target.email, temporaryPassword } };
  } catch (error) {
    return denied(error);
  }
}

"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { AuthorizationError, requireAdminAction } from "@/lib/auth";
import { describeDbError } from "@/lib/db-errors";
import { DEACTIVATED_BAN, MEMBER_UNIQUE, provisionMember } from "@/lib/members/provisioning";
import { generateTemporaryPassword } from "@/lib/password";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessLevel, Database, EffectiveAccess } from "@/lib/supabase/types";
import { idSchema, memberSchema, parseForm } from "@/lib/validation";

const FIELDS = ["fullName", "email", "nim", "phone", "accessLevel"] as const;

export type IssuedPassword = { memberId: string; email: string; temporaryPassword: string };

function denied(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return { ok: false, message: error.message };
  if (error instanceof z.ZodError) return { ok: false, message: "Invalid request." };
  throw error;
}

const SUPER_ADMIN_ONLY = "Only a super admin can change a super admin's account.";

/**
 * Loads the target and applies the super admin rule before any Auth admin API call (those run with
 * the service role, so RLS would not stop them). RLS repeats the rule for the profile row.
 */
type Target = { id: string; user_id: string | null; email: string; is_active: boolean; access_level: AccessLevel };

async function loadTarget(
  supabase: SupabaseClient<Database>,
  actorAccess: EffectiveAccess,
  memberId: string,
): Promise<{ ok: true; target: Target } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("members")
    .select("id, user_id, email, is_active, access_level")
    .eq("id", memberId)
    .maybeSingle();
  if (error) return { ok: false, error: describeDbError(error) };
  if (!data) return { ok: false, error: "Member not found." };
  if (data.access_level === "super_admin" && actorAccess !== "super_admin")
    return { ok: false, error: SUPER_ADMIN_ONLY };
  return { ok: true, target: data };
}

export async function createMember(
  _prev: ActionResult<IssuedPassword>,
  formData: FormData,
): Promise<ActionResult<IssuedPassword>> {
  try {
    const { supabase, member: actor } = await requireAdminAction();
    const parsed = parseForm(memberSchema, formData, FIELDS);
    if (!parsed.success)
      return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    // Only super admins choose an access level; everyone else creates plain members.
    const accessLevel: AccessLevel = actor.access === "super_admin" ? (parsed.data.accessLevel ?? "member") : "member";
    const result = await provisionMember(supabase, createAdminClient(), { ...parsed.data, accessLevel });
    if (!result.ok) {
      return {
        ok: false,
        message: result.message,
        fieldErrors: result.field ? { [result.field]: [result.message] } : undefined,
      };
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
    if (!parsed.success)
      return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    const input = parsed.data;

    const loaded = await loadTarget(supabase, actor.access, memberId);
    if (!loaded.ok) return { ok: false, message: loaded.error };
    const current = loaded.target;

    // Non-super admins never change access levels; the submitted value is ignored.
    const accessLevel: AccessLevel =
      actor.access === "super_admin" ? (input.accessLevel ?? current.access_level) : current.access_level;
    if (memberId === actor.id && accessLevel !== current.access_level) {
      return {
        ok: false,
        message: "You cannot change your own access.",
        fieldErrors: { accessLevel: ["Ask another super admin to change this."] },
      };
    }

    const { error } = await supabase
      .from("members")
      .update({
        full_name: input.fullName,
        email: input.email,
        nim: input.nim,
        phone: input.phone,
        access_level: accessLevel,
      })
      .eq("id", memberId);
    if (error) {
      const message = describeDbError(error, MEMBER_UNIQUE);
      const field =
        message === MEMBER_UNIQUE.members_email_key
          ? "email"
          : message === MEMBER_UNIQUE.members_nim_key
            ? "nim"
            : null;
      return { ok: false, message, fieldErrors: field ? { [field]: [message] } : undefined };
    }

    // Keep the login email in sync. If Auth rejects it, roll the profile back.
    if (current.user_id && current.email !== input.email) {
      const { error: authError } = await createAdminClient().auth.admin.updateUserById(current.user_id, {
        email: input.email,
        email_confirm: true,
      });
      if (authError) {
        await supabase.from("members").update({ email: current.email }).eq("id", memberId);
        return {
          ok: false,
          message: "That email cannot be used for login (it may belong to another account).",
          fieldErrors: { email: ["Email is already in use."] },
        };
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
    const loaded = await loadTarget(supabase, actor.access, memberId);
    if (!loaded.ok) return { ok: false, message: loaded.error };
    const { data, error } = await supabase
      .from("members")
      .update({ is_active: false })
      .eq("id", memberId)
      .select("user_id");
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data.length) return { ok: false, message: "Member not found." };
    const userId = data[0].user_id;
    if (userId) {
      const { error: banError } = await createAdminClient().auth.admin.updateUserById(userId, {
        ban_duration: DEACTIVATED_BAN,
      });
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
    const { supabase, member: actor } = await requireAdminAction();
    const memberId = idSchema.parse(id);
    const loaded = await loadTarget(supabase, actor.access, memberId);
    if (!loaded.ok) return { ok: false, message: loaded.error };
    const { data, error } = await supabase
      .from("members")
      .update({ is_active: true })
      .eq("id", memberId)
      .select("user_id");
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data.length) return { ok: false, message: "Member not found." };
    const userId = data[0].user_id;
    if (userId) {
      const { error: unbanError } = await createAdminClient().auth.admin.updateUserById(userId, {
        ban_duration: "none",
      });
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
    const loaded = await loadTarget(supabase, actor.access, memberId);
    if (!loaded.ok) return { ok: false, message: loaded.error };
    const target = loaded.target;
    if (!target.user_id) return { ok: false, message: "Member not found." };
    if (!target.is_active) return { ok: false, message: "Reactivate the member first." };

    const temporaryPassword = generateTemporaryPassword();
    const { error: authError } = await createAdminClient().auth.admin.updateUserById(target.user_id, {
      password: temporaryPassword,
    });
    if (authError) return { ok: false, message: "Could not reset the password. Try again." };
    const { error: flagError } = await supabase
      .from("members")
      .update({ must_change_password: true })
      .eq("id", memberId);
    if (flagError) return { ok: false, message: describeDbError(flagError) };
    return {
      ok: true,
      message: "Temporary password issued.",
      data: { memberId, email: target.email, temporaryPassword },
    };
  } catch (error) {
    return denied(error);
  }
}

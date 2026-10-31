"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { getSessionState } from "@/lib/auth";
import { createAdminClient, createStatelessAuthClient } from "@/lib/supabase/admin";
import { parseForm, passwordChangeSchema } from "@/lib/validation";

/**
 * Changes the caller's own password. Used both for the forced first-login change and from Profile.
 * The current password is always re-verified; the new one is set through the Auth admin API so
 * the member's existing session cookies are left untouched.
 */
export async function changeOwnPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const state = await getSessionState();
  if (state.status !== "member") return { ok: false, message: "Your session has ended. Log in again." };
  const { member } = state;

  const parsed = parseForm(passwordChangeSchema, formData, ["currentPassword", "newPassword", "confirmPassword"]);
  if (!parsed.success) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };

  const verifier = createStatelessAuthClient();
  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: member.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) {
    if (verifyError.status === 429) return { ok: false, message: "Too many attempts. Wait a few minutes and try again." };
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: { currentPassword: ["Current password is incorrect."] } };
  }
  await verifier.auth.signOut({ scope: "local" });

  const admin = createAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(member.userId, {
    password: parsed.data.newPassword,
  });
  if (updateError) {
    return {
      ok: false,
      message: updateError.code === "weak_password" ? "That password is too weak. Try a longer one." : "Could not change the password. Try again.",
    };
  }

  const wasForced = member.mustChangePassword;
  if (wasForced) {
    const { error } = await admin.from("members").update({ must_change_password: false }).eq("id", member.id);
    if (error) return { ok: false, message: "Password changed, but the account could not be unlocked. Contact an admin." };
    redirect("/");
  }
  return { ok: true, message: "Password changed." };
}

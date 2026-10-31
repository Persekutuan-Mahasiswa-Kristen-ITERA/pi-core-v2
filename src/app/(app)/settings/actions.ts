"use server";

import type { ActionResult } from "@/lib/action-result";
import { AuthorizationError, requireAdminAction } from "@/lib/auth";
import { describeDbError } from "@/lib/db-errors";
import { orgSettingsSchema, parseForm } from "@/lib/validation";

export async function updateOrgSettings(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const parsed = parseForm(orgSettingsSchema, formData, ["orgName"]);
    if (!parsed.success) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    const { data, error } = await supabase.from("org_settings").update({ org_name: parsed.data.orgName }).eq("id", true).select("id");
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data.length) return { ok: false, message: "Settings row is missing. Run the migrations." };
    return { ok: true, message: "Organization name saved." };
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, message: error.message };
    throw error;
  }
}

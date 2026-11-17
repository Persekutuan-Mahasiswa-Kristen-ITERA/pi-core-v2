"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { AuthorizationError, requireSuperAdminAction } from "@/lib/auth";
import { describeDbError } from "@/lib/db-errors";
import { accessRuleSchema, idSchema, parseForm } from "@/lib/validation";

const RULE_UNIQUE = { app_access_rules_no_duplicates: "This rule already exists." };
const FIELDS = ["appRoleKey", "subjectType", "subjectId", "includeChildUnits", "note"] as const;
const appKeySchema = z.string().regex(/^[a-z][a-z0-9_]{1,30}$/, "Invalid app.");

function denied(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return { ok: false, message: error.message };
  if (error instanceof z.ZodError) return { ok: false, message: "Invalid request." };
  throw error;
}

/** Super admins only (D-16); RLS enforces the same. */
export async function createAccessRule(
  appKey: string,
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const app = appKeySchema.parse(appKey);
    const parsed = parseForm(accessRuleSchema, formData, FIELDS);
    if (!parsed.success)
      return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    const { appRoleKey, subjectType, subjectId, includeChildUnits, note } = parsed.data;
    const { data, error } = await supabase
      .from("app_access_rules")
      .insert({
        app_key: app,
        app_role_key: appRoleKey,
        subject_type: subjectType,
        member_id: subjectType === "member" ? subjectId : null,
        role_id: subjectType === "role" ? subjectId : null,
        position_id: subjectType === "position" ? subjectId : null,
        org_unit_id: subjectType === "org_unit" ? subjectId : null,
        include_child_units: subjectType === "org_unit" ? includeChildUnits : false,
        note,
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: describeDbError(error, RULE_UNIQUE) };
    return { ok: true, message: "Access rule added.", data: { id: data.id } };
  } catch (error) {
    return denied(error);
  }
}

export async function setAccessRuleEnabled(id: string, enabled: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const ruleId = idSchema.parse(id);
    const { data, error } = await supabase
      .from("app_access_rules")
      .update({ is_enabled: z.boolean().parse(enabled) })
      .eq("id", ruleId)
      .select("id");
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data.length) return { ok: false, message: "Access rule not found." };
    return { ok: true, message: enabled ? "Access rule enabled." : "Access rule disabled." };
  } catch (error) {
    return denied(error);
  }
}

export async function deleteAccessRule(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const ruleId = idSchema.parse(id);
    const { data, error } = await supabase.from("app_access_rules").delete().eq("id", ruleId).select("id");
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data.length) return { ok: false, message: "Access rule not found." };
    return { ok: true, message: "Access rule deleted." };
  } catch (error) {
    return denied(error);
  }
}

"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { AuthorizationError, requireSuperAdminAction } from "@/lib/auth";
import { describeDbError } from "@/lib/db-errors";
import { idSchema, parseForm, roleSchema } from "@/lib/validation";

const ROLE_UNIQUE = { roles_name_key: "A role with this name already exists." };
const FIELDS = ["name", "description", "grantsAdmin"] as const;

function denied(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return { ok: false, message: error.message };
  if (error instanceof z.ZodError) return { ok: false, message: "Invalid request." };
  throw error;
}

export async function createRole(
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const parsed = parseForm(roleSchema, formData, FIELDS);
    if (!parsed.success)
      return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    const { data, error } = await supabase
      .from("roles")
      .insert({
        name: parsed.data.name,
        description: parsed.data.description,
        grants_admin: parsed.data.grantsAdmin,
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: describeDbError(error, ROLE_UNIQUE) };
    return { ok: true, message: `Role ${parsed.data.name} created.`, data: { id: data.id } };
  } catch (error) {
    return denied(error);
  }
}

export async function updateRole(
  id: string,
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const roleId = idSchema.parse(id);
    const parsed = parseForm(roleSchema, formData, FIELDS);
    if (!parsed.success)
      return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    const { data, error } = await supabase
      .from("roles")
      .update({
        name: parsed.data.name,
        description: parsed.data.description,
        grants_admin: parsed.data.grantsAdmin,
      })
      .eq("id", roleId)
      .select("id");
    if (error) return { ok: false, message: describeDbError(error, ROLE_UNIQUE) };
    if (!data.length) return { ok: false, message: "Role not found." };
    return { ok: true, message: "Role saved.", data: { id: roleId } };
  } catch (error) {
    return denied(error);
  }
}

/** Custom roles only; the mapping to positions is removed with the role. RLS refuses system roles. */
export async function deleteRole(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const roleId = idSchema.parse(id);
    const { data, error } = await supabase.from("roles").delete().eq("id", roleId).select("id");
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data.length) return { ok: false, message: "System roles cannot be deleted." };
    return { ok: true, message: "Role deleted." };
  } catch (error) {
    return denied(error);
  }
}

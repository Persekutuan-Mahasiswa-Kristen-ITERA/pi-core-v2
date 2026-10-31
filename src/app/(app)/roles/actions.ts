"use server";

import type { ActionResult } from "@/lib/action-result";
import { AuthorizationError, requireAdminAction } from "@/lib/auth";
import { describeDbError } from "@/lib/db-errors";
import { idSchema, parseForm, positionNameSchema, roleSchema } from "@/lib/validation";
import { z } from "zod";

const ROLE_UNIQUE = { roles_name_key: "A role with this name already exists." };
const POSITION_UNIQUE = { positions_role_name_key: "This role already has a position with that name." };

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
    const { supabase } = await requireAdminAction();
    const parsed = parseForm(roleSchema, formData, ["name", "description"]);
    if (!parsed.success)
      return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    const { data, error } = await supabase
      .from("roles")
      .insert({ name: parsed.data.name, description: parsed.data.description })
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
    const { supabase } = await requireAdminAction();
    const roleId = idSchema.parse(id);
    const parsed = parseForm(roleSchema, formData, ["name", "description"]);
    if (!parsed.success)
      return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    const { data, error } = await supabase
      .from("roles")
      .update({ name: parsed.data.name, description: parsed.data.description })
      .eq("id", roleId)
      .select("id");
    if (error) return { ok: false, message: describeDbError(error, ROLE_UNIQUE) };
    if (!data.length) return { ok: false, message: "Role not found." };
    return { ok: true, message: "Role saved.", data: { id: roleId } };
  } catch (error) {
    return denied(error);
  }
}

/** Refuses while any assignment (any period) references the role; the FK enforces the same. */
export async function deleteRole(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const roleId = idSchema.parse(id);
    const { count, error: countError } = await supabase
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("role_id", roleId);
    if (countError) return { ok: false, message: describeDbError(countError) };
    if (count) return { ok: false, message: `This role still has ${count} assignment(s). Remove them first.` };
    const { data, error } = await supabase.from("roles").delete().eq("id", roleId).select("id");
    if (error)
      return {
        ok: false,
        message: describeDbError(error, { foreign_key: "This role still has assignments. Remove them first." }),
      };
    if (!data.length) return { ok: false, message: "Role not found." };
    return { ok: true, message: "Role deleted." };
  } catch (error) {
    return denied(error);
  }
}

export async function addPosition(roleId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const role = idSchema.parse(roleId);
    const name = positionNameSchema.safeParse(formData.get("name") ?? "");
    if (!name.success)
      return { ok: false, message: "Check the position name.", fieldErrors: { name: [name.error.issues[0].message] } };
    const { error } = await supabase.from("positions").insert({ role_id: role, name: name.data });
    if (error) return { ok: false, message: describeDbError(error, POSITION_UNIQUE) };
    return { ok: true, message: `Position ${name.data} added.` };
  } catch (error) {
    return denied(error);
  }
}

export async function renamePosition(
  positionId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const id = idSchema.parse(positionId);
    const name = positionNameSchema.safeParse(formData.get("name") ?? "");
    if (!name.success) return { ok: false, message: name.error.issues[0].message };
    const { data, error } = await supabase.from("positions").update({ name: name.data }).eq("id", id).select("id");
    if (error) return { ok: false, message: describeDbError(error, POSITION_UNIQUE) };
    if (!data.length) return { ok: false, message: "Position not found." };
    return { ok: true, message: "Position renamed." };
  } catch (error) {
    return denied(error);
  }
}

export async function deletePosition(positionId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const id = idSchema.parse(positionId);
    const { data, error } = await supabase.from("positions").delete().eq("id", id).select("id");
    if (error)
      return {
        ok: false,
        message: describeDbError(error, { foreign_key: "This position is used by assignments. Remove them first." }),
      };
    if (!data.length) return { ok: false, message: "Position not found." };
    return { ok: true, message: "Position deleted." };
  } catch (error) {
    return denied(error);
  }
}

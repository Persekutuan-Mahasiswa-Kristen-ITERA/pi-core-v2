"use server";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionResult } from "@/lib/action-result";
import { AuthorizationError, requireSuperAdminAction } from "@/lib/auth";
import { describeDbError } from "@/lib/db-errors";
import type { Database } from "@/lib/supabase/types";
import {
  idSchema,
  orgUnitCreateSchema,
  orgUnitUpdateSchema,
  parseForm,
  parseIdList,
  positionCreateSchema,
  positionSchema,
} from "@/lib/validation";

/** Organization structure: super admins only. RLS (is_super_admin) enforces the same. */

const UNIT_ERRORS = { org_units_parent_name_key: "This parent already has a unit with that name." };
const POSITION_ERRORS = { positions_unit_type_name_key: "That unit type already has a position with this name." };

function denied(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return { ok: false, message: error.message };
  if (error instanceof z.ZodError) return { ok: false, message: "Invalid request." };
  throw error;
}

function invalid(fieldErrors: Partial<Record<string, string[]>>): ActionResult<never> {
  return { ok: false, message: "Check the highlighted fields.", fieldErrors };
}

// ---------------------------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------------------------

export async function createUnit(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const parsed = parseForm(orgUnitCreateSchema, formData, ["parentId", "type", "name", "sortOrder"]);
    if (!parsed.success) return invalid(parsed.fieldErrors);
    const { error } = await supabase.from("org_units").insert({
      parent_id: parsed.data.parentId,
      type: parsed.data.type,
      name: parsed.data.name,
      sort_order: parsed.data.sortOrder,
    });
    if (error) return { ok: false, message: describeDbError(error, UNIT_ERRORS) };
    return { ok: true, message: `${parsed.data.name} added.` };
  } catch (error) {
    return denied(error);
  }
}

export async function updateUnit(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const unitId = idSchema.parse(id);
    const parsed = parseForm(orgUnitUpdateSchema, formData, ["name", "sortOrder"]);
    if (!parsed.success) return invalid(parsed.fieldErrors);
    const { data, error } = await supabase
      .from("org_units")
      .update({ name: parsed.data.name, sort_order: parsed.data.sortOrder })
      .eq("id", unitId)
      .select("id");
    if (error) return { ok: false, message: describeDbError(error, UNIT_ERRORS) };
    if (!data.length) return { ok: false, message: "Unit not found." };
    return { ok: true, message: "Unit saved." };
  } catch (error) {
    return denied(error);
  }
}

/** Inactive units keep their history but take no new assignments. */
export async function setUnitActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const unitId = idSchema.parse(id);
    const { data, error } = await supabase
      .from("org_units")
      .update({ is_active: z.boolean().parse(active) })
      .eq("id", unitId)
      .neq("type", "organization")
      .select("id");
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data.length) return { ok: false, message: "Unit not found." };
    return { ok: true, message: active ? "Unit reactivated." : "Unit deactivated." };
  } catch (error) {
    return denied(error);
  }
}

/** Only units with no sub-units and no assignments (any period); the FKs enforce the same. */
export async function deleteUnit(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const unitId = idSchema.parse(id);
    const { data, error } = await supabase
      .from("org_units")
      .delete()
      .eq("id", unitId)
      .neq("type", "organization")
      .select("id");
    if (error)
      return {
        ok: false,
        message: describeDbError(error, {
          foreign_key: "This unit still has sub-units or assignments. Deactivate it instead.",
        }),
      };
    if (!data.length) return { ok: false, message: "Unit not found." };
    return { ok: true, message: "Unit deleted." };
  } catch (error) {
    return denied(error);
  }
}

// ---------------------------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------------------------

/** Makes position_roles match `roleIds`. */
async function syncPositionRoles(supabase: SupabaseClient<Database>, positionId: string, roleIds: string[]) {
  const { data: current, error } = await supabase
    .from("position_roles")
    .select("role_id")
    .eq("position_id", positionId);
  if (error) return error;
  const have = new Set(current.map((r) => r.role_id));
  const want = new Set(roleIds);
  const remove = [...have].filter((r) => !want.has(r));
  const add = [...want].filter((r) => !have.has(r));
  if (remove.length) {
    const { error: delError } = await supabase
      .from("position_roles")
      .delete()
      .eq("position_id", positionId)
      .in("role_id", remove);
    if (delError) return delError;
  }
  if (add.length) {
    const { error: insError } = await supabase
      .from("position_roles")
      .insert(add.map((role_id) => ({ position_id: positionId, role_id })));
    if (insError) return insError;
  }
  return null;
}

export async function createPosition(
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const parsed = parseForm(positionCreateSchema, formData, ["name", "unitType", "rank", "isUniquePerUnit"]);
    if (!parsed.success) return invalid(parsed.fieldErrors);
    const roleIds = parseIdList(formData, "roleIds");
    const { data, error } = await supabase
      .from("positions")
      .insert({
        name: parsed.data.name,
        unit_type: parsed.data.unitType,
        rank: parsed.data.rank,
        is_unique_per_unit: parsed.data.isUniquePerUnit,
      })
      .select("id")
      .single();
    if (error) return { ok: false, message: describeDbError(error, POSITION_ERRORS) };
    const roleError = await syncPositionRoles(supabase, data.id, roleIds);
    if (roleError)
      return { ok: false, message: `Position created, but its roles were not saved: ${describeDbError(roleError)}` };
    return { ok: true, message: `Position ${parsed.data.name} created.`, data: { id: data.id } };
  } catch (error) {
    return denied(error);
  }
}

export async function updatePosition(
  id: string,
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const positionId = idSchema.parse(id);
    const parsed = parseForm(positionSchema, formData, ["name", "rank", "isUniquePerUnit"]);
    if (!parsed.success) return invalid(parsed.fieldErrors);
    const roleIds = parseIdList(formData, "roleIds");
    const { data, error } = await supabase
      .from("positions")
      .update({ name: parsed.data.name, rank: parsed.data.rank, is_unique_per_unit: parsed.data.isUniquePerUnit })
      .eq("id", positionId)
      .select("id");
    if (error) {
      // Turning "one per unit" on while a unit already has two holders in some period.
      const message =
        error.code === "23505" && `${error.message} ${error.details}`.includes("assignments_one_holder")
          ? "Some unit already has more than one holder of this position in a period. Fix those assignments first."
          : describeDbError(error, POSITION_ERRORS);
      return { ok: false, message };
    }
    if (!data.length) return { ok: false, message: "Position not found." };
    const roleError = await syncPositionRoles(supabase, positionId, roleIds);
    if (roleError) return { ok: false, message: describeDbError(roleError) };
    return { ok: true, message: "Position saved.", data: { id: positionId } };
  } catch (error) {
    return denied(error);
  }
}

export async function deletePosition(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireSuperAdminAction();
    const positionId = idSchema.parse(id);
    const { data, error } = await supabase.from("positions").delete().eq("id", positionId).select("id");
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

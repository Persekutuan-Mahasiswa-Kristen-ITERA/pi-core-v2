"use server";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionResult } from "@/lib/action-result";
import { AuthorizationError, requireAdminAction } from "@/lib/auth";
import { describeDbError } from "@/lib/db-errors";
import { escapeLike } from "@/lib/search";
import type { Database } from "@/lib/supabase/types";
import { assignmentSchema, idSchema, parseForm, type AssignmentInput } from "@/lib/validation";

const FIELDS = ["memberId", "roleId", "positionId", "newPositionName", "periodId"] as const;
const ERRORS = {
  assignments_unique: "This member already holds that role and position in that period.",
  positions_role_name_key: "This role already has a position with that name.",
  foreign_key: "The selected member, role, position or period no longer exists.",
};

function denied(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return { ok: false, message: error.message };
  if (error instanceof z.ZodError) return { ok: false, message: "Invalid request." };
  throw error;
}

/** Picks an existing position (case-insensitive) or creates it under the chosen role. */
async function resolvePosition(
  supabase: SupabaseClient<Database>,
  input: AssignmentInput,
): Promise<{ id: string } | { error: string }> {
  if (input.positionId) return { id: input.positionId };
  const name = input.newPositionName!;
  const find = () =>
    supabase.from("positions").select("id").eq("role_id", input.roleId).ilike("name", escapeLike(name)).maybeSingle();
  const existing = await find();
  if (existing.error) return { error: describeDbError(existing.error) };
  if (existing.data) return { id: existing.data.id };
  const created = await supabase.from("positions").insert({ role_id: input.roleId, name }).select("id").single();
  if (created.error) {
    if (created.error.code === "23505") {
      const again = await find(); // created concurrently
      if (again.data) return { id: again.data.id };
    }
    return { error: describeDbError(created.error, ERRORS) };
  }
  return { id: created.data.id };
}

async function save(id: string | null, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdminAction();
  const assignmentId = id ? idSchema.parse(id) : null;
  const parsed = parseForm(assignmentSchema, formData, FIELDS);
  if (!parsed.success) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };

  const position = await resolvePosition(supabase, parsed.data);
  if ("error" in position)
    return { ok: false, message: position.error, fieldErrors: { newPositionName: [position.error] } };

  const row = {
    member_id: parsed.data.memberId,
    role_id: parsed.data.roleId,
    position_id: position.id,
    period_id: parsed.data.periodId,
  };
  const { data, error } = assignmentId
    ? await supabase.from("assignments").update(row).eq("id", assignmentId).select("id")
    : await supabase.from("assignments").insert(row).select("id");
  if (error) {
    // 23503 here also covers a position that belongs to a different role (composite FK).
    const message =
      error.code === "23503" ? "That position does not belong to the selected role." : describeDbError(error, ERRORS);
    return { ok: false, message };
  }
  if (!data.length) return { ok: false, message: "Assignment not found." };
  return { ok: true, message: assignmentId ? "Assignment saved." : "Assignment added." };
}

export async function createAssignment(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    return await save(null, formData);
  } catch (error) {
    return denied(error);
  }
}

export async function updateAssignment(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    return await save(id, formData);
  } catch (error) {
    return denied(error);
  }
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const assignmentId = idSchema.parse(id);
    const { data, error } = await supabase.from("assignments").delete().eq("id", assignmentId).select("id");
    if (error) return { ok: false, message: describeDbError(error) };
    if (!data.length) return { ok: false, message: "Assignment not found." };
    return { ok: true, message: "Assignment removed." };
  } catch (error) {
    return denied(error);
  }
}

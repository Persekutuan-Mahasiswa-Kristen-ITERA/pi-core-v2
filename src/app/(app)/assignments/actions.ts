"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { AuthorizationError, requireAdminAction } from "@/lib/auth";
import { describeDbError } from "@/lib/db-errors";
import { assignmentRow } from "@/lib/supabase/types";
import { assignmentSchema, idSchema, parseForm } from "@/lib/validation";

const FIELDS = ["memberId", "orgUnitId", "positionId", "periodId"] as const;
const ERRORS = {
  assignments_unique: "This member already holds that position in that unit and period.",
  assignments_one_holder: "Someone already holds that position in this unit for that period.",
  foreign_key: "The selected member, unit, position or period no longer exists.",
};

function denied(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return { ok: false, message: error.message };
  if (error instanceof z.ZodError) return { ok: false, message: "Invalid request." };
  throw error;
}

async function save(id: string | null, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdminAction();
  const assignmentId = id ? idSchema.parse(id) : null;
  const parsed = parseForm(assignmentSchema, formData, FIELDS);
  if (!parsed.success) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };

  const row = assignmentRow({
    member_id: parsed.data.memberId,
    org_unit_id: parsed.data.orgUnitId,
    position_id: parsed.data.positionId,
    period_id: parsed.data.periodId,
  });
  // The database checks that the position belongs to this kind of unit, that the unit is active,
  // and that unique positions (Kepala Divisi, Ketua Umum, ...) have one holder per unit and period.
  const { data, error } = assignmentId
    ? await supabase.from("assignments").update(row).eq("id", assignmentId).select("id")
    : await supabase.from("assignments").insert(row).select("id");
  if (error) {
    const message = describeDbError(error, ERRORS);
    const field =
      error.hint === "unit_type_mismatch" ? "positionId" : error.hint === "unit_inactive" ? "orgUnitId" : null;
    return { ok: false, message, fieldErrors: field ? { [field]: [message] } : undefined };
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

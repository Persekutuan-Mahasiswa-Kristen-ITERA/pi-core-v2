"use server";

import type { ActionResult } from "@/lib/action-result";
import { AuthorizationError, requireAdminAction } from "@/lib/auth";
import { describeDbError } from "@/lib/db-errors";
import { idSchema, parseForm, periodSchema } from "@/lib/validation";

const FIELDS = ["label", "startsOn", "endsOn"] as const;
const UNIQUE = { periods_label_key: "A period with this label already exists." };

function denied(error: unknown): ActionResult {
  if (error instanceof AuthorizationError) return { ok: false, message: error.message };
  throw error;
}

export async function createPeriod(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const parsed = parseForm(periodSchema, formData, FIELDS);
    if (!parsed.success) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    const { label, startsOn, endsOn } = parsed.data;
    const { error } = await supabase.from("periods").insert({ label, starts_on: startsOn, ends_on: endsOn });
    if (error) return { ok: false, message: describeDbError(error, UNIQUE) };
    return { ok: true, message: `Period ${label} created.` };
  } catch (error) {
    return denied(error);
  }
}

export async function updatePeriod(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const periodId = idSchema.parse(id);
    const parsed = parseForm(periodSchema, formData, FIELDS);
    if (!parsed.success) return { ok: false, message: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
    const { label, startsOn, endsOn } = parsed.data;
    const { data, error } = await supabase
      .from("periods")
      .update({ label, starts_on: startsOn, ends_on: endsOn })
      .eq("id", periodId)
      .select("id");
    if (error) return { ok: false, message: describeDbError(error, UNIQUE) };
    if (!data.length) return { ok: false, message: "Period not found." };
    return { ok: true, message: `Period ${label} saved.` };
  } catch (error) {
    return denied(error);
  }
}

/** Atomic switch, done by the set_active_period() database function. */
export async function setActivePeriod(id: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdminAction();
    const periodId = idSchema.parse(id);
    const { error } = await supabase.rpc("set_active_period", { p_period_id: periodId });
    if (error) return { ok: false, message: describeDbError(error) };
    return { ok: true, message: "Active period changed." };
  } catch (error) {
    return denied(error);
  }
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, FormMessage, SubmitButton, fieldClass } from "@/components/common/form-controls";
import { useActionFeedback } from "@/components/common/use-action-feedback";
import { initialActionState, type ActionResult } from "@/lib/action-result";
import { UNIT_TYPE_LABEL } from "@/lib/org-structure";
import type { OrgUnitType } from "@/lib/supabase/types";
import { POSITION_UNIT_TYPES } from "@/lib/validation";

type Result = ActionResult<{ id: string }>;
type Props = {
  action: (prev: Result, formData: FormData) => Promise<Result>;
  roles: { id: string; name: string; grants_admin: boolean }[];
  defaults?: { name: string; unitType: OrgUnitType; rank: number; isUniquePerUnit: boolean; roleIds: string[] };
  /** Edit mode: the unit type is fixed after creation. */
  fixedUnitType?: boolean;
  submitLabel: string;
};

export function PositionForm({ action, roles, defaults, fixedUnitType, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, initialActionState as Result);
  useActionFeedback(state, "/structure");
  const errors = state.ok ? undefined : state.fieldErrors;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field name="name" label="Position name" errors={errors?.name} hint="e.g. Kepala Divisi">
        {(a) => <input {...a} defaultValue={defaults?.name} className={fieldClass} required maxLength={80} />}
      </Field>
      {fixedUnitType && defaults ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-pmk-ink">Kind of unit</p>
          <p className="text-sm text-pmk-body">
            {UNIT_TYPE_LABEL[defaults.unitType]} (fixed; create a new position for another kind of unit)
          </p>
        </div>
      ) : (
        <Field name="unitType" label="Kind of unit" errors={errors?.unitType}>
          {(a) => (
            <select {...a} defaultValue={defaults?.unitType ?? "division"} className={fieldClass} required>
              {POSITION_UNIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {UNIT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <Field name="rank" label="Rank" errors={errors?.rank} hint="Lower is more senior: Ketua Umum 10, Staff 70.">
        {(a) => (
          <input
            {...a}
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            defaultValue={defaults?.rank ?? 70}
            className={fieldClass}
            required
          />
        )}
      </Field>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-pmk-tint px-4 py-3">
        <input
          type="checkbox"
          name="isUniquePerUnit"
          defaultChecked={defaults?.isUniquePerUnit ?? false}
          className="mt-0.5 size-5 shrink-0 accent-pmk-brown"
        />
        <span className="text-sm">
          <span className="block font-semibold text-pmk-ink">One per unit</span>
          <span className="text-pmk-body">Only one member can hold this position in a unit per period.</span>
        </span>
      </label>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-pmk-ink">Roles</legend>
        <p className="text-xs text-pmk-body">Members holding this position carry these roles.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((r) => (
            <label key={r.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-pmk-tint px-4">
              <input
                type="checkbox"
                name="roleIds"
                value={r.id}
                defaultChecked={defaults?.roleIds.includes(r.id)}
                className="size-5 shrink-0 accent-pmk-brown"
              />
              <span className="text-sm text-pmk-ink">
                {r.name}
                {r.grants_admin ? (
                  <span className="block text-[11px] font-semibold text-pmk-accent">ADMIN ACCESS</span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link
          href="/structure"
          className="inline-flex h-11 items-center rounded-full px-4 text-sm font-medium text-pmk-muted hover:bg-pmk-tint hover:text-pmk-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

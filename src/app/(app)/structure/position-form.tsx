"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  Field,
  FormMessage,
  SubmitButton,
  cancelLinkClass,
  choiceCardClass,
  fieldClass,
  selectClass,
} from "@/components/common/form-controls";
import { useDict } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { useActionFeedback } from "@/components/common/use-action-feedback";
import { initialActionState, type ActionResult } from "@/lib/action-result";
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
  const d = useDict();
  const s = d.structure;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field name="name" label={s.positionName} errors={errors?.name} hint={s.positionNameHint}>
        {(a) => <input {...a} defaultValue={defaults?.name} className={fieldClass} required maxLength={80} />}
      </Field>
      {fixedUnitType && defaults ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-pmk-ink">{s.kind}</p>
          <p className="text-sm text-pmk-body">{s.kindFixed(d.unitType[defaults.unitType])}</p>
        </div>
      ) : (
        <Field name="unitType" label={s.kind} errors={errors?.unitType}>
          {(a) => (
            <select {...a} defaultValue={defaults?.unitType ?? "division"} className={selectClass} required>
              {POSITION_UNIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {d.unitType[t]}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
      <Field name="rank" label={s.rankLabel} errors={errors?.rank} hint={s.rankHint}>
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
      <label className={choiceCardClass}>
        <input
          type="checkbox"
          name="isUniquePerUnit"
          defaultChecked={defaults?.isUniquePerUnit ?? false}
          className="mt-0.5 size-5 shrink-0 accent-pmk-brown"
        />
        <span className="text-sm">
          <span className="block font-bold text-pmk-ink">{s.onePerUnit}</span>
          <span className="text-[13px] text-pmk-muted">{s.onePerUnitBody}</span>
        </span>
      </label>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-pmk-ink">{s.roles}</legend>
        <p className="text-[13px] text-pmk-muted">{s.rolesHint}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((r) => (
            <label key={r.id} className={cn(choiceCardClass, "items-center")}>
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
                  <span className="block text-xs font-semibold text-pmk-gold-strong">{s.adminAccess}</span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href="/structure" className={cancelLinkClass}>
          {d.common.cancel}
        </Link>
      </div>
    </form>
  );
}

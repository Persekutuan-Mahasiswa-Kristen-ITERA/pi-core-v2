"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, FormMessage, SubmitButton, fieldClass } from "@/components/common/form-controls";
import { useActionFeedback } from "@/components/common/use-action-feedback";
import { initialActionState, type ActionResult } from "@/lib/action-result";
import { UNIT_TYPE_LABEL } from "@/lib/org-structure";
import type { OrgUnitType } from "@/lib/supabase/types";

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  /** Create mode: the parent and the child types it allows. */
  create?: { parentId: string; types: OrgUnitType[] };
  defaults?: { name: string; sortOrder: number };
  submitLabel: string;
};

export function UnitForm({ action, create, defaults, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  useActionFeedback(state, "/structure");
  const errors = state.ok ? undefined : state.fieldErrors;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {create ? (
        <>
          <input type="hidden" name="parentId" value={create.parentId} />
          <Field name="type" label="Kind of unit" errors={errors?.type}>
            {(a) => (
              <select {...a} defaultValue={create.types[0]} className={fieldClass} required>
                {create.types.map((t) => (
                  <option key={t} value={t}>
                    {UNIT_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </>
      ) : null}
      <Field name="name" label="Name" errors={errors?.name} hint="e.g. Departemen Pelayanan Khusus or Musik">
        {(a) => <input {...a} defaultValue={defaults?.name} className={fieldClass} required maxLength={80} />}
      </Field>
      <Field name="sortOrder" label="Sort order" errors={errors?.sortOrder} hint="Lower numbers are listed first.">
        {(a) => (
          <input
            {...a}
            type="number"
            inputMode="numeric"
            min={0}
            max={9999}
            defaultValue={defaults?.sortOrder ?? 100}
            className={fieldClass}
          />
        )}
      </Field>
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

"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  Field,
  FormMessage,
  SubmitButton,
  cancelLinkClass,
  fieldClass,
  selectClass,
} from "@/components/common/form-controls";
import { useDict } from "@/lib/i18n/client";
import { useActionFeedback } from "@/components/common/use-action-feedback";
import { initialActionState, type ActionResult } from "@/lib/action-result";
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
  const d = useDict();
  const s = d.structure;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {create ? (
        <>
          <input type="hidden" name="parentId" value={create.parentId} />
          <Field name="type" label={s.kind} errors={errors?.type}>
            {(a) => (
              <select {...a} defaultValue={create.types[0]} className={selectClass} required>
                {create.types.map((t) => (
                  <option key={t} value={t}>
                    {d.unitType[t]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </>
      ) : null}
      <Field name="name" label={s.name} errors={errors?.name} hint={s.nameHint}>
        {(a) => <input {...a} defaultValue={defaults?.name} className={fieldClass} required maxLength={80} />}
      </Field>
      <Field name="sortOrder" label={s.sortOrder} errors={errors?.sortOrder} hint={s.sortHint}>
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
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href="/structure" className={cancelLinkClass}>
          {d.common.cancel}
        </Link>
      </div>
    </form>
  );
}

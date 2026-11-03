"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, FormMessage, SubmitButton, cancelLinkClass, fieldClass } from "@/components/common/form-controls";
import { useDict } from "@/lib/i18n/client";
import { useActionFeedback } from "@/components/common/use-action-feedback";
import { initialActionState, type ActionResult } from "@/lib/action-result";

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  defaults?: { label: string; startsOn: string | null; endsOn: string | null };
  submitLabel: string;
};

export function PeriodForm({ action, defaults, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  useActionFeedback(state, "/periods");
  const errors = state.ok ? undefined : state.fieldErrors;
  const d = useDict();
  const t = d.periods;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field name="label" label={t.label} errors={errors?.label} hint={t.labelHint}>
        {(a) => (
          <input
            {...a}
            defaultValue={defaults?.label}
            placeholder="2026/2027"
            inputMode="numeric"
            className={fieldClass}
            required
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="startsOn" label={t.startsOn} errors={errors?.startsOn}>
          {(a) => <input {...a} type="date" defaultValue={defaults?.startsOn ?? ""} className={fieldClass} />}
        </Field>
        <Field name="endsOn" label={t.endsOn} errors={errors?.endsOn}>
          {(a) => <input {...a} type="date" defaultValue={defaults?.endsOn ?? ""} className={fieldClass} />}
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href="/periods" className={cancelLinkClass}>
          {d.common.cancel}
        </Link>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, FormMessage, SubmitButton, fieldClass } from "@/components/common/form-controls";
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
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field name="label" label="Academic year" errors={errors?.label} hint="Format: 2026/2027">
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
        <Field name="startsOn" label="Starts on (optional)" errors={errors?.startsOn}>
          {(a) => <input {...a} type="date" defaultValue={defaults?.startsOn ?? ""} className={fieldClass} />}
        </Field>
        <Field name="endsOn" label="Ends on (optional)" errors={errors?.endsOn}>
          {(a) => <input {...a} type="date" defaultValue={defaults?.endsOn ?? ""} className={fieldClass} />}
        </Field>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link
          href="/periods"
          className="inline-flex h-11 items-center rounded-full px-4 text-sm font-medium text-pmk-muted hover:bg-pmk-tint hover:text-pmk-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

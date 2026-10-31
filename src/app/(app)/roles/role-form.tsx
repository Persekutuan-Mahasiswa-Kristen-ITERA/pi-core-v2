"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, FormMessage, SubmitButton, fieldClass } from "@/components/common/form-controls";
import { useActionFeedback } from "@/components/common/use-action-feedback";
import { initialActionState, type ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

type Props = {
  action: (prev: ActionResult<{ id: string }>, formData: FormData) => Promise<ActionResult<{ id: string }>>;
  defaults?: { name: string; description: string | null };
  submitLabel: string;
  cancelHref: string;
};

export function RoleForm({ action, defaults, submitLabel, cancelHref }: Props) {
  const [state, formAction] = useActionState(action, initialActionState as ActionResult<{ id: string }>);
  useActionFeedback(state, state.ok && state.data ? `/roles/${state.data.id}` : undefined);
  const errors = state.ok ? undefined : state.fieldErrors;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field name="name" label="Role name" errors={errors?.name} hint="Organizational category, e.g. BPH or Panitia. Roles never grant admin access.">
        {(a) => <input {...a} defaultValue={defaults?.name} className={fieldClass} required maxLength={60} />}
      </Field>
      <Field name="description" label="Description (optional)" errors={errors?.description}>
        {(a) => (
          <textarea {...a} defaultValue={defaults?.description ?? ""} rows={3} maxLength={280} className={cn(fieldClass, "h-auto py-3")} />
        )}
      </Field>
      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className="inline-flex min-h-11 items-center px-4 text-sm font-medium text-pmk-body hover:text-pmk-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}

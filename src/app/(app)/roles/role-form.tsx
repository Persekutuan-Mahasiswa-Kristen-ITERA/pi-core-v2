"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, FormMessage, SubmitButton, fieldClass } from "@/components/common/form-controls";
import { useActionFeedback } from "@/components/common/use-action-feedback";
import { initialActionState, type ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

type Props = {
  action: (prev: ActionResult<{ id: string }>, formData: FormData) => Promise<ActionResult<{ id: string }>>;
  defaults?: { name: string; description: string | null; grantsAdmin: boolean };
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
      <Field
        name="name"
        label="Role name"
        errors={errors?.name}
        hint="A group of positions with the same responsibilities, e.g. BPH or Sekretaris."
      >
        {(a) => <input {...a} defaultValue={defaults?.name} className={fieldClass} required maxLength={60} />}
      </Field>
      <Field name="description" label="Description (optional)" errors={errors?.description}>
        {(a) => (
          <textarea
            {...a}
            defaultValue={defaults?.description ?? ""}
            rows={3}
            maxLength={280}
            className={cn(fieldClass, "h-auto py-3")}
          />
        )}
      </Field>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-pmk-tint px-4 py-3">
        <input
          type="checkbox"
          name="grantsAdmin"
          defaultChecked={defaults?.grantsAdmin ?? false}
          className="mt-0.5 size-5 shrink-0 accent-pmk-brown"
        />
        <span className="text-sm">
          <span className="block font-semibold text-pmk-ink">Gives admin access</span>
          <span className="text-pmk-body">
            Members holding a position with this role in the active period can manage members, periods and assignments.
          </span>
        </span>
      </label>
      <div className="flex items-center gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link
          href={cancelHref}
          className="inline-flex min-h-11 items-center px-4 text-sm font-medium text-pmk-body hover:text-pmk-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

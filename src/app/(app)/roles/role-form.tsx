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
} from "@/components/common/form-controls";
import { useDict } from "@/lib/i18n/client";
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
  const d = useDict();
  const r = d.roles;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field name="name" label={r.name} errors={errors?.name} hint={r.nameHint}>
        {(a) => <input {...a} defaultValue={defaults?.name} className={fieldClass} required maxLength={60} />}
      </Field>
      <Field name="description" label={r.descriptionLabel} errors={errors?.description}>
        {(a) => (
          <textarea
            {...a}
            defaultValue={defaults?.description ?? ""}
            rows={3}
            maxLength={280}
            className={cn(fieldClass, "h-auto min-h-24 py-3")}
          />
        )}
      </Field>
      <label className={choiceCardClass}>
        <input
          type="checkbox"
          name="grantsAdmin"
          defaultChecked={defaults?.grantsAdmin ?? false}
          className="mt-0.5 size-5 shrink-0 accent-pmk-brown"
        />
        <span className="text-sm">
          <span className="block font-bold text-pmk-ink">{r.grants}</span>
          <span className="text-[13px] text-pmk-muted">{r.grantsBody}</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className={cancelLinkClass}>
          {d.common.cancel}
        </Link>
      </div>
    </form>
  );
}

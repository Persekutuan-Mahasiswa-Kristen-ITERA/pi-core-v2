"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { changeOwnPassword } from "@/app/actions/password";
import { Field, FormMessage, SubmitButton, fieldClass } from "@/components/common/form-controls";
import { initialActionState } from "@/lib/action-result";

export function PasswordForm({
  currentLabel = "Current password",
  submitLabel = "Change password",
}: {
  currentLabel?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(changeOwnPassword, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Password changed.");
      formRef.current?.reset();
    }
  }, [state]);

  const errors = state.ok ? undefined : state.fieldErrors;
  return (
    <form ref={formRef} action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field name="currentPassword" label={currentLabel} errors={errors?.currentPassword}>
        {(a) => <input {...a} type="password" autoComplete="current-password" className={fieldClass} required />}
      </Field>
      <Field
        name="newPassword"
        label="New password"
        errors={errors?.newPassword}
        hint="At least 8 characters, with a letter and a digit."
      >
        {(a) => (
          <input {...a} type="password" autoComplete="new-password" className={fieldClass} required minLength={8} />
        )}
      </Field>
      <Field name="confirmPassword" label="Confirm new password" errors={errors?.confirmPassword}>
        {(a) => <input {...a} type="password" autoComplete="new-password" className={fieldClass} required />}
      </Field>
      <SubmitButton pendingText="Changing…">{submitLabel}</SubmitButton>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { changeOwnPassword } from "@/app/actions/password";
import { Field, FormMessage, SubmitButton, fieldClass } from "@/components/common/form-controls";
import { useDict, useTranslateMessage } from "@/lib/i18n/client";
import { initialActionState } from "@/lib/action-result";

export function PasswordForm({ currentLabel, submitLabel }: { currentLabel?: string; submitLabel?: string }) {
  const [state, formAction] = useActionState(changeOwnPassword, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const d = useDict();
  const tr = useTranslateMessage();

  useEffect(() => {
    if (state.ok) {
      toast.success(tr(state.message ?? "Password changed."));
      formRef.current?.reset();
    }
  }, [state, tr]);

  const errors = state.ok ? undefined : state.fieldErrors;
  return (
    <form ref={formRef} action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field name="currentPassword" label={currentLabel ?? d.password.current} errors={errors?.currentPassword}>
        {(a) => <input {...a} type="password" autoComplete="current-password" className={fieldClass} required />}
      </Field>
      <Field name="newPassword" label={d.password.new} errors={errors?.newPassword} hint={d.password.newHint}>
        {(a) => (
          <input {...a} type="password" autoComplete="new-password" className={fieldClass} required minLength={8} />
        )}
      </Field>
      <Field name="confirmPassword" label={d.password.confirm} errors={errors?.confirmPassword}>
        {(a) => <input {...a} type="password" autoComplete="new-password" className={fieldClass} required />}
      </Field>
      <SubmitButton pendingText={d.password.changing}>{submitLabel ?? d.password.submit}</SubmitButton>
    </form>
  );
}

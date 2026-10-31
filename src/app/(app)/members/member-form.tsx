"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, FormMessage, SubmitButton, fieldClass } from "@/components/common/form-controls";
import { useActionFeedback } from "@/components/common/use-action-feedback";
import { OneTimeSecret } from "@/components/common/one-time-secret";
import { initialActionState, type ActionResult } from "@/lib/action-result";
import type { AccessLevel } from "@/lib/supabase/types";
import type { IssuedPassword } from "./actions";

type Defaults = { fullName: string; email: string; nim: string | null; phone: string | null; accessLevel: AccessLevel };

type Props =
  | { mode: "create"; action: (prev: ActionResult<IssuedPassword>, fd: FormData) => Promise<ActionResult<IssuedPassword>>; defaults?: undefined; isSelf?: undefined }
  | { mode: "edit"; action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>; defaults: Defaults; isSelf: boolean };

export function MemberForm(props: Props) {
  // The two modes share one form; create's result also carries the one-time password.
  const [state, formAction] = useActionState(
    props.action as (prev: ActionResult<IssuedPassword>, fd: FormData) => Promise<ActionResult<IssuedPassword>>,
    initialActionState as ActionResult<IssuedPassword>,
  );
  useActionFeedback(state, props.mode === "edit" ? "/members" : undefined);

  if (props.mode === "create" && state.ok && state.data) {
    return (
      <OneTimeSecret email={state.data.email} secret={state.data.temporaryPassword}>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href={`/assignments?member=${state.data.memberId}`} className="inline-flex min-h-11 items-center rounded-full bg-pmk-brown px-6 text-sm font-semibold text-white">
            Assign a role
          </Link>
          <Link href="/members" className="inline-flex min-h-11 items-center px-4 text-sm font-medium text-pmk-body hover:text-pmk-ink">
            Back to members
          </Link>
        </div>
      </OneTimeSecret>
    );
  }

  const errors = state.ok ? undefined : state.fieldErrors;
  const d = props.defaults;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field name="fullName" label="Full name" errors={errors?.fullName}>
        {(a) => <input {...a} defaultValue={d?.fullName} autoComplete="off" className={fieldClass} required maxLength={120} />}
      </Field>
      <Field name="email" label="Email" errors={errors?.email} hint={props.mode === "create" ? "Used to log in." : "Changing it also changes the login email."}>
        {(a) => <input {...a} type="email" inputMode="email" autoCapitalize="none" spellCheck={false} defaultValue={d?.email} className={fieldClass} required />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="nim" label="NIM (optional)" errors={errors?.nim}>
          {(a) => <input {...a} inputMode="numeric" defaultValue={d?.nim ?? ""} className={fieldClass} maxLength={12} />}
        </Field>
        <Field name="phone" label="Phone (optional)" errors={errors?.phone}>
          {(a) => <input {...a} type="tel" inputMode="tel" defaultValue={d?.phone ?? ""} className={fieldClass} maxLength={20} />}
        </Field>
      </div>
      <Field
        name="accessLevel"
        label="PI-CORE access"
        errors={errors?.accessLevel}
        hint={props.isSelf ? "You cannot change your own access." : "Admins can manage every member, role, period and assignment. This is separate from organizational roles."}
      >
        {(a) => (
          <select {...a} defaultValue={d?.accessLevel ?? "member"} className={fieldClass} disabled={props.isSelf}>
            <option value="member">Member — sees own profile only</option>
            <option value="admin">Admin — manages PI-CORE</option>
          </select>
        )}
      </Field>
      {props.isSelf ? <input type="hidden" name="accessLevel" value="admin" /> : null}
      <div className="flex items-center gap-3 pt-2">
        <SubmitButton pendingText={props.mode === "create" ? "Creating…" : "Saving…"}>{props.mode === "create" ? "Create member" : "Save changes"}</SubmitButton>
        <Link href="/members" className="inline-flex min-h-11 items-center px-4 text-sm font-medium text-pmk-body hover:text-pmk-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}

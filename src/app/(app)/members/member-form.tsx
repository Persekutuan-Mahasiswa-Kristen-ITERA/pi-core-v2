"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  Field,
  FormMessage,
  InfoBanner,
  SubmitButton,
  cancelLinkClass,
  choiceCardClass,
  fieldClass,
  selectClass,
} from "@/components/common/form-controls";
import { FieldError } from "@/components/common/field-error";
import { actionClass } from "@/components/common/surfaces";
import { KeyIcon } from "@/components/icons";
import { useDict } from "@/lib/i18n/client";
import { useActionFeedback } from "@/components/common/use-action-feedback";
import { OneTimeSecret } from "@/components/common/one-time-secret";
import { initialActionState, type ActionResult } from "@/lib/action-result";
import type { AccessLevel, MemberType } from "@/lib/supabase/types";
import type { IssuedPassword } from "./actions";

type Defaults = {
  memberType: MemberType;
  fullName: string;
  email: string;
  nim: string | null;
  nip: string | null;
  phone: string | null;
  accessLevel: AccessLevel;
};

type Props =
  | {
      mode: "create";
      action: (prev: ActionResult<IssuedPassword>, fd: FormData) => Promise<ActionResult<IssuedPassword>>;
      defaults?: undefined;
      canSetAccess: boolean;
    }
  | {
      mode: "edit";
      action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
      defaults: Defaults;
      /** Super admin editing someone else. */
      canSetAccess: boolean;
    };

export function MemberForm(props: Props) {
  // The two modes share one form; create's result also carries the one-time password.
  const [memberType, setMemberType] = useState<MemberType>(props.defaults?.memberType ?? "student");
  const [state, formAction] = useActionState(
    props.action as (prev: ActionResult<IssuedPassword>, fd: FormData) => Promise<ActionResult<IssuedPassword>>,
    initialActionState as ActionResult<IssuedPassword>,
  );
  useActionFeedback(state, props.mode === "edit" ? "/members" : undefined);
  const d = useDict();
  const f = d.memberForm;

  if (props.mode === "create" && state.ok && state.data) {
    return (
      <OneTimeSecret email={state.data.email} secret={state.data.temporaryPassword}>
        <div className="flex flex-wrap gap-3 pt-1">
          {memberType === "student" ? (
            <Link href={`/assignments?member=${state.data.memberId}`} className={actionClass("primary", "h-12 px-6")}>
              {f.assign}
            </Link>
          ) : null}
          <Link href="/members" className={cancelLinkClass}>
            {f.backToMembers}
          </Link>
        </div>
      </OneTimeSecret>
    );
  }

  const errors = state.ok ? undefined : state.fieldErrors;
  const defaults = props.defaults;
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field name="fullName" label={f.fullName} errors={errors?.fullName}>
        {(a) => (
          <input
            {...a}
            defaultValue={defaults?.fullName}
            autoComplete="off"
            className={fieldClass}
            required
            maxLength={120}
          />
        )}
      </Field>
      <Field
        name="email"
        label={f.email}
        errors={errors?.email}
        hint={props.mode === "create" ? f.emailHintCreate : f.emailHintEdit}
      >
        {(a) => (
          <input
            {...a}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={defaults?.email}
            className={fieldClass}
            required
          />
        )}
      </Field>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold text-pmk-ink">{f.memberType}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["student", d.memberType.student, f.studentNote],
              ["lecturer", d.memberType.lecturer, f.lecturerNote],
            ] as const
          ).map(([value, label, note]) => (
            <label key={value} className={choiceCardClass}>
              <input
                type="radio"
                name="memberType"
                value={value}
                checked={memberType === value}
                onChange={() => setMemberType(value)}
                className="mt-0.5 size-5 shrink-0 accent-pmk-brown focus-visible:outline-none"
              />
              <span className="text-sm">
                <span className="block font-bold text-pmk-ink">{label}</span>
                <span className="text-[13px] text-pmk-muted">{note}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError id="field-memberType-error" messages={errors?.memberType} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        {memberType === "student" ? (
          <Field name="nim" label={f.nim} errors={errors?.nim}>
            {(a) => (
              <input
                {...a}
                inputMode="numeric"
                defaultValue={defaults?.nim ?? ""}
                className={fieldClass}
                maxLength={12}
              />
            )}
          </Field>
        ) : (
          <Field name="nip" label={f.nip} errors={errors?.nip}>
            {(a) => (
              <input
                {...a}
                inputMode="numeric"
                defaultValue={defaults?.nip ?? ""}
                className={fieldClass}
                maxLength={20}
              />
            )}
          </Field>
        )}
        <Field name="phone" label={f.phone} errors={errors?.phone}>
          {(a) => (
            <input
              {...a}
              type="tel"
              inputMode="tel"
              defaultValue={defaults?.phone ?? ""}
              className={fieldClass}
              maxLength={20}
            />
          )}
        </Field>
      </div>
      {props.canSetAccess ? (
        <Field
          name="accessLevel"
          label={f.access}
          errors={errors?.accessLevel}
          hint={f.accessHelp[defaults?.accessLevel ?? "member"]}
        >
          {(a) => (
            <select {...a} defaultValue={defaults?.accessLevel ?? "member"} className={selectClass}>
              <option value="member">{d.access.member}</option>
              <option value="admin">{d.access.admin}</option>
              <option value="super_admin">{d.access.super_admin}</option>
            </select>
          )}
        </Field>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-pmk-ink">{f.access}</p>
          <p className="text-sm text-pmk-body">
            {defaults ? d.access[defaults.accessLevel] : d.access.member}. {f.accessNote}
          </p>
          <FieldError id="field-accessLevel-error" messages={errors?.accessLevel} />
        </div>
      )}
      {props.mode === "create" ? (
        <InfoBanner icon={<KeyIcon />} pulse>
          {f.tempNote}
        </InfoBanner>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <SubmitButton pendingText={props.mode === "create" ? f.creating : d.common.saving}>
          {props.mode === "create" ? f.create : d.common.saveChanges}
        </SubmitButton>
        <Link href="/members" className={cancelLinkClass}>
          {d.common.cancel}
        </Link>
      </div>
    </form>
  );
}

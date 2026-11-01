"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Field, FormMessage, SubmitButton, fieldClass } from "@/components/common/form-controls";
import { useActionFeedback } from "@/components/common/use-action-feedback";
import { OneTimeSecret } from "@/components/common/one-time-secret";
import { initialActionState, type ActionResult } from "@/lib/action-result";
import type { AccessLevel, MemberType } from "@/lib/supabase/types";
import type { IssuedPassword } from "./actions";

const ACCESS_LABEL: Record<AccessLevel, string> = { member: "Member", admin: "Admin", super_admin: "Super admin" };
const ACCESS_NOTE =
  "Only a super admin changes access levels. Holding a position with the Organization Admin role in the active period also gives admin access.";

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

const ACCESS_HELP: Record<AccessLevel, string> = {
  member:
    "Member: sees their own profile. Becomes an admin automatically while holding a position with the Organization Admin role in the active period.",
  admin: "Admin: manages members, periods and assignments, whatever their position.",
  super_admin:
    "Super admin: everything an admin can do, plus the organization structure, roles, access levels and super admin accounts.",
};

export function MemberForm(props: Props) {
  // The two modes share one form; create's result also carries the one-time password.
  const [memberType, setMemberType] = useState<MemberType>(props.defaults?.memberType ?? "student");
  const [state, formAction] = useActionState(
    props.action as (prev: ActionResult<IssuedPassword>, fd: FormData) => Promise<ActionResult<IssuedPassword>>,
    initialActionState as ActionResult<IssuedPassword>,
  );
  useActionFeedback(state, props.mode === "edit" ? "/members" : undefined);

  if (props.mode === "create" && state.ok && state.data) {
    return (
      <OneTimeSecret email={state.data.email} secret={state.data.temporaryPassword}>
        <div className="flex flex-wrap gap-3 pt-1">
          {memberType === "student" ? (
            <Link
              href={`/assignments?member=${state.data.memberId}`}
              className="inline-flex min-h-11 items-center rounded-full bg-pmk-brown px-6 text-sm font-semibold text-white"
            >
              Assign a position
            </Link>
          ) : null}
          <Link
            href="/members"
            className="inline-flex min-h-11 items-center px-4 text-sm font-medium text-pmk-body hover:text-pmk-ink"
          >
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
        {(a) => (
          <input {...a} defaultValue={d?.fullName} autoComplete="off" className={fieldClass} required maxLength={120} />
        )}
      </Field>
      <Field
        name="email"
        label="Email"
        errors={errors?.email}
        hint={props.mode === "create" ? "Used to log in." : "Changing it also changes the login email."}
      >
        {(a) => (
          <input
            {...a}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            defaultValue={d?.email}
            className={fieldClass}
            required
          />
        )}
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-pmk-ink">Member type</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["student", "Mahasiswa", "Identified by NIM. Can hold positions."],
              ["lecturer", "Dosen", "Identified by NIP/NIDN, e.g. the pembina. No positions."],
            ] as const
          ).map(([value, label, note]) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl bg-pmk-tint px-4 py-3 has-checked:ring-2 has-checked:ring-pmk-accent"
            >
              <input
                type="radio"
                name="memberType"
                value={value}
                checked={memberType === value}
                onChange={() => setMemberType(value)}
                className="mt-0.5 size-5 shrink-0 accent-pmk-brown"
              />
              <span className="text-sm">
                <span className="block font-semibold text-pmk-ink">{label}</span>
                <span className="text-xs text-pmk-body">{note}</span>
              </span>
            </label>
          ))}
        </div>
        {errors?.memberType ? <p className="text-sm font-medium text-destructive">{errors.memberType[0]}</p> : null}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        {memberType === "student" ? (
          <Field name="nim" label="NIM (optional)" errors={errors?.nim}>
            {(a) => (
              <input {...a} inputMode="numeric" defaultValue={d?.nim ?? ""} className={fieldClass} maxLength={12} />
            )}
          </Field>
        ) : (
          <Field name="nip" label="NIP / NIDN (optional)" errors={errors?.nip}>
            {(a) => (
              <input {...a} inputMode="numeric" defaultValue={d?.nip ?? ""} className={fieldClass} maxLength={20} />
            )}
          </Field>
        )}
        <Field name="phone" label="Phone (optional)" errors={errors?.phone}>
          {(a) => (
            <input
              {...a}
              type="tel"
              inputMode="tel"
              defaultValue={d?.phone ?? ""}
              className={fieldClass}
              maxLength={20}
            />
          )}
        </Field>
      </div>
      {props.canSetAccess ? (
        <Field
          name="accessLevel"
          label="PI-CORE access"
          errors={errors?.accessLevel}
          hint={ACCESS_HELP[d?.accessLevel ?? "member"]}
        >
          {(a) => (
            <select {...a} defaultValue={d?.accessLevel ?? "member"} className={fieldClass}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
          )}
        </Field>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-pmk-ink">PI-CORE access</p>
          <p className="text-sm text-pmk-body">
            {d ? ACCESS_LABEL[d.accessLevel] : "Member"}. {ACCESS_NOTE}
          </p>
          {errors?.accessLevel ? <p className="text-sm font-medium text-destructive">{errors.accessLevel[0]}</p> : null}
        </div>
      )}
      <div className="flex items-center gap-3 pt-2">
        <SubmitButton pendingText={props.mode === "create" ? "Creating…" : "Saving…"}>
          {props.mode === "create" ? "Create member" : "Save changes"}
        </SubmitButton>
        <Link
          href="/members"
          className="inline-flex min-h-11 items-center px-4 text-sm font-medium text-pmk-body hover:text-pmk-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton, choiceCardClass, fieldClass } from "@/components/common/form-controls";
import { useActionFeedback } from "@/components/common/use-action-feedback";
import { useDict } from "@/lib/i18n/client";
import { initialActionState, type ActionResult } from "@/lib/action-result";
import { ACCESS_SUBJECT_TYPES } from "@/lib/validation";
import { cn } from "@/lib/utils";

type SubjectType = (typeof ACCESS_SUBJECT_TYPES)[number];
type Option = { id: string; label: string };

type Props = {
  action: (prev: ActionResult<{ id: string }>, formData: FormData) => Promise<ActionResult<{ id: string }>>;
  appRoles: { key: string; name: string }[];
  options: Record<SubjectType, Option[]>;
};

/** Add one access rule: an app role, a subject type, then the one picker for that type (D-16). */
export function RuleForm({ action, appRoles, options }: Props) {
  const [state, formAction] = useActionState(action, initialActionState as ActionResult<{ id: string }>);
  useActionFeedback(state);
  const [subjectType, setSubjectType] = useState<SubjectType>("org_unit");
  const errors = state.ok ? undefined : state.fieldErrors;
  const d = useDict();
  const t = d.integrations;
  const choose: Record<SubjectType, string> = {
    member: t.chooseMember,
    role: t.chooseRole,
    position: t.choosePosition,
    org_unit: t.chooseUnit,
  };

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field name="appRoleKey" label={t.appRole} errors={errors?.appRoleKey}>
        {(a) => (
          <select {...a} className={fieldClass} required defaultValue={appRoles.length === 1 ? appRoles[0].key : ""}>
            <option value="" disabled>
              {t.chooseAppRole}
            </option>
            {appRoles.map((r) => (
              <option key={r.key} value={r.key}>
                {r.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-pmk-ink">{t.givenTo}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACCESS_SUBJECT_TYPES.map((type) => (
            <label key={type} className={cn(choiceCardClass, "items-start")}>
              <input
                type="radio"
                name="subjectType"
                value={type}
                checked={subjectType === type}
                onChange={() => setSubjectType(type)}
                className="mt-0.5 size-5 shrink-0 accent-pmk-brown"
              />
              <span className="text-sm">
                <span className="block font-bold text-pmk-ink">{t.subjectType[type]}</span>
                <span className="text-[13px] text-pmk-muted">{t.subjectHint[type]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field name="subjectId" label={t.subjectType[subjectType]} errors={errors?.subjectId}>
        {(a) => (
          <select {...a} key={subjectType} className={fieldClass} required defaultValue="">
            <option value="" disabled>
              {choose[subjectType]}
            </option>
            {options[subjectType].map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      {subjectType === "org_unit" ? (
        <label className={choiceCardClass}>
          <input type="checkbox" name="includeChildUnits" defaultChecked className="mt-0.5 size-5 shrink-0 accent-pmk-brown" />
          <span className="text-sm font-bold text-pmk-ink">{t.includeChildUnits}</span>
        </label>
      ) : null}

      <Field name="note" label={t.note} errors={errors?.note}>
        {(a) => <input {...a} className={fieldClass} maxLength={280} />}
      </Field>

      <SubmitButton>{t.add}</SubmitButton>
    </form>
  );
}

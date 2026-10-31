"use client";

import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, fieldClass } from "@/components/common/form-controls";
import { useActionFeedback } from "@/components/common/use-action-feedback";
import { initialActionState } from "@/lib/action-result";
import { updateOrgSettings } from "./actions";

export function OrgForm({ orgName }: { orgName: string }) {
  const [state, formAction] = useActionState(updateOrgSettings, initialActionState);
  useActionFeedback(state);
  return (
    <form action={formAction} className="w-full space-y-3" noValidate>
      <FormMessage state={state} />
      <Field name="orgName" label="Organization name" errors={state.ok ? undefined : state.fieldErrors?.orgName}>
        {(a) => (
          <input
            {...a}
            defaultValue={orgName}
            className={`${fieldClass} bg-white text-center font-bold text-pmk-body`}
            maxLength={120}
            required
          />
        )}
      </Field>
      <div className="flex justify-center">
        <SubmitButton className="h-11">Save name</SubmitButton>
      </div>
    </form>
  );
}

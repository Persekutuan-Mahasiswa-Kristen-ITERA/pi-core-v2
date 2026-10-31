"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FieldError } from "@/components/common/states";
import { FormMessage, SubmitButton } from "@/components/common/form-controls";
import { initialActionState, type ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };
type RoleOption = { id: string; name: string; positions: { id: string; name: string }[] };

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  members: Option[];
  roles: RoleOption[];
  periods: Option[];
  defaults: { memberId?: string; roleId?: string; positionId?: string; periodId?: string };
  mode: "create" | "edit";
};

const pillClass =
  "h-11 w-full appearance-none rounded-xl border-2 border-pmk-tint-border bg-pmk-tint px-6 text-base font-medium text-pmk-ink focus-visible:border-pmk-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pmk-accent/20 aria-invalid:border-destructive sm:text-sm";

export function AssignmentForm({ action, members, roles, periods, defaults, mode }: Props) {
  const [roleId, setRoleId] = useState(defaults.roleId ?? "");
  const [positionId, setPositionId] = useState(defaults.positionId ?? "");
  const [state, formAction] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok && mode === "create") {
      // Keep member and period for quick consecutive entries; reset role/position.
      setRoleId("");
      setPositionId("");
    }
    return result;
  }, initialActionState);
  const router = useRouter();
  const positions = roles.find((r) => r.id === roleId)?.positions ?? [];
  const errors = state.ok ? undefined : state.fieldErrors;

  useEffect(() => {
    if (!state.ok) return;
    toast.success(state.message ?? "Saved.");
    if (mode === "edit") router.push("/assignments");
    router.refresh();
  }, [state, mode, router]);

  const a11y = (name: string) => ({
    id: `field-${name}`,
    name,
    "aria-invalid": errors?.[name]?.length ? true : undefined,
    "aria-describedby": errors?.[name]?.length ? `field-${name}-error` : undefined,
  });

  return (
    <form action={formAction} className="space-y-3" noValidate>
      <FormMessage state={state} />
      <div>
        <label htmlFor="field-memberId" className="sr-only">
          Member
        </label>
        <select {...a11y("memberId")} defaultValue={defaults.memberId ?? ""} className={pillClass} required>
          <option value="" disabled>
            ＋ Assign Member
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <FieldError id="field-memberId-error" messages={errors?.memberId} />
      </div>
      <div>
        <label htmlFor="field-roleId" className="sr-only">
          Role
        </label>
        <select
          {...a11y("roleId")}
          value={roleId}
          onChange={(e) => {
            setRoleId(e.target.value);
            setPositionId("");
          }}
          className={pillClass}
          required
        >
          <option value="" disabled>
            ＋ Role
          </option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <FieldError id="field-roleId-error" messages={errors?.roleId} />
      </div>
      <div>
        <label htmlFor="field-positionId" className="sr-only">
          Position
        </label>
        <select
          {...a11y("positionId")}
          value={positionId}
          onChange={(e) => setPositionId(e.target.value)}
          className={cn(pillClass, !roleId && "opacity-60")}
          disabled={!roleId}
          required
        >
          <option value="" disabled>
            {roleId ? "＋ Position" : "＋ Position (choose a role first)"}
          </option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="__new">New position…</option>
        </select>
        <FieldError id="field-positionId-error" messages={errors?.positionId} />
        {positionId === "__new" ? (
          <div className="mt-2">
            <label htmlFor="field-newPositionName" className="mb-1 block text-sm font-semibold text-pmk-ink">
              New position name
            </label>
            <input
              {...a11y("newPositionName")}
              placeholder="e.g. Kepala Departemen Musik"
              className={pillClass}
              maxLength={80}
              autoFocus
            />
            <FieldError id="field-newPositionName-error" messages={errors?.newPositionName} />
          </div>
        ) : null}
      </div>
      <div>
        <label htmlFor="field-periodId" className="sr-only">
          Period
        </label>
        <select {...a11y("periodId")} defaultValue={defaults.periodId ?? ""} className={pillClass} required>
          <option value="" disabled>
            ＋ Period
          </option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <FieldError id="field-periodId-error" messages={errors?.periodId} />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <SubmitButton className="bg-pmk-brown px-9">Save</SubmitButton>
        {mode === "edit" ? (
          <Link
            href="/assignments"
            className="inline-flex min-h-11 items-center px-4 text-sm font-medium text-pmk-body hover:text-pmk-ink"
          >
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}

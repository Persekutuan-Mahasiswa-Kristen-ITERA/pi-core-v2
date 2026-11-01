"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FieldError } from "@/components/common/states";
import { FormMessage, SubmitButton } from "@/components/common/form-controls";
import { initialActionState, type ActionResult } from "@/lib/action-result";
import type { OrgUnitType } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };
/** `group` = the top-level unit (BPH, a department with its divisions, the bureau). */
export type UnitOption = { id: string; label: string; type: OrgUnitType; group: string; isActive: boolean };
export type PositionOption = { id: string; name: string; unitType: OrgUnitType };

type Props = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  members: Option[];
  units: UnitOption[];
  positions: PositionOption[];
  periods: Option[];
  defaults: { memberId?: string; orgUnitId?: string; positionId?: string; periodId?: string };
  mode: "create" | "edit";
};

const pillClass =
  "h-11 w-full appearance-none rounded-xl border-2 border-pmk-tint-border bg-pmk-tint px-6 text-base font-medium text-pmk-ink focus-visible:border-pmk-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-pmk-accent/20 aria-invalid:border-destructive sm:text-sm";

/** Keeps tree order; one group per top-level unit. */
function groupUnits(units: UnitOption[]) {
  const groups = new Map<string, UnitOption[]>();
  for (const u of units) groups.set(u.group, [...(groups.get(u.group) ?? []), u]);
  return [...groups.entries()];
}

export function AssignmentForm({ action, members, units, positions, periods, defaults, mode }: Props) {
  const [unitId, setUnitId] = useState(defaults.orgUnitId ?? "");
  const [positionId, setPositionId] = useState(defaults.positionId ?? "");
  const [state, formAction] = useActionState(async (prev: ActionResult, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok && mode === "create") {
      // Keep member and period for quick consecutive entries; reset unit/position.
      setUnitId("");
      setPositionId("");
    }
    return result;
  }, initialActionState);
  const router = useRouter();
  const unitType = units.find((u) => u.id === unitId)?.type;
  const unitPositions = unitType ? positions.filter((p) => p.unitType === unitType) : [];
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
        <label htmlFor="field-orgUnitId" className="sr-only">
          Unit
        </label>
        <select
          {...a11y("orgUnitId")}
          value={unitId}
          onChange={(e) => {
            setUnitId(e.target.value);
            setPositionId("");
          }}
          className={pillClass}
          required
        >
          <option value="" disabled>
            ＋ Unit
          </option>
          {groupUnits(units).map(([group, list]) => (
            <optgroup key={group} label={group}>
              {list.map((u) => (
                // Inactive units stay selectable only when this assignment already uses one.
                <option key={u.id} value={u.id} disabled={!u.isActive && u.id !== defaults.orgUnitId}>
                  {u.label}
                  {u.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <FieldError id="field-orgUnitId-error" messages={errors?.orgUnitId} />
      </div>
      <div>
        <label htmlFor="field-positionId" className="sr-only">
          Position
        </label>
        <select
          {...a11y("positionId")}
          value={positionId}
          onChange={(e) => setPositionId(e.target.value)}
          className={cn(pillClass, !unitId && "opacity-60")}
          disabled={!unitId}
          required
        >
          <option value="" disabled>
            {unitId ? "＋ Position" : "＋ Position (choose a unit first)"}
          </option>
          {unitPositions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <FieldError id="field-positionId-error" messages={errors?.positionId} />
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

"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, InfoIcon } from "@/components/icons";
import { FieldError } from "@/components/common/field-error";
import { FormMessage, InfoBanner, SubmitButton, cancelLinkClass, selectClass } from "@/components/common/form-controls";
import { useDict, useTranslateMessage } from "@/lib/i18n/client";
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

const labelClass = "mb-1.5 block text-sm font-semibold text-pmk-ink";

/** Keeps tree order; one group per top-level unit. */
function groupUnits(units: UnitOption[]) {
  const groups = new Map<string, UnitOption[]>();
  for (const u of units) groups.set(u.group, [...(groups.get(u.group) ?? []), u]);
  return [...groups.entries()];
}

export function AssignmentForm({ action, members, units, positions, periods, defaults, mode }: Props) {
  const d = useDict();
  const t = d.assignments;
  const tr = useTranslateMessage();
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
    toast.success(tr(state.message ?? "Saved."));
    if (mode === "edit") router.push("/assignments");
    router.refresh();
    // `tr` only changes with the language; a language switch must not replay the toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, mode, router]);

  const a11y = (name: string) => ({
    id: `field-${name}`,
    name,
    "aria-invalid": errors?.[name]?.length ? true : undefined,
    "aria-describedby": errors?.[name]?.length ? `field-${name}-error` : undefined,
  });

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="empty:hidden sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <div>
        <label htmlFor="field-memberId" className={labelClass}>
          {t.member}
        </label>
        <select {...a11y("memberId")} defaultValue={defaults.memberId ?? ""} className={selectClass} required>
          <option value="" disabled>
            {t.chooseMember}
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
        <label htmlFor="field-orgUnitId" className={labelClass}>
          {t.unit}
        </label>
        <select
          {...a11y("orgUnitId")}
          value={unitId}
          onChange={(e) => {
            setUnitId(e.target.value);
            setPositionId("");
          }}
          className={selectClass}
          required
        >
          <option value="" disabled>
            {t.chooseUnit}
          </option>
          {groupUnits(units).map(([group, list]) => (
            <optgroup key={group} label={group}>
              {list.map((u) => (
                // Inactive units stay selectable only when this assignment already uses one.
                <option key={u.id} value={u.id} disabled={!u.isActive && u.id !== defaults.orgUnitId}>
                  {u.label}
                  {u.isActive ? "" : t.inactiveSuffix}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <FieldError id="field-orgUnitId-error" messages={errors?.orgUnitId} />
      </div>
      <div>
        <label htmlFor="field-positionId" className={labelClass}>
          {t.position}
        </label>
        <select
          {...a11y("positionId")}
          value={positionId}
          onChange={(e) => setPositionId(e.target.value)}
          className={cn(selectClass, !unitId && "text-pmk-muted")}
          disabled={!unitId}
          required
        >
          <option value="" disabled>
            {unitId ? t.choosePosition : t.chooseUnitFirst}
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
        <label htmlFor="field-periodId" className={labelClass}>
          {t.period}
        </label>
        <select {...a11y("periodId")} defaultValue={defaults.periodId ?? ""} className={selectClass} required>
          <option value="" disabled>
            {t.choosePeriod}
          </option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <FieldError id="field-periodId-error" messages={errors?.periodId} />
      </div>
      <InfoBanner icon={<InfoIcon />} className="sm:col-span-2">
        {t.formHint}
      </InfoBanner>
      <div className="flex flex-wrap items-center gap-3 pt-1 sm:col-span-2">
        <SubmitButton className="px-8">
          <CheckIcon aria-hidden /> {d.common.save}
        </SubmitButton>
        {mode === "edit" ? (
          <Link href="/assignments" className={cancelLinkClass}>
            {d.common.cancel}
          </Link>
        ) : null}
      </div>
    </form>
  );
}

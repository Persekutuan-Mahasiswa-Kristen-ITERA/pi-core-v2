import "server-only";
import type { FlatUnit } from "@/lib/org-structure";
import { listActiveMembersForPicker, listOrgUnits, listPeriods, listPositions } from "@/lib/queries";
import type { PositionOption, UnitOption } from "./assignment-form";

/** Units below the root (which holds no positions), each tagged with its top-level unit. */
function toUnitOptions(units: FlatUnit[]): UnitOption[] {
  let group = "";
  const out: UnitOption[] = [];
  for (const u of units) {
    if (u.type === "organization") continue;
    if (u.depth <= 1) group = u.name;
    out.push({ id: u.id, label: u.name, type: u.type, group, isActive: u.is_active });
  }
  return out;
}

/** Everything the assignment form needs, shaped for its selects. Shared by create and edit. */
export async function getAssignmentFormOptions() {
  const [members, units, positions, periods] = await Promise.all([
    listActiveMembersForPicker(),
    listOrgUnits(),
    listPositions(),
    listPeriods(),
  ]);
  return {
    members: members.map((m) => ({ id: m.id, label: `${m.full_name} · ${m.email}` })),
    units: toUnitOptions(units),
    positions: positions.map<PositionOption>((p) => ({ id: p.id, name: p.name, unitType: p.unitType })),
    periods: periods.map((p) => ({ id: p.id, label: p.is_active ? `${p.label} (active)` : p.label })),
    activePeriodId: periods.find((p) => p.is_active)?.id,
  };
}

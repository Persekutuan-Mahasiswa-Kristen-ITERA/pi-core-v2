import type { OrgUnitType } from "@/lib/supabase/types";

/** Pure helpers for the organization tree. No I/O, so they are unit-tested directly. */

export type UnitRow = {
  id: string;
  parent_id: string | null;
  type: OrgUnitType;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type FlatUnit = UnitRow & { depth: number; parentName: string | null; order: number };

export const UNIT_TYPE_LABEL: Record<OrgUnitType, string> = {
  organization: "Organization",
  bph: "BPH",
  department: "Department",
  bureau: "Bureau",
  division: "Division",
};

/** Which child types each unit type may have (mirrors private.org_unit_check_parent()). */
export const CHILD_TYPES: Record<OrgUnitType, OrgUnitType[]> = {
  organization: ["bph", "department", "bureau"],
  department: ["division"],
  bph: [],
  bureau: [],
  division: [],
};

const byOrder = (a: UnitRow, b: UnitRow) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);

/**
 * Depth-first walk from the root(s), children in sort order. `order` is the row's position in the
 * walk, used to sort assignments by structure. Units whose parent is missing are appended at the end
 * so nothing silently disappears.
 */
export function flattenUnitTree(units: readonly UnitRow[]): FlatUnit[] {
  const children = new Map<string | null, UnitRow[]>();
  const ids = new Set(units.map((u) => u.id));
  for (const unit of units) {
    const key = unit.parent_id && ids.has(unit.parent_id) ? unit.parent_id : null;
    const list = children.get(key) ?? [];
    list.push(unit);
    children.set(key, list);
  }
  const out: FlatUnit[] = [];
  const names = new Map(units.map((u) => [u.id, u.name]));
  const visit = (parentId: string | null, depth: number) => {
    for (const unit of (children.get(parentId) ?? []).sort(byOrder)) {
      out.push({
        ...unit,
        depth,
        parentName: unit.parent_id ? (names.get(unit.parent_id) ?? null) : null,
        order: out.length,
      });
      visit(unit.id, depth + 1);
    }
  };
  visit(null, 0);
  return out;
}

/** "Musik · Departemen Pelayanan Khusus" for divisions (names repeat across departments); else the name. */
export function unitLabel(unit: Pick<FlatUnit, "type" | "name" | "parentName">): string {
  return unit.type === "division" && unit.parentName ? `${unit.name} · ${unit.parentName}` : unit.name;
}

export type SeatPosition = {
  id: string;
  name: string;
  unit_type: OrgUnitType;
  rank: number;
  is_unique_per_unit: boolean;
};
export type SeatAssignment = { org_unit_id: string; position_id: string; holder: string };
export type Seat = { unitId: string; unitName: string; position: string; rank: number; holder: string | null };
export type CoverageGroup = {
  id: string;
  name: string;
  type: OrgUnitType;
  seats: Seat[];
  filled: number;
  staff: number;
};

/**
 * Leadership seats per top-level unit (BPH, each department with its divisions, each bureau) for one
 * period. A seat is a "one per unit" position in an active unit of its kind; it is filled when the
 * period has an assignment to it. Other assignments (staff) are counted, not listed.
 */
export function buildCoverage(
  units: readonly FlatUnit[],
  positions: readonly SeatPosition[],
  assignments: readonly SeatAssignment[],
): CoverageGroup[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const topOf = (unit: FlatUnit): FlatUnit => {
    let current = unit;
    while (current.parent_id) {
      const parent = byId.get(current.parent_id);
      if (!parent || parent.type === "organization") break;
      current = parent;
    }
    return current;
  };
  const holders = new Map<string, string>();
  const staffByUnit = new Map<string, number>();
  const unique = new Set(positions.filter((p) => p.is_unique_per_unit).map((p) => p.id));
  for (const a of assignments) {
    if (unique.has(a.position_id)) holders.set(`${a.org_unit_id}:${a.position_id}`, a.holder);
    else staffByUnit.set(a.org_unit_id, (staffByUnit.get(a.org_unit_id) ?? 0) + 1);
  }

  const groups = new Map<string, CoverageGroup>();
  for (const unit of units) {
    if (unit.type === "organization" || !unit.is_active) continue;
    const top = topOf(unit);
    if (!top.is_active) continue;
    let group = groups.get(top.id);
    if (!group) {
      group = { id: top.id, name: top.name, type: top.type, seats: [], filled: 0, staff: 0 };
      groups.set(top.id, group);
    }
    group.staff += staffByUnit.get(unit.id) ?? 0;
    for (const p of positions) {
      if (!p.is_unique_per_unit || p.unit_type !== unit.type) continue;
      const holder = holders.get(`${unit.id}:${p.id}`) ?? null;
      group.seats.push({ unitId: unit.id, unitName: unit.name, position: p.name, rank: p.rank, holder });
      if (holder) group.filled += 1;
    }
  }
  const order = new Map(units.map((u) => [u.id, u.order]));
  return [...groups.values()]
    .map((g) => ({
      ...g,
      seats: g.seats.sort((a, b) => (order.get(a.unitId) ?? 0) - (order.get(b.unitId) ?? 0) || a.rank - b.rank),
    }))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

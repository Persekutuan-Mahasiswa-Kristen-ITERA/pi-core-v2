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

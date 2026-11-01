import { describe, expect, it } from "vitest";
import { CHILD_TYPES, flattenUnitTree, unitLabel, type UnitRow } from "@/lib/org-structure";

const unit = (
  id: string,
  parent_id: string | null,
  type: UnitRow["type"],
  name: string,
  sort_order = 100,
): UnitRow => ({
  id,
  parent_id,
  type,
  name,
  sort_order,
  is_active: true,
});

const UNITS: UnitRow[] = [
  unit("d2", "root", "department", "Departemen CMIT", 70),
  unit("div-it", "d2", "division", "IT", 30),
  unit("root", null, "organization", "PMK ITERA", 0),
  unit("bph", "root", "bph", "BPH PMK ITERA", 10),
  unit("div-pubdok", "d2", "division", "Pubdok", 10),
  unit("d1", "root", "department", "Departemen Pelayanan Khusus", 40),
  unit("div-musik", "d1", "division", "Musik", 30),
];

describe("flattenUnitTree", () => {
  it("walks depth-first with children in sort order", () => {
    expect(flattenUnitTree(UNITS).map((u) => [u.name, u.depth])).toEqual([
      ["PMK ITERA", 0],
      ["BPH PMK ITERA", 1],
      ["Departemen Pelayanan Khusus", 1],
      ["Musik", 2],
      ["Departemen CMIT", 1],
      ["Pubdok", 2],
      ["IT", 2],
    ]);
  });

  it("numbers rows in walk order and records the parent name", () => {
    const flat = flattenUnitTree(UNITS);
    expect(flat.map((u) => u.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(flat.find((u) => u.id === "div-it")?.parentName).toBe("Departemen CMIT");
  });

  it("keeps units whose parent is missing instead of dropping them", () => {
    const flat = flattenUnitTree([...UNITS, unit("orphan", "gone", "division", "Orphan")]);
    expect(flat.some((u) => u.id === "orphan")).toBe(true);
  });
});

describe("unitLabel", () => {
  it("adds the department to division names, which repeat across departments", () => {
    const flat = flattenUnitTree(UNITS);
    expect(unitLabel(flat.find((u) => u.id === "div-musik")!)).toBe("Musik · Departemen Pelayanan Khusus");
    expect(unitLabel(flat.find((u) => u.id === "bph")!)).toBe("BPH PMK ITERA");
  });
});

describe("CHILD_TYPES mirrors the database tree rule", () => {
  it("allows divisions only under departments", () => {
    expect(CHILD_TYPES.department).toEqual(["division"]);
    expect(CHILD_TYPES.organization).not.toContain("division");
    expect(CHILD_TYPES.bureau).toEqual([]);
  });
});

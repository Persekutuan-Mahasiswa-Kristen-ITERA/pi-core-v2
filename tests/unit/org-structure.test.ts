import { describe, expect, it } from "vitest";
import {
  CHILD_TYPES,
  buildCoverage,
  flattenUnitTree,
  unitLabel,
  type SeatPosition,
  type UnitRow,
} from "@/lib/org-structure";

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

describe("buildCoverage", () => {
  const POSITIONS: SeatPosition[] = [
    { id: "ketum", name: "Ketua Umum", unit_type: "bph", rank: 10, is_unique_per_unit: true },
    { id: "kadep", name: "Kepala Departemen", unit_type: "department", rank: 40, is_unique_per_unit: true },
    { id: "sekdep", name: "Sekretaris Departemen", unit_type: "department", rank: 50, is_unique_per_unit: true },
    { id: "kadiv", name: "Kepala Divisi", unit_type: "division", rank: 60, is_unique_per_unit: true },
    { id: "staff", name: "Staff", unit_type: "division", rank: 70, is_unique_per_unit: false },
  ];
  const units = flattenUnitTree(UNITS);

  it("counts one seat per one-holder position per active unit, grouped by top-level unit", () => {
    const groups = buildCoverage(units, POSITIONS, [
      { org_unit_id: "d1", position_id: "kadep", holder: "Yohanes" },
      { org_unit_id: "div-musik", position_id: "staff", holder: "Maria" },
      { org_unit_id: "div-musik", position_id: "staff", holder: "Ruth" },
    ]);
    expect(groups.map((g) => g.name)).toEqual(["BPH PMK ITERA", "Departemen Pelayanan Khusus", "Departemen CMIT"]);
    const [bph, pk, cmit] = groups;
    expect(bph.seats).toHaveLength(1);
    expect(bph.filled).toBe(0);
    // Kepala + Sekretaris Departemen, plus Kepala Divisi Musik
    expect(pk.seats.map((s) => `${s.position}@${s.unitName}`)).toEqual([
      "Kepala Departemen@Departemen Pelayanan Khusus",
      "Sekretaris Departemen@Departemen Pelayanan Khusus",
      "Kepala Divisi@Musik",
    ]);
    expect(pk.filled).toBe(1);
    expect(pk.seats[0].holder).toBe("Yohanes");
    expect(pk.staff).toBe(2);
    // Two divisions under CMIT: 2 department seats + 2 division heads, in tree order (Pubdok before IT)
    expect(cmit.seats.map((s) => s.unitName)).toEqual(["Departemen CMIT", "Departemen CMIT", "Pubdok", "IT"]);
  });

  it("leaves out inactive units and everything under an inactive top-level unit", () => {
    const withInactive = flattenUnitTree(
      UNITS.map((u) => (u.id === "d2" || u.id === "div-musik" ? { ...u, is_active: false } : u)),
    );
    const groups = buildCoverage(withInactive, POSITIONS, []);
    expect(groups.map((g) => g.name)).toEqual(["BPH PMK ITERA", "Departemen Pelayanan Khusus"]);
    expect(groups[1].seats.map((s) => s.position)).toEqual(["Kepala Departemen", "Sekretaris Departemen"]);
  });
});

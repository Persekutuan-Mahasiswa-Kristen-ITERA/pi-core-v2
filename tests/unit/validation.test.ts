import { describe, expect, it } from "vitest";
import {
  assignmentSchema,
  memberSchema,
  orgUnitCreateSchema,
  parseIdList,
  passwordChangeSchema,
  periodSchema,
  positionCreateSchema,
  positionSchema,
  roleSchema,
} from "@/lib/validation";

const uuid = "4f1c2a3b-5d6e-4f70-8a9b-0c1d2e3f4a5b";

describe("memberSchema", () => {
  const base = { fullName: "  Maria Contoh ", email: " Maria@Example.COM ", nim: "", phone: "", accessLevel: "member" };

  it("normalizes email and trims names; empty optionals become null", () => {
    const r = memberSchema.parse(base);
    expect(r).toEqual({
      fullName: "Maria Contoh",
      email: "maria@example.com",
      nim: null,
      phone: null,
      accessLevel: "member",
    });
  });

  it("rejects bad email, NIM and phone", () => {
    expect(memberSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
    expect(memberSchema.safeParse({ ...base, nim: "12AB" }).success).toBe(false);
    expect(memberSchema.safeParse({ ...base, phone: "12" }).success).toBe(false);
  });

  it("accepts formatted phone numbers and strips separators", () => {
    expect(memberSchema.parse({ ...base, phone: "+62 812-3456-7890" }).phone).toBe("+6281234567890");
  });

  it("only allows the three access levels; an absent field means 'keep / member'", () => {
    expect(memberSchema.safeParse({ ...base, accessLevel: "owner" }).success).toBe(false);
    expect(memberSchema.parse({ ...base, accessLevel: "super_admin" }).accessLevel).toBe("super_admin");
    expect(memberSchema.parse({ ...base, accessLevel: "" }).accessLevel).toBeNull();
  });

  it("drops unknown fields (no mass assignment)", () => {
    const r = memberSchema.parse({ ...base, is_active: false, user_id: uuid });
    expect(r).not.toHaveProperty("is_active");
    expect(r).not.toHaveProperty("user_id");
  });
});

describe("periodSchema", () => {
  it("accepts consecutive academic years", () => {
    expect(periodSchema.safeParse({ label: "2026/2027", startsOn: "", endsOn: "" }).success).toBe(true);
  });
  it.each(["2026/2028", "2026-2027", "26/27", "2027/2026"])("rejects %s", (label) => {
    expect(periodSchema.safeParse({ label, startsOn: "", endsOn: "" }).success).toBe(false);
  });
  it("requires end after start", () => {
    const r = periodSchema.safeParse({ label: "2026/2027", startsOn: "2027-01-01", endsOn: "2026-01-01" });
    expect(r.success).toBe(false);
  });
});

describe("roleSchema", () => {
  it("requires a 2–60 character name", () => {
    expect(roleSchema.safeParse({ name: "B", description: "", grantsAdmin: "" }).success).toBe(false);
    expect(roleSchema.parse({ name: " BPH ", description: "", grantsAdmin: "" })).toEqual({
      name: "BPH",
      description: null,
      grantsAdmin: false,
    });
  });
  it("reads the admin checkbox", () => {
    expect(roleSchema.parse({ name: "Org Admin", description: "", grantsAdmin: "on" }).grantsAdmin).toBe(true);
  });
});

describe("assignmentSchema", () => {
  const base = { memberId: uuid, orgUnitId: uuid, positionId: uuid, periodId: uuid };
  it("needs a member, unit, position and period", () => {
    expect(assignmentSchema.safeParse(base).success).toBe(true);
    for (const key of Object.keys(base)) {
      expect(assignmentSchema.safeParse({ ...base, [key]: "" }).success).toBe(false);
    }
  });
  it("rejects non-uuid ids", () => {
    expect(assignmentSchema.safeParse({ ...base, memberId: "1 or 1=1" }).success).toBe(false);
  });
});

describe("structure schemas", () => {
  it("parses a new unit and defaults the sort order", () => {
    expect(orgUnitCreateSchema.parse({ parentId: uuid, type: "division", name: " Musik ", sortOrder: "" })).toEqual({
      parentId: uuid,
      type: "division",
      name: "Musik",
      sortOrder: 100,
    });
  });
  it("never accepts a second organization root", () => {
    expect(
      orgUnitCreateSchema.safeParse({ parentId: uuid, type: "organization", name: "X", sortOrder: "" }).success,
    ).toBe(false);
  });
  it("parses a position with rank and the one-per-unit checkbox", () => {
    expect(
      positionCreateSchema.parse({ name: "Kepala Divisi", unitType: "division", rank: "60", isUniquePerUnit: "on" }),
    ).toEqual({ name: "Kepala Divisi", unitType: "division", rank: 60, isUniquePerUnit: true });
    expect(
      positionCreateSchema.safeParse({ name: "X Y", unitType: "organization", rank: "1", isUniquePerUnit: "" }).success,
    ).toBe(false);
    expect(positionSchema.safeParse({ name: "Staff", rank: "0", isUniquePerUnit: "" }).success).toBe(false);
    expect(positionSchema.safeParse({ name: "Staff", rank: "abc", isUniquePerUnit: "" }).success).toBe(false);
  });
  it("reads checkbox groups of ids and rejects anything else", () => {
    const fd = new FormData();
    fd.append("roleIds", uuid);
    fd.append("roleIds", "");
    expect(parseIdList(fd, "roleIds")).toEqual([uuid]);
    fd.append("roleIds", "not-an-id");
    expect(() => parseIdList(fd, "roleIds")).toThrow();
  });
});

describe("passwordChangeSchema", () => {
  const ok = { currentPassword: "Temp1234abcd", newPassword: "newpass123", confirmPassword: "newpass123" };
  it("accepts a valid change", () => expect(passwordChangeSchema.safeParse(ok).success).toBe(true));
  it("enforces length, letter and digit", () => {
    for (const pw of ["short1", "allletters", "12345678"]) {
      expect(passwordChangeSchema.safeParse({ ...ok, newPassword: pw, confirmPassword: pw }).success).toBe(false);
    }
  });
  it("requires matching confirmation and a different password", () => {
    expect(passwordChangeSchema.safeParse({ ...ok, confirmPassword: "other123" }).success).toBe(false);
    expect(
      passwordChangeSchema.safeParse({ ...ok, newPassword: ok.currentPassword, confirmPassword: ok.currentPassword })
        .success,
    ).toBe(false);
  });
});

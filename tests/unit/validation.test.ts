import { describe, expect, it } from "vitest";
import { assignmentSchema, memberSchema, passwordChangeSchema, periodSchema, roleSchema } from "@/lib/validation";

const uuid = "4f1c2a3b-5d6e-4f70-8a9b-0c1d2e3f4a5b";

describe("memberSchema", () => {
  const base = { fullName: "  Maria Contoh ", email: " Maria@Example.COM ", nim: "", phone: "", accessLevel: "member" };

  it("normalizes email and trims names; empty optionals become null", () => {
    const r = memberSchema.parse(base);
    expect(r).toEqual({ fullName: "Maria Contoh", email: "maria@example.com", nim: null, phone: null, accessLevel: "member" });
  });

  it("rejects bad email, NIM and phone", () => {
    expect(memberSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
    expect(memberSchema.safeParse({ ...base, nim: "12AB" }).success).toBe(false);
    expect(memberSchema.safeParse({ ...base, phone: "12" }).success).toBe(false);
  });

  it("accepts formatted phone numbers and strips separators", () => {
    expect(memberSchema.parse({ ...base, phone: "+62 812-3456-7890" }).phone).toBe("+6281234567890");
  });

  it("only allows the two access levels (no client-chosen superuser flags)", () => {
    expect(memberSchema.safeParse({ ...base, accessLevel: "owner" }).success).toBe(false);
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
    expect(roleSchema.safeParse({ name: "B", description: "" }).success).toBe(false);
    expect(roleSchema.parse({ name: " BPH ", description: "" })).toEqual({ name: "BPH", description: null });
  });
});

describe("assignmentSchema", () => {
  const base = { memberId: uuid, roleId: uuid, periodId: uuid, positionId: "", newPositionName: "" };
  it("needs exactly one of an existing position or a new position name", () => {
    expect(assignmentSchema.safeParse(base).success).toBe(false);
    expect(assignmentSchema.safeParse({ ...base, positionId: uuid }).success).toBe(true);
    expect(assignmentSchema.safeParse({ ...base, positionId: "__new", newPositionName: "Ketua" }).success).toBe(true);
    expect(assignmentSchema.safeParse({ ...base, positionId: uuid, newPositionName: "Ketua" }).success).toBe(false);
  });
  it("rejects non-uuid ids", () => {
    expect(assignmentSchema.safeParse({ ...base, memberId: "1 or 1=1", positionId: uuid }).success).toBe(false);
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
    expect(passwordChangeSchema.safeParse({ ...ok, newPassword: ok.currentPassword, confirmPassword: ok.currentPassword }).success).toBe(false);
  });
});

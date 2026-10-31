import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { escapeLike, sanitizeSearchTerm } from "@/lib/search";
import { generateTemporaryPassword } from "@/lib/password";
import { describeDbError } from "@/lib/db-errors";
import { isActivePath, titleForPath } from "@/components/shell/nav-config";

describe("safeRedirectPath (open redirect protection)", () => {
  it.each([
    ["/members?role=x", "/members?role=x"],
    ["/roles/abc#top", "/roles/abc#top"],
  ])("keeps same-origin path %s", (input, expected) => expect(safeRedirectPath(input)).toBe(expected));

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "members",
    "/login",
    "/\t/evil.example",
    "",
    null,
    undefined,
  ])("rejects %s", (input) => expect(safeRedirectPath(input as string)).toBe("/"));
});

describe("sanitizeSearchTerm", () => {
  it("removes PostgREST filter syntax and LIKE wildcards", () => {
    expect(sanitizeSearchTerm("maria,email.eq.x)")).toBe("maria email.eq.x");
    expect(sanitizeSearchTerm("a%_b*c")).toBe("a b c");
    expect(sanitizeSearchTerm("   ")).toBe("");
  });
  it("caps length", () => expect(sanitizeSearchTerm("x".repeat(200))).toHaveLength(64));
  it("escapes LIKE wildcards for exact matching", () => expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\"));
});

describe("generateTemporaryPassword", () => {
  it("meets the password policy and is not repeated", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const pw = generateTemporaryPassword();
      expect(pw).toHaveLength(14);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).not.toMatch(/[0O1lI]/);
      seen.add(pw);
    }
    expect(seen.size).toBe(200);
  });
  it("refuses short lengths", () => expect(() => generateTemporaryPassword(6)).toThrow());
});

describe("describeDbError", () => {
  it("maps unique violations by constraint name", () => {
    expect(describeDbError({ code: "23505", message: 'duplicate key value violates unique constraint "members_email_key"' }, { members_email_key: "Email taken" })).toBe("Email taken");
  });
  it("maps the last-admin guard and hides unknown errors", () => {
    expect(describeDbError({ code: "P0001", hint: "last_admin" })).toMatch(/at least one active admin/);
    expect(describeDbError({ code: "XX000", message: "internal detail" })).not.toMatch(/internal detail/);
  });
});

describe("navigation", () => {
  it("titles and active state", () => {
    expect(titleForPath("/members/123")).toBe("Members");
    expect(titleForPath("/")).toBe("Dashboard");
    expect(isActivePath("/roles/1", ["/members", "/roles", "/periods"])).toBe(true);
    expect(isActivePath("/profile", ["/"])).toBe(false);
  });
});

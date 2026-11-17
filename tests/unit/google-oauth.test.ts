import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  authorizeUrl,
  decodeAttempt,
  emailFromClaims,
  encodeAttempt,
  newAttempt,
  stateMatches,
} from "@/lib/google-oauth";
import { isGoogleLoginError } from "@/lib/google-sign-in";

describe("Google sign-in attempt cookie", () => {
  it("round-trips and rejects junk", () => {
    const a = newAttempt("/members");
    expect(decodeAttempt(encodeAttempt(a))).toEqual(a);
    expect(decodeAttempt(undefined)).toBeNull();
    expect(decodeAttempt("not-base64-json")).toBeNull();
    expect(decodeAttempt(Buffer.from(JSON.stringify({ state: "x" })).toString("base64url"))).toBeNull();
  });

  it("makes fresh random values every time", () => {
    const a = newAttempt("/");
    const b = newAttempt("/");
    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.verifier.length).toBeGreaterThanOrEqual(43); // PKCE minimum
  });
});

describe("stateMatches", () => {
  it("compares exactly", () => {
    expect(stateMatches("abc", "abc")).toBe(true);
    expect(stateMatches("abc", "abd")).toBe(false);
    expect(stateMatches("abc", "abcd")).toBe(false);
    expect(stateMatches("abc", null)).toBe(false);
  });
});

describe("authorizeUrl", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "client-123.apps.googleusercontent.com";
  });
  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
  });

  it("asks Google for an OIDC code with PKCE S256, state and nonce", () => {
    const a = newAttempt("/");
    const u = new URL(authorizeUrl(a, "https://core.pmkitera.web.id/auth/google/callback"));
    expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(u.searchParams.get("client_id")).toBe("client-123.apps.googleusercontent.com");
    expect(u.searchParams.get("redirect_uri")).toBe("https://core.pmkitera.web.id/auth/google/callback");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("scope")).toBe("openid email profile");
    expect(u.searchParams.get("state")).toBe(a.state);
    expect(u.searchParams.get("nonce")).toBe(a.nonce);
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("code_challenge")).toBe(createHash("sha256").update(a.verifier).digest("base64url"));
  });
});

describe("emailFromClaims (after signature, issuer, audience and expiry are verified)", () => {
  const ok = { nonce: "n-1", email: "Febrian.124140031@Student.ITERA.ac.id", email_verified: true };

  it("returns the lower-cased verified email", () => {
    expect(emailFromClaims(ok, "n-1")).toBe("febrian.124140031@student.itera.ac.id");
    expect(emailFromClaims({ ...ok, email_verified: "true" }, "n-1")).toBe("febrian.124140031@student.itera.ac.id");
  });

  it("rejects a wrong or missing nonce (replayed token)", () => {
    expect(() => emailFromClaims(ok, "n-2")).toThrow(/nonce/);
    expect(() => emailFromClaims({ ...ok, nonce: undefined }, "n-1")).toThrow(/nonce/);
  });

  it("rejects an email Google has not verified", () => {
    expect(() => emailFromClaims({ ...ok, email_verified: false }, "n-1")).toThrow(/verified/);
    expect(() => emailFromClaims({ ...ok, email_verified: undefined }, "n-1")).toThrow(/verified/);
  });

  it("rejects a token without an email", () => {
    expect(() => emailFromClaims({ ...ok, email: undefined }, "n-1")).toThrow(/email/);
  });
});

describe("isGoogleLoginError", () => {
  it("accepts only the two known keys", () => {
    expect(isGoogleLoginError("googleNotRegistered")).toBe(true);
    expect(isGoogleLoginError("googleFailed")).toBe(true);
    expect(isGoogleLoginError("generic")).toBe(false);
    expect(isGoogleLoginError(undefined)).toBe(false);
  });
});

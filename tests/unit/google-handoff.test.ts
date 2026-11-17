import { afterEach, describe, expect, it } from "vitest";
import { handoffTarget, handoffUrl, validHandoff } from "@/lib/google-handoff";
import { decodeAttempt, encodeAttempt, newAttempt } from "@/lib/google-oauth";

const H = "a".repeat(43);

describe("handoffTarget", () => {
  afterEach(() => {
    delete process.env.GOOGLE_HANDOFF_DEV_APPS;
  });

  it("knows pmk-form and nothing else", () => {
    expect(handoffTarget("form")).toBe("https://form.pmkitera.web.id/auth/google/finish");
    expect(handoffTarget("evil")).toBeNull();
    expect(handoffTarget("constructor")).toBeNull();
    expect(handoffTarget("__proto__")).toBeNull();
    expect(handoffTarget(null)).toBeNull();
    expect(handoffTarget("")).toBeNull();
  });

  it("uses the dev list outside production only", () => {
    process.env.GOOGLE_HANDOFF_DEV_APPS = JSON.stringify({ form: "http://localhost:3000/auth/google/finish" });
    expect(handoffTarget("form")).toBe("http://localhost:3000/auth/google/finish");
  });
});

describe("validHandoff", () => {
  it("accepts 43 base64url characters only", () => {
    expect(validHandoff(H)).toBe(true);
    expect(validHandoff("A-_" + "b".repeat(40))).toBe(true);
    expect(validHandoff("a".repeat(42))).toBe(false);
    expect(validHandoff("a".repeat(44))).toBe(false);
    expect(validHandoff("a".repeat(42) + "/")).toBe(false);
    expect(validHandoff(null)).toBe(false);
  });
});

describe("handoffUrl", () => {
  const target = "https://form.pmkitera.web.id/auth/google/finish";

  it("carries the token and the app's handoff value", () => {
    const u = new URL(handoffUrl(target, H, { tokenHash: "tok" }));
    expect(u.origin + u.pathname).toBe(target);
    expect(u.searchParams.get("handoff")).toBe(H);
    expect(u.searchParams.get("token_hash")).toBe("tok");
    expect(u.searchParams.get("type")).toBe("magiclink");
    expect(u.searchParams.has("error")).toBe(false);
  });

  it("carries an error without a token", () => {
    const u = new URL(handoffUrl(target, H, { error: "notRegistered" }));
    expect(u.searchParams.get("error")).toBe("notRegistered");
    expect(u.searchParams.has("token_hash")).toBe(false);
  });
});

describe("attempt cookie with an app", () => {
  it("round-trips app and handoff, rejects half of them", () => {
    const a = newAttempt("/", { app: "form", handoff: H });
    expect(decodeAttempt(encodeAttempt(a))).toEqual(a);
    const half = Buffer.from(JSON.stringify({ ...a, handoff: undefined })).toString("base64url");
    expect(decodeAttempt(half)).toBeNull();
  });
});

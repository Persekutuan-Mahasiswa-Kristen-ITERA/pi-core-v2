import { describe, expect, it } from "vitest";
import { googleErrorFromParams, isGoogleLoginError } from "@/lib/google-sign-in";

const params = (q: string) => new URLSearchParams(q);

describe("googleErrorFromParams", () => {
  it("returns null for a normal callback with a code", () => {
    expect(googleErrorFromParams(params("code=abc&next=%2F"))).toBeNull();
  });

  it("maps closed sign-up to 'not registered'", () => {
    expect(
      googleErrorFromParams(
        params("error=access_denied&error_code=signup_disabled&error_description=Signups+not+allowed"),
      ),
    ).toBe("googleNotRegistered");
    expect(
      googleErrorFromParams(
        params("error=server_error&error_description=Signups%20not%20allowed%20for%20this%20instance"),
      ),
    ).toBe("googleNotRegistered");
  });

  it("gives one generic error for everything else (banned users included)", () => {
    expect(googleErrorFromParams(params("error=access_denied&error_description=User+is+banned"))).toBe("googleFailed");
    expect(googleErrorFromParams(params("error=access_denied"))).toBe("googleFailed");
    expect(googleErrorFromParams(params("error_code=bad_oauth_state"))).toBe("googleFailed");
  });
});

describe("isGoogleLoginError", () => {
  it("accepts only the two known keys", () => {
    expect(isGoogleLoginError("googleNotRegistered")).toBe(true);
    expect(isGoogleLoginError("googleFailed")).toBe(true);
    expect(isGoogleLoginError("generic")).toBe(false);
    expect(isGoogleLoginError(["googleFailed"])).toBe(false);
    expect(isGoogleLoginError(undefined)).toBe(false);
  });
});

/**
 * Google sign-in (D-13). Google is a second way IN to an account a PI-CORE admin already created;
 * it never creates accounts (sign-up stays closed on the Supabase project).
 *
 * Pure helpers here so the callback's decisions can be unit tested.
 */

/** Login-page error keys the callback can send back (`/login?error=<key>`). */
export type GoogleLoginError = "googleNotRegistered" | "googleFailed";

/**
 * Supabase sends OAuth failures back to the redirect URL as query parameters. With sign-up
 * disabled, a Google account whose email has no PI-CORE login arrives as `error_code=signup_disabled`.
 * A banned (deactivated) user and every other failure get one generic message, so the page cannot
 * be used to find out which emails have accounts.
 */
export function googleErrorFromParams(params: URLSearchParams): GoogleLoginError | null {
  const error = params.get("error");
  const code = params.get("error_code");
  const description = (params.get("error_description") || "").toLowerCase();
  if (!error && !code) return null;
  if (code === "signup_disabled" || description.includes("signups not allowed")) return "googleNotRegistered";
  return "googleFailed";
}

export function isGoogleLoginError(value: unknown): value is GoogleLoginError {
  return value === "googleNotRegistered" || value === "googleFailed";
}

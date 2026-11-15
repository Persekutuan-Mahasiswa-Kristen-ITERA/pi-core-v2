/**
 * Google sign-in (D-13). Google is a second way IN to an account a PI-CORE admin already created;
 * it never creates accounts.
 */

/** Login-page error keys the Google callback can send back (`/login?error=<key>`). */
export type GoogleLoginError = "googleNotRegistered" | "googleFailed";

export function isGoogleLoginError(value: unknown): value is GoogleLoginError {
  return value === "googleNotRegistered" || value === "googleFailed";
}

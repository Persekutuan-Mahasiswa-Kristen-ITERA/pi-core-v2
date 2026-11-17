import "server-only";

/**
 * Google sign-in for other PMK apps (D-14). PI-CORE does the Google part; the app gets a one-time
 * Supabase token and redeems it on its OWN domain, so its session cookies are its own (no cookie shared
 * across *.pmkitera.web.id).
 *
 *   app  → PI-CORE /auth/google?app=<id>&handoff=<random>   (app keeps <random> in an httpOnly cookie)
 *   PI-CORE → Google → PI-CORE /auth/google/callback        (same checks as a PI-CORE sign-in)
 *   PI-CORE → <app finish URL>?handoff=<random>&token_hash=…  or  ?handoff=<random>&error=<code>
 *   app checks <random> against its cookie (stops login CSRF), then verifyOtp(token_hash).
 *
 * Only the apps listed here can receive a token. Local tests only: GOOGLE_HANDOFF_DEV_APPS='{"form":"http://…"}'
 * replaces the list; it is ignored when NODE_ENV is "production" (Vercel, previews too).
 */
const APPS: Record<string, string> = {
  form: "https://form.pmkitera.web.id/auth/google/finish",
  ark: "https://ark.pmkitera.web.id/auth/google/finish",
};

export type HandoffError = "notRegistered" | "inactive" | "failed";

function apps(): Record<string, string> {
  const dev = process.env.GOOGLE_HANDOFF_DEV_APPS;
  if (dev && process.env.NODE_ENV !== "production") return JSON.parse(dev) as Record<string, string>;
  return APPS;
}

/** The finish URL of a known app, or null. */
export function handoffTarget(app: string | null | undefined): string | null {
  if (!app) return null;
  return Object.hasOwn(apps(), app) ? apps()[app] : null;
}

/** The app's random value: 32 random bytes in base64url (43 characters). */
export function validHandoff(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

/** Where to send the browser back to the app. */
export function handoffUrl(
  target: string,
  handoff: string,
  result: { tokenHash: string } | { error: HandoffError },
): string {
  const url = new URL(target);
  url.searchParams.set("handoff", handoff);
  if ("tokenHash" in result) {
    url.searchParams.set("token_hash", result.tokenHash);
    url.searchParams.set("type", "magiclink");
  } else {
    url.searchParams.set("error", result.error);
  }
  return url.toString();
}

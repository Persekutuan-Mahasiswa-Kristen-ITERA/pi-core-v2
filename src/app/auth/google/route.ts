import { NextResponse, type NextRequest } from "next/server";
import {
  OAUTH_COOKIE,
  OAUTH_COOKIE_MAX_AGE,
  OAUTH_COOKIE_PATH,
  authorizeUrl,
  encodeAttempt,
  googleConfigured,
  newAttempt,
} from "@/lib/google-oauth";
import { handoffTarget, validHandoff } from "@/lib/google-handoff";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * GET /auth/google?next=/x — starts "Log in with Google" (D-13). Fresh state, nonce and PKCE
 * verifier go into a short-lived httpOnly cookie scoped to /auth/google, then off to Google.
 *
 * GET /auth/google?app=form&handoff=<random> — the same, for another PMK app (D-14). Unknown apps or a
 * malformed handoff value are refused here, before Google.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  if (!googleConfigured()) return NextResponse.redirect(new URL("/login?error=googleFailed", url.origin));

  const app = url.searchParams.get("app");
  const handoff = url.searchParams.get("handoff");
  if ((app !== null || handoff !== null) && !(handoffTarget(app) && validHandoff(handoff)))
    return NextResponse.redirect(new URL("/login?error=googleFailed", url.origin));

  const attempt = newAttempt(
    safeRedirectPath(url.searchParams.get("next")),
    app && handoff ? { app, handoff } : undefined,
  );
  const response = NextResponse.redirect(authorizeUrl(attempt, `${url.origin}/auth/google/callback`));
  response.cookies.set(OAUTH_COOKIE, encodeAttempt(attempt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // the callback is a top-level GET navigation coming back from Google
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });
  return response;
}

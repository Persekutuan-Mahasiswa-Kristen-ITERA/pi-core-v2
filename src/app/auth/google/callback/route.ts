import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { reissueSessionCookies } from "@/app/login/actions";
import {
  OAUTH_COOKIE,
  OAUTH_COOKIE_PATH,
  decodeAttempt,
  exchangeCode,
  stateMatches,
  verifiedEmail,
} from "@/lib/google-oauth";
import { handoffTarget, handoffUrl, type HandoffError } from "@/lib/google-handoff";
import { generateTemporaryPassword } from "@/lib/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/google/callback — finishes "Log in with Google" (D-13, option B).
 *
 * 1. state from Google must equal the one in our httpOnly cookie (CSRF), cookie is then dropped.
 * 2. Code + PKCE verifier + client secret → Google ID token; signature, issuer, audience, expiry,
 *    nonce and email_verified are checked.
 * 3. The verified email must be an ACTIVE member with a login. Google never creates accounts.
 * 4. A Supabase session for that member is minted server-side: the Auth admin API makes a one-time
 *    magic-link token (no email is sent) and it is redeemed at once, writing the normal session cookies.
 * 5. Temporary password → random password + flag cleared (owner decision), cookies re-issued (D-09).
 *
 * When another app started the sign-in (D-14), steps 1-3 and 5 are the same, but no PI-CORE session is made:
 * the one-time token goes back to that app (with its handoff value) and the app redeems it on its own domain.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const attempt = decodeAttempt(request.cookies.get(OAUTH_COOKIE)?.value);

  // Through next/headers, like the session cookies, so both end up on the same response.
  const store = await cookies();
  const finish = (target: string) => {
    store.set(OAUTH_COOKIE, "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });
    const response = NextResponse.redirect(new URL(target, url.origin));
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  const appTarget = attempt?.app && attempt.handoff ? handoffTarget(attempt.app) : null;
  const LOGIN_ERRORS: Record<HandoffError, string> = {
    notRegistered: "/login?error=googleNotRegistered",
    inactive: "/login?reason=inactive",
    failed: "/login?error=googleFailed",
  };
  const fail = (error: HandoffError) =>
    finish(appTarget && attempt?.handoff ? handoffUrl(appTarget, attempt.handoff, { error }) : LOGIN_ERRORS[error]);

  if (!attempt || !stateMatches(attempt.state, url.searchParams.get("state"))) return fail("failed");
  // The app was known when the attempt started; if it is not any more, stop rather than fall back.
  if (attempt.app && !appTarget) return finish(LOGIN_ERRORS.failed);
  // Google reports a cancelled or failed consent as ?error=…; nothing to exchange then.
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error") || !code) return fail("failed");

  let email: string;
  try {
    const idToken = await exchangeCode(code, attempt.verifier, `${url.origin}/auth/google/callback`);
    email = await verifiedEmail(idToken, attempt.nonce);
  } catch (error) {
    console.error("Google sign-in: token check failed", error instanceof Error ? error.message : error);
    return fail("failed");
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("id, user_id, email, is_active, must_change_password")
    .eq("email", email)
    .maybeSingle();

  if (!member || !member.user_id) return fail("notRegistered");
  // Google has proved this person owns the email, so telling them the account is inactive leaks nothing.
  if (!member.is_active) return fail("inactive");
  // For another app the token is redeemed later, and changing the password voids outstanding tokens, so the
  // temporary password is replaced first. (PI-CORE's own sign-in redeems the token first, then rotates.)
  if (appTarget) await rotateTemporaryPassword(admin, { ...member, user_id: member.user_id });

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: member.email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error("Google sign-in: could not mint a session token", linkError?.message);
    return fail("failed");
  }

  if (appTarget && attempt.handoff) {
    return finish(handoffUrl(appTarget, attempt.handoff, { tokenHash }));
  }

  const supabase = await createClient();
  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyError || verified.user?.id !== member.user_id) {
    if (!verifyError) await supabase.auth.signOut({ scope: "local" });
    console.error("Google sign-in: session token was not accepted", verifyError?.message);
    return fail("failed");
  }

  await rotateTemporaryPassword(admin, { ...member, user_id: member.user_id });
  await reissueSessionCookies();
  return finish(attempt.next);
}

/** Owner decision: a Google sign-in ends a temporary password (random password, forced change cleared). */
async function rotateTemporaryPassword(
  admin: ReturnType<typeof createAdminClient>,
  member: { id: string; user_id: string; must_change_password: boolean },
) {
  if (!member.must_change_password) return;
  const { error } = await admin.auth.admin.updateUserById(member.user_id, {
    password: generateTemporaryPassword(32),
  });
  if (!error) await admin.from("members").update({ must_change_password: false }).eq("id", member.id);
  // If either step failed the flag stays set and the normal forced change-password flow applies.
}

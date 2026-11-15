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
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const attempt = decodeAttempt(request.cookies.get(OAUTH_COOKIE)?.value);

  // Through next/headers, like the session cookies, so both end up on the same response.
  const store = await cookies();
  const finish = (target: string) => {
    store.set(OAUTH_COOKIE, "", { path: OAUTH_COOKIE_PATH, maxAge: 0 });
    return NextResponse.redirect(new URL(target, url.origin));
  };

  if (!attempt || !stateMatches(attempt.state, url.searchParams.get("state")))
    return finish("/login?error=googleFailed");
  // Google reports a cancelled or failed consent as ?error=…; nothing to exchange then.
  const code = url.searchParams.get("code");
  if (url.searchParams.get("error") || !code) return finish("/login?error=googleFailed");

  let email: string;
  try {
    const idToken = await exchangeCode(code, attempt.verifier, `${url.origin}/auth/google/callback`);
    email = await verifiedEmail(idToken, attempt.nonce);
  } catch (error) {
    console.error("Google sign-in: token check failed", error instanceof Error ? error.message : error);
    return finish("/login?error=googleFailed");
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("id, user_id, email, is_active, must_change_password")
    .eq("email", email)
    .maybeSingle();

  if (!member || !member.user_id) return finish("/login?error=googleNotRegistered");
  // Google has proved this person owns the email, so telling them the account is inactive leaks nothing.
  if (!member.is_active) return finish("/login?reason=inactive");

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: member.email,
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    console.error("Google sign-in: could not mint a session token", linkError?.message);
    return finish("/login?error=googleFailed");
  }
  const supabase = await createClient();
  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyError || verified.user?.id !== member.user_id) {
    if (!verifyError) await supabase.auth.signOut({ scope: "local" });
    console.error("Google sign-in: session token was not accepted", verifyError?.message);
    return finish("/login?error=googleFailed");
  }

  if (member.must_change_password) {
    const { error: pwError } = await admin.auth.admin.updateUserById(member.user_id, {
      password: generateTemporaryPassword(32),
    });
    if (!pwError) await admin.from("members").update({ must_change_password: false }).eq("id", member.id);
    // If either step failed the flag stays set and the normal forced change-password flow applies.
  }

  await reissueSessionCookies();
  return finish(attempt.next);
}

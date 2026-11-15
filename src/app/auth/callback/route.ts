import { NextResponse, type NextRequest } from "next/server";
import { reissueSessionCookies } from "@/app/login/actions";
import { googleErrorFromParams } from "@/lib/google-sign-in";
import { generateTemporaryPassword } from "@/lib/password";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth (Google) callback, D-13.
 *
 * 1. Supabase errors (e.g. sign-up disabled = no PI-CORE login for that email) go back to /login.
 * 2. The PKCE code is exchanged for a session (cookies written through next/headers).
 * 3. The account must belong to an ACTIVE member; otherwise the session is dropped.
 * 4. A member still on a temporary password gets a random password and the flag cleared: Google has
 *    proved who they are, and the admin-known temporary password must stop working (owner decision).
 * 5. Session cookies are re-issued server-side (Safari ITP, see D-09), then on to `next`.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeRedirectPath(url.searchParams.get("next"));
  const toLogin = (query: string) => NextResponse.redirect(new URL(`/login?${query}`, url.origin));

  const oauthError = googleErrorFromParams(url.searchParams);
  if (oauthError) return toLogin(`error=${oauthError}`);

  const code = url.searchParams.get("code");
  if (!code) return toLogin("error=googleFailed");

  const supabase = await createClient();
  const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError || !exchanged.user) return toLogin("error=googleFailed");
  const userId = exchanged.user.id;

  // Service role: the member row decides, and a deactivated member's own reads are blocked by RLS.
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("members")
    .select("id, is_active, must_change_password")
    .eq("user_id", userId)
    .maybeSingle();

  if (!member || !member.is_active) {
    await supabase.auth.signOut({ scope: "local" });
    return toLogin(member ? "reason=inactive" : "error=googleNotRegistered");
  }

  if (member.must_change_password) {
    const { error: pwError } = await admin.auth.admin.updateUserById(userId, {
      password: generateTemporaryPassword(32),
    });
    if (!pwError) {
      await admin.from("members").update({ must_change_password: false }).eq("id", member.id);
    }
    // If either step failed the flag stays set and the normal forced change-password flow applies.
  }

  await reissueSessionCookies();
  return NextResponse.redirect(new URL(next, url.origin));
}

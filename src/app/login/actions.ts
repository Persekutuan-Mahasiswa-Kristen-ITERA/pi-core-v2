"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const MAX_AGE = 400 * 24 * 60 * 60; // @supabase/ssr default

/**
 * Re-issues the Supabase auth cookies from the server right after a browser sign-in.
 * Safari's ITP caps cookies written by `document.cookie` at 7 days; cookies set by a server
 * response are not capped. Without this, an installed iOS app could log the member out after a
 * week of not opening it. Values are unchanged — only who sets them.
 */
export async function reissueSessionCookies(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return;

  const store = await cookies();
  for (const cookie of store.getAll()) {
    if (/^sb-.+-auth-token(\.\d+)?$/.test(cookie.name)) {
      store.set(cookie.name, cookie.value, {
        path: "/",
        sameSite: "lax",
        httpOnly: false, // the browser client must still be able to read/replace it on the login page
        secure: process.env.NODE_ENV === "production",
        maxAge: MAX_AGE,
      });
    }
  }
}

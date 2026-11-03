"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALE_MAX_AGE, isLocale } from "./config";

/**
 * The one switch for PI-CORE's language. Stores the choice for this device; it is a display
 * preference only, so it needs no session and touches no data. The caller refreshes the router.
 */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: LOCALE_MAX_AGE,
  });
}

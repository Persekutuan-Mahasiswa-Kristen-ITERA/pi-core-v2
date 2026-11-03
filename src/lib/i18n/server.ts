import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, INTL_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { DICTIONARIES } from "./dictionaries";

/** The viewer's language for this request: the cookie when valid, otherwise Indonesian. */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** Copy and formatters for Server Components, `generateMetadata` and server-only helpers. */
export async function getI18n() {
  const locale = await getLocale();
  const intl = INTL_LOCALE[locale];
  return {
    locale,
    d: DICTIONARIES[locale],
    number: new Intl.NumberFormat(intl),
    date: new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", year: "numeric" }),
  };
}

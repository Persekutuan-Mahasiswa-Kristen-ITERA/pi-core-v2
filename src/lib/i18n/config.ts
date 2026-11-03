/** Languages PI-CORE speaks. Indonesian is the default; the choice lives in a cookie per device. */
export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "id";
export const LOCALE_COOKIE = "pi-lang";
/** One year; the preference outlives sessions. */
export const LOCALE_MAX_AGE = 365 * 24 * 60 * 60;

export const isLocale = (value: unknown): value is Locale => value === "id" || value === "en";

/** BCP 47 tags for Intl number and date formatting. */
export const INTL_LOCALE: Record<Locale, string> = { id: "id-ID", en: "en-GB" };

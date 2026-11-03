export const APP_NAME = "PMK ITERA Centralized Organization & Role Engine";
export const APP_SHORT_NAME = "PI-CORE";
/** Canvas colour (frosted top bar sits on it), so iOS/Android status bars blend in. */
export const THEME_COLOR = "#f8f6f2";
export const BACKGROUND_COLOR = "#f8f6f2";

/** Authentication methods shown on Settings (labels in the i18n dictionaries). Read-only in the MVP. */
export const AUTH_METHODS = [
  { id: "email_password", label: "Email & Password", enabled: true, note: "Accounts are created by an admin." },
  { id: "google", label: "Google Sign-In", enabled: false, note: "Planned for a later version." },
] as const;

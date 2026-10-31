export const APP_NAME = "PMK ITERA Centralized Organization & Role Engine";
export const APP_SHORT_NAME = "PI-CORE";
/** Cream app background — matches the top bar so iOS/Android status bars blend in. */
export const THEME_COLOR = "#f8f7f6";
export const BACKGROUND_COLOR = "#f8f7f6";

/** Authentication methods shown on Settings. Read-only in the MVP; not a feature flag. */
export const AUTH_METHODS = [
  { id: "email_password", label: "Email & Password", enabled: true, note: "Accounts are created by an admin." },
  { id: "google", label: "Google Sign-In", enabled: false, note: "Planned for a later version." },
] as const;

export const APP_NAME = "PMK ITERA Centralized Organization & Role Engine";
export const APP_SHORT_NAME = "PI-CORE";
/** Chrome colour (phone top bar), so iOS/Android status bars blend in. */
export const THEME_COLOR = "#f1efec";
export const BACKGROUND_COLOR = "#f1efec";

/** Authentication methods shown on Settings. Read-only in the MVP; not a feature flag. */
export const AUTH_METHODS = [
  { id: "email_password", label: "Email & Password", enabled: true, note: "Accounts are created by an admin." },
  { id: "google", label: "Google Sign-In", enabled: false, note: "Planned for a later version." },
] as const;

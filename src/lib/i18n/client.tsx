"use client";

import { createContext, useCallback, useContext } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { DICTIONARIES, type Dict } from "./dictionaries";
import { translateMessage } from "./messages";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Set once in the root layout from the cookie the server read, so both sides agree. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useDict(): Dict {
  return DICTIONARIES[useContext(LocaleContext)];
}

/** Translates a message that came back from a Server Action. */
export function useTranslateMessage() {
  const locale = useContext(LocaleContext);
  return useCallback((message: string) => translateMessage(message, locale), [locale]);
}

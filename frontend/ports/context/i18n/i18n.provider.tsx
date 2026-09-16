import { PropsWithChildren } from "react";
import { I18nContext } from "ports/context/i18n/i18n.context.ts";
import { useLocalStorage } from "ports/hooks/use-local-storage.ts";
import { translations } from "ports/i18n/translations/index.ts";
import { detectBrowserLanguage } from "ports/i18n/detect-language.ts";
import type { Language } from "ports/i18n/language.ts";

export function I18nContextProvider({ children }: PropsWithChildren) {
  // Only ever consulted the very first time this browser shows up (no
  // LANGUAGE key stored yet) - useLocalStorage reads `defaultValue` inside a
  // lazy useState initializer, so this runs once, not on every render.
  // Anyone who explicitly picks a language afterward keeps that choice
  // regardless of what the browser reports.
  const [language, setLanguage] = useLocalStorage<Language>({
    key: "LANGUAGE",
    defaultValue: detectBrowserLanguage(),
  });

  return (
    <I18nContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </I18nContext.Provider>
  );
}

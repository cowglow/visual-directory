import { languages, type Language } from "ports/i18n/language.ts";

// Pure and testable: given the visitor's own ordered language preferences
// (most preferred first, e.g. from navigator.languages), returns the first
// one whose base subtag - the part before a region, "de" out of "de-DE" - is
// one we actually support, or "en" if none of them are. Only ever runs once,
// as the seed for the LANGUAGE localStorage key (see i18n.provider.tsx) -
// an explicit choice, once made, always wins on every later visit.
export function detectDefaultLanguage(candidates: readonly string[]): Language {
  for (const candidate of candidates) {
    const base = candidate.split("-")[0]?.toLowerCase();
    if ((languages as readonly string[]).includes(base)) {
      return base as Language;
    }
  }
  return "en";
}

export function detectBrowserLanguage(): Language {
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  return detectDefaultLanguage(candidates);
}

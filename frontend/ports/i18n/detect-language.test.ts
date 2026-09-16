import { describe, expect, test } from "vitest";
import { detectDefaultLanguage } from "ports/i18n/detect-language.ts";

describe("detectDefaultLanguage", () => {
  test("matches the base subtag of the first supported preference", () => {
    expect(detectDefaultLanguage(["de-DE", "en-US"])).toBe("de");
  });

  test("skips unsupported preferences to find a later supported one", () => {
    expect(detectDefaultLanguage(["fr-FR", "es-ES"])).toBe("es");
  });

  test("falls back to English when nothing matches", () => {
    expect(detectDefaultLanguage(["fr-FR", "it-IT"])).toBe("en");
  });

  test("falls back to English on an empty list", () => {
    expect(detectDefaultLanguage([])).toBe("en");
  });

  test("is case-insensitive", () => {
    expect(detectDefaultLanguage(["DE-de"])).toBe("de");
  });

  test("matches a bare base subtag with no region", () => {
    expect(detectDefaultLanguage(["es"])).toBe("es");
  });
});

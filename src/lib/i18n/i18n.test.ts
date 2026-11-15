import { describe, expect, it } from "vitest";
import { isLocale, localeFromLanguages } from "./index";
import { LOCALES, type Locale } from "./locale";
import { messages } from "./messages";
import { bodyMessages } from "./pages/body";
import { logMessages } from "./pages/log";
import { nowMessages } from "./pages/now";
import { profileMessages } from "./pages/profile";
import { routineMessages } from "./pages/routine";
import { safetyMessages } from "./pages/safety";
import { settingsMessages } from "./pages/settings";
import { trainerMessages } from "./pages/trainer";
import { vitalsMessages } from "./pages/vitals";

const catalogs: Record<string, Record<Locale, unknown>> = {
  messages,
  body: bodyMessages,
  log: logMessages,
  now: nowMessages,
  profile: profileMessages,
  routine: routineMessages,
  safety: safetyMessages,
  settings: settingsMessages,
  trainer: trainerMessages,
  vitals: vitalsMessages,
};

/** Flattens a catalog to "path -> kind", where kind captures arity for functions and length for arrays. */
function shape(value: unknown, path = "", out: Record<string, string> = {}): Record<string, string> {
  if (typeof value === "function") out[path] = `fn/${value.length}`;
  else if (Array.isArray(value)) {
    out[path] = `array/${value.length}`;
    value.forEach((v, i) => shape(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) shape(v, path ? `${path}.${k}` : k, out);
  } else out[path] = typeof value;
  return out;
}

/** "{x}"-style or "${x}" leftovers would mean an interpolation that never ran. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

describe("i18n catalogs", () => {
  for (const [name, catalog] of Object.entries(catalogs)) {
    it(`${name}: every locale has the same keys, arrays and function arities`, () => {
      const [first, ...rest] = LOCALES;
      const base = shape(catalog[first]);
      for (const l of rest) expect(shape(catalog[l]), `${name}.${l} vs ${first}`).toEqual(base);
    });

    it(`${name}: no empty or uninterpolated strings`, () => {
      for (const l of LOCALES) {
        for (const s of strings(catalog[l])) {
          expect(s, `${name}.${l}`).not.toMatch(/\$\{|\{\{|\bundefined\b|\bnull\b/);
        }
      }
    });
  }

  it("pt-BR copy keeps its accents", () => {
    // Common words that are easy to type without diacritics. Word boundaries are
    // spelled out because \b treats accented letters as non-word characters.
    const unaccented = /(?<![\p{L}])(nao|voce|sao|ate|tambem|atencao|saude|pressao|medico|critico|orientacao|informacao)(?![\p{L}])/iu;
    const offenders = Object.values(catalogs)
      .flatMap((c) => strings(c.pt))
      // File-name slugs ("relatorio-medico-de-voo") stay ASCII on purpose.
      .filter((s) => !/^[a-z0-9-]+$/.test(s) && unaccented.test(s));
    expect(offenders).toEqual([]);
  });
});

describe("locale detection", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("pt")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("pt-BR")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });

  it("picks the first supported browser language, else pt", () => {
    expect(localeFromLanguages(["pt-BR", "en-US"])).toBe("pt");
    expect(localeFromLanguages(["en-GB"])).toBe("en");
    expect(localeFromLanguages(["fr-FR", "en-US", "pt-BR"])).toBe("en");
    expect(localeFromLanguages(["fr-FR"])).toBe("pt");
    expect(localeFromLanguages([])).toBe("pt");
  });
});

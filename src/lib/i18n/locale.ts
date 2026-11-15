/** Kept free of React so the AI worker and plain libs can import it. */
export type Locale = "pt" | "en";

/** What the server renders (and what <html lang> starts as) before the client knows better. */
export const DEFAULT_LOCALE: Locale = "pt";

export const LOCALES: readonly Locale[] = ["pt", "en"];

export const INTL_LOCALE: Record<Locale, string> = { pt: "pt-BR", en: "en-US" };

/** Whisper language names. */
export const SPEECH_LANGUAGE: Record<Locale, string> = { pt: "portuguese", en: "english" };

export function formatNumber(n: number, digits: number, locale: Locale) {
  return n.toLocaleString(INTL_LOCALE[locale], { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

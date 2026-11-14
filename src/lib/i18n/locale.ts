/** Kept free of React so the AI worker and plain libs can import it. */
export type Locale = "pt" | "en";

export const LOCALES: Locale[] = ["pt", "en"];

export const INTL_LOCALE: Record<Locale, string> = { pt: "pt-BR", en: "en-US" };

/** Whisper language names. */
export const SPEECH_LANGUAGE: Record<Locale, string> = { pt: "portuguese", en: "english" };

export function formatNumber(n: number, digits: number, locale: Locale) {
  return n.toLocaleString(INTL_LOCALE[locale], { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

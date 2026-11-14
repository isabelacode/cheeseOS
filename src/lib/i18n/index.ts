import { useEffect, useSyncExternalStore } from "react";
import { INTL_LOCALE, type Locale } from "./locale";
import { messages, type Messages } from "./messages";

export type { Locale } from "./locale";
export type { Messages } from "./messages";
export { messages } from "./messages";
export { formatNumber, INTL_LOCALE, LOCALES, SPEECH_LANGUAGE } from "./locale";

const KEY = "cheeseos.locale.v1";
const listeners = new Set<() => void>();
let current: Locale | null = null;

function detect(): Locale {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "pt" || saved === "en") return saved;
  } catch {
    /* storage blocked */
  }
  return navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en";
}

function read(): Locale {
  current ??= detect();
  return current;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setLocale(locale: Locale) {
  current = locale;
  try {
    window.localStorage.setItem(KEY, locale);
  } catch {
    /* per-session only */
  }
  listeners.forEach((l) => l());
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, read, () => "pt");
}

export function useT(): Messages {
  return messages[useLocale()];
}

/** Keeps <html lang> and the tab title in sync with the chosen language. */
export function useDocumentLocale() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = INTL_LOCALE[locale];
    document.title = messages[locale].meta.title;
  }, [locale]);
}

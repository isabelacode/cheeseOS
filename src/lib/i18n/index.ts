import { useEffect, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, INTL_LOCALE, LOCALES, type Locale } from "./locale";
import { messages, type Messages } from "./messages";

export type { Locale } from "./locale";
export type { Messages } from "./messages";
export { messages } from "./messages";
export { DEFAULT_LOCALE, formatNumber, INTL_LOCALE, LOCALES, SPEECH_LANGUAGE } from "./locale";

const KEY = "cheeseos.locale.v1";
const listeners = new Set<() => void>();
let current: Locale | null = null;

export function isLocale(value: unknown): value is Locale {
  return (LOCALES as readonly unknown[]).includes(value);
}

/** First supported language in the browser's preference list, else the default. */
export function localeFromLanguages(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

function detect(): Locale {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* storage blocked */
  }
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  return localeFromLanguages(navigator.languages?.length ? navigator.languages : [navigator.language ?? ""]);
}

function read(): Locale {
  current ??= detect();
  return current;
}

function serverSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function notify() {
  listeners.forEach((l) => l());
}

/** Another tab changed the language: follow it. */
function onStorage(e: StorageEvent) {
  if (e.key !== KEY) return;
  const next = isLocale(e.newValue) ? e.newValue : detect();
  if (next === current) return;
  current = next;
  notify();
}

function subscribe(cb: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function setLocale(locale: Locale) {
  if (!isLocale(locale)) return;
  try {
    window.localStorage.setItem(KEY, locale);
  } catch {
    /* per-session only */
  }
  if (locale === current) return;
  current = locale;
  notify();
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, read, serverSnapshot);
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
    document.querySelector('meta[name="description"]')?.setAttribute("content", messages[locale].meta.description);
  }, [locale]);
}

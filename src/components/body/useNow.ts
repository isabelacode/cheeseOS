"use client";

import { useSyncExternalStore } from "react";
import { INTL_LOCALE, type Locale } from "@/lib/i18n";

/** A shared coarse clock (30 s ticks) so relative times stay fresh without per-row timers. */
let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 30_000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function snapshot() {
  if (!now) now = Date.now();
  return now;
}

export function useNow() {
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}

/** "há 5 minutos" / "5 minutes ago"; "agora" / "now" under a minute. */
export function relativeTime(at: number, now: number, locale: Locale) {
  const rtf = new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: "auto" });
  const s = Math.round((at - Math.max(now, at)) / 1000);
  if (s > -60) return rtf.format(0, "second");
  const m = Math.round(s / 60);
  if (m > -60) return rtf.format(m, "minute");
  const h = Math.round(m / 60);
  if (h > -24) return rtf.format(h, "hour");
  return rtf.format(Math.round(h / 24), "day");
}

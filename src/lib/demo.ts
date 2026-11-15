import { useSyncExternalStore } from "react";

/**
 * Demo mode: the simulated vitals react and recover in seconds instead of
 * minutes, so a short presentation can show a full worsen-and-recover cycle.
 * Off by default; stored only in this browser.
 */
const KEY = "cheeseos.demo.v1";
const listeners = new Set<() => void>();
let memory: boolean | null = null;

export function readDemoMode(): boolean {
  if (memory !== null) return memory;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setDemoMode(on: boolean) {
  try {
    if (on) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
    memory = null;
  } catch {
    memory = on;
  }
  listeners.forEach((l) => l());
}

/** Forget demo mode (storage is cleared by the caller): drops the in-memory fallback and notifies readers. */
export function resetDemoMode() {
  memory = null;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDemoMode(): boolean {
  return useSyncExternalStore(subscribe, readDemoMode, () => false);
}

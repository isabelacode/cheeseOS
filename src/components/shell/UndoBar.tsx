"use client";

import { useEffect, useRef, useState } from "react";
import { Undo2, X } from "lucide-react";
import { useCrewSession, type UndoAction } from "@/lib/session/CrewSession";
import { useT, type Messages } from "@/lib/i18n";

const VISIBLE_MS = 10000;

export function undoMessage(a: UndoAction, t: Messages) {
  const label = a.symptom ? t.symptoms[a.symptom].label : "";
  switch (a.kind) {
    case "resolve":
      return t.nav.undoResolved(label);
    case "dismiss":
      return t.nav.undoDismissed(label, a.count);
    case "delete":
      return t.nav.undoDeleted;
    case "clear":
      return t.nav.undoCleared(a.count);
  }
}

/**
 * One undo surface for every route. It stays 10 s, pauses while hovered or
 * focused, and ⌘Z / Ctrl+Z keeps working after it hides (WCAG 2.2.1).
 */
export function UndoBar() {
  const t = useT();
  const { lastAction, undo } = useCrewSession();
  const [hiddenKey, setHiddenKey] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = lastAction !== null && hiddenKey !== lastAction.key;
  const key = lastAction?.key ?? null;

  useEffect(() => {
    if (!open || paused || key === null) return;
    timer.current = setTimeout(() => setHiddenKey(key), VISIBLE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open, paused, key]);

  // ⌘Z / Ctrl+Z outside text fields reverts the last correction.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "z" || !(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, [contenteditable]")) return;
      if (!lastAction) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lastAction, undo]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[84px] z-40 flex justify-center px-3 sm:bottom-6">
      {open && lastAction && (
        <div
          key={lastAction.key}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="entry-in pointer-events-auto flex max-w-[560px] items-center gap-2 rounded-2xl bg-ink py-1.5 pr-1.5 pl-4 text-sm text-white shadow-card"
        >
          <p className="min-w-0 flex-1 py-1">{undoMessage(lastAction, t)}</p>
          <button
            type="button"
            onClick={undo}
            title={t.nav.undoHint}
            aria-keyshortcuts="Meta+Z Control+Z"
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 font-semibold text-white hover:bg-white/10 sm:min-h-9"
          >
            <Undo2 className="size-4" aria-hidden /> {t.nav.undo}
          </button>
          <button
            type="button"
            onClick={() => setHiddenKey(lastAction.key)}
            aria-label={t.nav.undoClose}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white sm:size-9"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

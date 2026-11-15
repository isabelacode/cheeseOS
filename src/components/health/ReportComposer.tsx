"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Mic, Send } from "lucide-react";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useLocale, useT } from "@/lib/i18n";
import { nowMessages } from "@/lib/i18n/pages/now";

import { timeOf } from "./ui";

/** The one action of the Now screen: say (or type) how you feel. */
export function ReportComposer({
  draft,
  setDraft,
  onSubmit,
  compact = false,
}: {
  draft: string;
  setDraft: (v: string) => void;
  onSubmit: (t: string) => void;
  /** A symptom is active: the guidance leads and the composer steps back. */
  compact?: boolean;
}) {
  const { mic, live, toggleMic, transcribing, ai, entries } = useCrewSession();
  const stt = ai.models.stt;
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();
  const v = t.voice;
  const n = nowMessages[useLocale()];
  const hasRealEntry = entries.some((e) => e.source !== "action");

  let head = n.micIdle;
  let hint: string | null = n.micIdleHint;
  if (mic.state === "requesting") [head, hint] = [v.requesting, null];
  else if (mic.state === "denied") [head, hint] = [v.denied, null];
  else if (mic.state === "error") [head, hint] = [v.error, null];
  else if (live && stt.state === "loading") [head, hint] = [v.loading(Math.round(stt.progress * 100)), n.micStopHint];
  else if (live && stt.state === "error") [head, hint] = [v.sttFailed, null];
  else if (live && transcribing) [head, hint] = [v.transcribing, n.micStopHint];
  else if (live && mic.speaking) [head, hint] = [v.hearing, n.micStopHint];
  else if (live) [head, hint] = [v.listening, n.micStopHint];

  return (
    <section id="relatos" aria-label={t.dashboard.reports} className="scroll-mt-4">
      <div className={`flex items-center ${compact ? "gap-4" : "gap-5"}`}>
        <button
          type="button"
          onClick={toggleMic}
          disabled={mic.state === "requesting"}
          aria-pressed={live}
          aria-label={live ? t.dashboard.micOn : t.dashboard.micOff}
          title={t.nav.micShortcut}
          aria-keyshortcuts="Space"
          className={`grid shrink-0 place-items-center rounded-full bg-cheese text-cheese-ink shadow-card transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.04] active:scale-[0.97] disabled:opacity-60 ${
            compact ? "size-16" : "size-24 sm:size-28"
          } ${live ? "mic-live" : ""}`}
        >
          {/* Always the plain microphone: a crossed-out one on a "tap and talk" button reads as broken. */}
          <Mic className={compact ? "size-7" : "size-10"} aria-hidden />
        </button>
        <p className={`min-w-0 leading-snug ${compact ? "text-base" : "text-xl"}`} aria-live="polite">
          {head}
          {hint && <span className="block text-base text-ink-2">{hint}</span>}
        </p>
      </div>

      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft.trim();
          if (text) onSubmit(text);
        }}
      >
        <label htmlFor="report" className="sr-only">
          {v.inputLabel}
        </label>
        <input
          id="report"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={v.placeholder}
          className="h-13 min-w-0 flex-1 rounded-2xl border-[1.5px] border-line bg-surface px-4 text-base outline-none transition-colors focus:border-ink"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="flex h-13 items-center gap-2 rounded-2xl bg-accent px-5 text-base font-bold text-white transition-colors hover:bg-ink disabled:opacity-40"
        >
          <Send className="size-4" aria-hidden /> {v.send}
        </button>
      </form>

      {!hasRealEntry && !compact && (
        <div className="mt-4" role="group" aria-labelledby="report-examples">
          <p id="report-examples" className="mb-2 text-sm text-ink-2">
            {n.examplesLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {v.examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setDraft(ex);
                  inputRef.current?.focus();
                }}
                className="min-h-11 rounded-full border-[1.5px] border-line px-4 py-2 text-left text-sm text-ink-2 transition-colors hover:border-ink hover:text-ink"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** What the app understood from the last thing the crew member said; the full log lives on its own page. */
export function LastReport({ logHref }: { logHref: string }) {
  const { entries } = useCrewSession();
  const t = useT();
  const v = t.voice;
  const locale = useLocale();
  const n = nowMessages[locale];
  const e = entries.find((x) => x.source !== "action");
  if (!e) return null;
  const dismissed = new Set(e.dismissed ?? []);

  return (
    <section aria-label={n.lastReport} className="entry-in" key={e.id}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-bold text-ink-2">{n.lastReport}</h2>
        <span className="tabular text-sm text-ink-2">
          {e.source === "voice" ? v.sourceVoice : v.sourceTyped} · {timeOf(e.at, locale)}
        </span>
      </div>
      <p className="mt-1 text-base text-ink">“{e.text}”</p>
      {(e.findings.length > 0 || e.resolved.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {e.findings.map((f) =>
            dismissed.has(f) ? (
              <span key={f} className="rounded-md bg-sunken px-2 py-0.5 text-sm font-medium text-ink-2 line-through">
                {t.symptoms[f].label} <span className="sr-only">({n.dismissedTag})</span>
              </span>
            ) : (
              <span key={f} className="rounded-md bg-accent-soft px-2 py-0.5 text-sm font-medium text-ink">
                {t.symptoms[f].label}
              </span>
            ),
          )}
          {e.resolved.length > 0 && <span className="rounded-md bg-ok-soft px-2 py-0.5 text-sm font-medium text-ok">{v.improvement}</span>}
        </div>
      )}
      <Link href={logHref} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-accent-ink hover:underline">
        {n.seeAll} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </section>
  );
}

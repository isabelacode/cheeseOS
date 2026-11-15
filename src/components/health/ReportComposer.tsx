"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Send } from "lucide-react";
import type { TranscriptEntry } from "@/lib/health/types";
import { type ModelInfo } from "@/hooks/useLocalAi";
import { type MicState } from "@/hooks/useVoiceListener";
import { useLocale, useT } from "@/lib/i18n";
import { nowMessages } from "@/lib/i18n/pages/now";

import { timeOf } from "./ui";
import { Card, SectionTitle } from "./ui";

/* ---------- Voice ---------- */

export function VoiceCard(props: {
  micState: MicState;
  level: number;
  speaking: boolean;
  transcribing: boolean;
  stt: ModelInfo;
  entries: TranscriptEntry[];
  draft: string;
  setDraft: (v: string) => void;
  onSubmit: (t: string) => void;
  /** Show only the latest N log entries, with a link to the full log. */
  limit?: number;
  /** Where the full log lives (shown when entries are cut by `limit`). */
  logHref?: string;
}) {
  const { micState, level, speaking, transcribing, stt, entries, draft, setDraft, limit, logHref } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const live = micState === "listening";
  const t = useT();
  const v = t.voice;
  const locale = useLocale();
  const n = nowMessages[locale];
  const shown = limit ? entries.slice(0, limit) : entries;
  const hasRealEntry = entries.some((e) => e.source !== "action");

  let stateText = v.off;
  if (micState === "requesting") stateText = v.requesting;
  else if (micState === "denied") stateText = v.denied;
  else if (micState === "error") stateText = v.error;
  else if (live && stt.state === "loading") stateText = v.loading(Math.round(stt.progress * 100));
  else if (live && stt.state === "error") stateText = v.sttFailed;
  else if (live && transcribing) stateText = v.transcribing;
  else if (live && speaking) stateText = v.hearing;
  else if (live) stateText = v.listening;

  return (
    <Card id="relatos" aria-label={t.dashboard.reports}>
      <SectionTitle>{t.dashboard.reports}</SectionTitle>
      <div className="flex items-center gap-3 rounded-2xl bg-sunken px-3.5 py-2.5">
        <span className={`size-2 shrink-0 rounded-full ${live ? (speaking ? "bg-accent" : "bg-ok") : "bg-ink-3/40"}`} aria-hidden />
        <p className="min-w-0 flex-1 text-sm leading-snug text-ink-2" aria-live="polite">
          {stateText}
        </p>
        <div className="flex h-5 items-end gap-0.5" aria-hidden>
          {[0.55, 0.85, 1, 0.75, 0.5].map((k, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-accent transition-[height] duration-75"
              style={{ height: `${live ? Math.max(15, Math.min(100, level * 140 * k)) : 15}%` }}
            />
          ))}
        </div>
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = draft.trim();
          if (text) props.onSubmit(text);
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
          className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-ink disabled:opacity-40"
        >
          <Send className="size-4" aria-hidden /> {v.send}
        </button>
      </form>

      {!hasRealEntry && (
        <div className="mt-3" role="group" aria-labelledby="report-examples">
          <p id="report-examples" className="mb-1.5 text-xs text-ink-3">
            {n.examplesLabel}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {v.examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setDraft(ex);
                  inputRef.current?.focus();
                }}
                className="min-h-11 rounded-full bg-sunken px-3 py-1.5 text-left text-xs text-ink-2 transition-colors hover:bg-accent-soft hover:text-accent-ink sm:min-h-8"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {limit && entries.length > 0 && (
        <h3 className="mt-5 text-xs font-semibold text-ink-2">{n.latest}</h3>
      )}
      <ol className={`${limit && entries.length > 0 ? "mt-2" : "mt-4"} space-y-2`} aria-label={v.historyLabel}>
        {entries.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-3">
            {v.empty}
          </li>
        ) : (
          shown.map((e) => {
            const dismissed = new Set(e.dismissed ?? []);
            const source = e.source === "voice" ? v.sourceVoice : e.source === "typed" ? v.sourceTyped : n.sourceAction;
            return (
              <li key={e.id} className="entry-in rounded-2xl bg-sunken px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  {e.source === "action" ? (
                    <p className="text-sm text-ink-2">
                      {[
                        ...e.resolved.map((id) => n.actionResolved(t.symptoms[id].label)),
                        ...(e.dismissed ?? []).map((id) => n.actionDismissed(t.symptoms[id].label)),
                        ...(e.alert ? [n.actionAlert(e.alert)] : []),
                      ].join(" · ")}
                    </p>
                  ) : (
                    <p className="text-sm text-ink">“{e.text}”</p>
                  )}
                  <span className="tabular shrink-0 text-xs text-ink-3">
                    {source} · {timeOf(e.at, locale)}
                  </span>
                </div>
                {e.source !== "action" && (e.findings.length > 0 || e.resolved.length > 0) && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {e.findings.map((f) =>
                      dismissed.has(f) ? (
                        <span key={f} className="rounded-md bg-surface px-1.5 py-0.5 text-xs font-medium text-ink-3 line-through">
                          {t.symptoms[f].label} <span className="sr-only">({n.dismissedTag})</span>
                        </span>
                      ) : (
                        <span key={f} className="rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent-ink">
                          {t.symptoms[f].label}
                        </span>
                      ),
                    )}
                    {e.resolved.length > 0 && <span className="rounded-md bg-ok-soft px-1.5 py-0.5 text-xs font-medium text-ok">{v.improvement}</span>}
                  </div>
                )}
              </li>
            );
          })
        )}
      </ol>
      {logHref && entries.length > 0 && (
        <Link
          href={logHref}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-accent-ink hover:underline sm:min-h-8"
        >
          {n.seeAll} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </Card>
  );
}

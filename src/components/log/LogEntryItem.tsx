"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Keyboard, Mic, Trash2 } from "lucide-react";
import type { Finding, SymptomId, TranscriptEntry } from "@/lib/health/types";
import { INTL_LOCALE, type Messages, type Locale } from "@/lib/i18n";
import type { LogMessages } from "@/lib/i18n/pages/log";
import { SEVERITY_CHIP } from "@/components/health/ui";

/** Hour and minute: seconds are noise in a diary (the full time stays in the tooltip). */
function hourMinute(ms: number, locale: Locale) {
  return new Date(ms).toLocaleTimeString(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" });
}

/** Reports longer than this are clamped to four lines with a toggle. */
const LONG_TEXT = 220;

export function LogEntryItem(props: {
  entry: TranscriptEntry;
  /** The improvements to show for this entry (synonym expansion already trimmed). */
  resolved: SymptomId[];
  findings: Finding[];
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  t: Messages;
  l: LogMessages;
  locale: Locale;
}) {
  const { entry: e, findings, confirming, t, l, locale } = props;
  const resolved = props.resolved;
  const [expanded, setExpanded] = useState(false);
  const long = e.text.length > LONG_TEXT;
  const recognizedNothing = e.findings.length === 0 && resolved.length === 0 && !e.cleared?.length;
  const label = (id: SymptomId) => t.symptoms[id].label;
  const action = e.source === "action";
  const SourceIcon = action ? (e.resolved.length ? CheckCircle2 : XCircle) : e.source === "voice" ? Mic : Keyboard;
  const sourceText = action ? l.sourceAction : e.source === "voice" ? l.sourceVoice : l.sourceTyped;

  return (
    <li className={`entry-in rounded-2xl px-4 py-3 ${action ? (e.resolved.length ? "bg-ok-soft/50" : "bg-surface ring-1 ring-line") : "bg-sunken"}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {action ? (
            <p className="text-sm text-ink-2">
              {[
                ...e.resolved.map((id) => l.markedResolved(label(id))),
                ...(e.dismissed ?? []).map((id) => l.markedDismissed(label(id))),
                ...(e.alert ? [l.markedAlert(e.alert)] : []),
              ].join(" · ")}
            </p>
          ) : (
            <>
              <p className={`text-[15px] leading-snug text-ink ${long && !expanded ? "line-clamp-4" : ""}`}>“{e.text}”</p>
              {long && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className="-ml-1 mt-0.5 min-h-8 rounded-full px-1 text-xs font-semibold text-accent-ink hover:underline"
                >
                  {expanded ? l.showLess : l.showMore}
                </button>
              )}
            </>
          )}
          <p className="tabular mt-1 flex items-center gap-1.5 text-xs text-ink-3">
            <SourceIcon className="size-3.5" aria-hidden />
            <span>{sourceText}</span>
            <span aria-hidden>·</span>
            <time dateTime={new Date(e.at).toISOString()} title={new Date(e.at).toLocaleString(INTL_LOCALE[locale])}>
              {hourMinute(e.at, locale)}
            </time>
          </p>
          {!action && recognizedNothing && (
            <p className="mt-2">
              <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-ink-3 ring-1 ring-line">{l.noneRecognized}</span>
            </p>
          )}
          {!action && !recognizedNothing && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {e.findings.map((id) => {
                if (e.dismissed?.includes(id)) {
                  return (
                    <li key={id} className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-ink-3">
                      <span className="line-through">{label(id)}</span> · {l.dismissed}
                    </li>
                  );
                }
                const active = findings.find((f) => f.id === id);
                return active ? (
                  <li key={id} className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${SEVERITY_CHIP[active.severity]}`}>
                    {label(id)} · {t.severity[active.severity]}
                  </li>
                ) : (
                  <li key={id} className="rounded-md bg-surface px-1.5 py-0.5 text-xs font-medium text-ink-2">
                    {label(id)}
                  </li>
                );
              })}
              {resolved.length > 0 && (
                <li className="rounded-md bg-ok-soft px-1.5 py-0.5 text-xs font-medium text-ok">
                  {l.improvement}: {resolved.map(label).join(", ")}
                </li>
              )}
              {e.cleared && e.cleared.length > 0 && (
                <li className="rounded-md bg-ok-soft px-1.5 py-0.5 text-xs font-medium text-ok">{l.cleared(e.cleared.map(label).join(", "))}</li>
              )}
            </ul>
          )}
        </div>
        {!confirming && (
          <button
            type="button"
            onClick={props.onAskDelete}
            aria-label={l.deleteEntry}
            title={l.deleteEntry}
            className="-mr-2 -mt-1.5 grid size-11 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface hover:text-crit sm:size-9"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {confirming && (
        <div role="group" aria-label={l.confirmDelete} className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="mr-auto text-sm font-medium text-ink">{l.confirmDelete}</span>
          <button
            type="button"
            onClick={props.onCancelDelete}
            className="h-11 rounded-full px-4 text-sm font-medium text-ink-2 transition-colors hover:bg-surface sm:h-9"
          >
            {l.confirmNo}
          </button>
          <button
            type="button"
            autoFocus
            onClick={props.onDelete}
            className="h-11 rounded-full bg-crit px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:h-9"
          >
            {l.confirmYes}
          </button>
        </div>
      )}
    </li>
  );
}

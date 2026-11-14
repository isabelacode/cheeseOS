"use client";

import type { Messages, Locale } from "@/lib/i18n";
import type { LogMessages } from "@/lib/i18n/pages/log";
import { SEVERITY_CHIP, SEVERITY_FILL } from "@/components/health/ui";
import { shortWhen, type SpanState, type SymptomSpan } from "./logData";

const STATE_CHIP: Record<Exclude<SpanState, "active">, string> = {
  resolved: "bg-ok-soft text-ok",
  dismissed: "bg-sunken text-ink-3",
  inactive: "bg-sunken text-ink-2",
};

const BAR_FILL: Record<Exclude<SpanState, "active">, string> = {
  resolved: "var(--ok)",
  dismissed: "#cfd4dc",
  inactive: "#aab2bf",
};

/** One row per symptom: a bar from the first report to its end, on a shared time axis. */
export function SymptomTimeline({ spans, now, t, l, locale }: { spans: SymptomSpan[]; now: number; t: Messages; l: LogMessages; locale: Locale }) {
  if (!spans.length) return <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-3">{l.timelineEmpty}</p>;

  const min = Math.min(...spans.map((s) => s.start));
  const range = Math.max(now - min, 60_000);
  const pos = (ms: number) => ((ms - min) / range) * 100;

  return (
    <div>
      <ul className="space-y-3.5">
        {spans.map((s) => {
          const active = s.state === "active" && s.finding;
          const left = pos(s.start);
          const width = Math.max(pos(s.end) - left, 2);
          const fill = active ? SEVERITY_FILL[s.finding!.severity] : BAR_FILL[s.state as Exclude<SpanState, "active">];
          return (
            <li key={s.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-sm font-semibold ${s.state === "dismissed" ? "text-ink-3 line-through" : "text-ink"}`}>{t.symptoms[s.id].label}</span>
                {active ? (
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold ${SEVERITY_CHIP[s.finding!.severity]}`}>
                    {l.timelineState.active} · {t.severity[s.finding!.severity]}
                  </span>
                ) : (
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold ${STATE_CHIP[s.state as Exclude<SpanState, "active">]}`}>
                    {l.timelineState[s.state]}
                  </span>
                )}
              </div>
              <div className="relative mt-1.5 h-2 rounded-full bg-sunken" aria-hidden>
                <span className="absolute inset-y-0 rounded-full" style={{ left: `${Math.min(left, 98)}%`, width: `${width}%`, background: fill }} />
              </div>
              <p className="tabular mt-1 text-xs text-ink-3">
                {l.timelineRange(shortWhen(s.start, now, locale), s.state === "active" ? l.timelineNow : shortWhen(s.end, now, locale))}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="tabular mt-3 flex justify-between border-t border-line pt-2 text-xs text-ink-3" aria-hidden>
        <span>{shortWhen(min, now, locale)}</span>
        <span>{l.timelineNow}</span>
      </div>
    </div>
  );
}

"use client";

import type { Messages, Locale } from "@/lib/i18n";
import type { LogMessages } from "@/lib/i18n/pages/log";
import { SEVERITY_CHIP, SEVERITY_FILL } from "@/components/health/ui";
import { dayKey, duration, shortWhen, type SpanState, type SymptomSpan } from "./logData";

const STATE_CHIP: Record<Exclude<SpanState, "active">, string> = {
  resolved: "bg-ok-soft text-ok",
  dismissed: "bg-sunken text-ink-3",
  inactive: "bg-sunken text-ink-2",
};

const BAR_FILL: Record<Exclude<SpanState, "active">, string> = {
  resolved: "var(--ok)",
  dismissed: "var(--line)",
  inactive: "var(--ink-3)",
};

/** Ended spans narrower than this read as a dot; give them a visible length. */
const MIN_ENDED_WIDTH = 6;

/** One row per symptom: a bar from the first report to its end, on a shared time axis. */
export function SymptomTimeline({ spans, now, t, l, locale }: { spans: SymptomSpan[]; now: number; t: Messages; l: LogMessages; locale: Locale }) {
  if (!spans.length) return <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-3">{l.timelineEmpty}</p>;

  const min = Math.min(...spans.map((s) => s.start));
  // `now` ticks coarsely (and may lag a fresh report), so the axis must also cover every span end.
  const max = Math.max(now, ...spans.map((s) => Math.max(s.start, s.end)));
  const range = Math.max(max - min, 60_000);
  const pos = (ms: number) => Math.min(100, Math.max(0, ((ms - min) / range) * 100));
  const time = (ms: number) => shortWhen(ms, now, locale);
  // Start and how long, instead of two equal clock times ("08:33 → 08:33").
  const label = (s: SymptomSpan) => {
    const d = duration(s.end - s.start, l.file);
    if (s.state === "active") return l.timelineSince(time(s.start), d);
    const same = time(s.start) === time(s.end);
    const span = same ? time(s.start) : l.timelineRange(time(s.start), dayKey(s.start) === dayKey(s.end) ? time(s.end).split(" ").at(-1)! : time(s.end));
    return l.timelineLasted(span, d);
  };
  // Five axis labels: start, three quarter marks, now.
  // Under a few minutes the quarter marks would all print the same minute.
  const ticks = (range >= 4 * 60_000 ? [0, 0.25, 0.5, 0.75] : [0]).map((f) => time(min + f * range));

  return (
    <div>
      <ul className="space-y-3.5">
        {spans.map((s) => {
          const active = s.state === "active" && s.finding;
          const left = pos(s.start);
          const floor = s.state === "active" ? 2 : MIN_ENDED_WIDTH;
          const start = Math.min(left, 100 - floor);
          const width = Math.min(Math.max(pos(s.end) - left, floor), 100 - start);
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
                <span className="absolute inset-y-0 rounded-full" style={{ left: `${start}%`, width: `${width}%`, background: fill }} />
              </div>
              <p className="tabular mt-1 text-xs text-ink-3">{label(s)}</p>
            </li>
          );
        })}
      </ul>
      <div className="tabular mt-3 flex justify-between gap-1 border-t border-line pt-2 text-[11px] text-ink-3" aria-hidden>
        {ticks.map((tk, i) => (
          <span key={i} className={i % 2 === 1 ? "hidden sm:inline" : undefined}>
            {tk}
          </span>
        ))}
        <span>{l.timelineNow}</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-3">{l.timelineLegend}</p>
    </div>
  );
}

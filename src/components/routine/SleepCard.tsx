"use client";

import { Moon } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { formatNumber } from "@/lib/i18n/locale";
import { routineMessages } from "@/lib/i18n/pages/routine";
import { SLEEP_GOAL, SLEEP_LOW, dayKey, setSleep, sleepSummary, sleepWeek, useRoutine } from "@/lib/routine/routine";
import { useNow } from "@/components/body/useNow";

/** One tap per choice; the ends stand for "that or less" and "that or more". */
const OPTIONS = [
  { hours: 4, label: "≤4" },
  { hours: 5, label: "5" },
  { hours: 6, label: "6" },
  { hours: 7, label: "7" },
  { hours: 8, label: "8" },
  { hours: 9, label: "9+" },
];
const CHART_MAX = 10;
const TONE = ["text-ok", "text-warn", "text-crit"];

/** Self-reported sleep: last night in one tap, a week of nights and what the mean says. */
export function SleepCard() {
  const locale = useLocale();
  const m = routineMessages[locale].sleep;
  const routine = useRoutine();
  const now = useNow() ?? 0;

  const week = sleepWeek(routine, now || undefined);
  const summary = sleepSummary(routine, now || undefined);
  const last = now ? (routine.sleep[dayKey(now)] ?? null) : null;
  const fmt = (h: number) => formatNumber(h, Number.isInteger(h) ? 0 : 1, locale);

  return (
    <section aria-labelledby="sleep-title">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="sleep-title" className="flex items-center gap-2 text-[17px] font-bold">
          <Moon className="size-4.5 text-ink-2" aria-hidden />
          {m.title}
        </h2>
        <span className="tabular ml-auto text-base text-ink-2">{summary.avg === null ? m.empty : m.avg(formatNumber(summary.avg, 1, locale), summary.nights)}</span>
      </div>

      <div className="mt-3 rounded-3xl bg-surface p-4 shadow-card">
        <p id="sleep-ask" className="text-base font-bold">
          {m.ask}
        </p>
        <div role="radiogroup" aria-labelledby="sleep-ask" className="mt-2.5 grid grid-cols-6 gap-2">
          {OPTIONS.map((o) => {
            const on = last === o.hours;
            return (
              <button
                key={o.hours}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={m.option(o.label)}
                // Tapping the chosen one again clears the night.
                onClick={() => setSleep(on ? null : o.hours)}
                className={`tabular min-h-12 rounded-2xl text-base font-bold transition-colors ${on ? "bg-ink text-white" : "bg-sunken hover:bg-accent-soft"}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-end gap-4">
          <ul className="flex h-14 flex-1 items-end gap-1.5" aria-label={m.chart}>
            {week.map((h, i) => (
              <li key={i} className="flex h-full flex-1 items-end" aria-label={h === null ? m.noNight : m.night(fmt(h))}>
                <span
                  className={`block w-full rounded-md ${h === null ? "bg-sunken" : h < SLEEP_LOW ? "bg-crit" : h < SLEEP_GOAL ? "bg-warn" : "bg-ok"}`}
                  style={{ height: h === null ? "4px" : `${Math.max(12, (Math.min(h, CHART_MAX) / CHART_MAX) * 100)}%` }}
                />
              </li>
            ))}
          </ul>
        </div>

        {summary.avg !== null && (
          <p role={summary.level === 2 ? "alert" : undefined} className={`mt-3 text-base font-semibold ${TONE[summary.level]}`}>
            {m.level[summary.level]}
          </p>
        )}
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{m.why}</p>
      </div>
    </section>
  );
}

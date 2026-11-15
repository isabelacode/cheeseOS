"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Check, Flame } from "lucide-react";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useLocale } from "@/lib/i18n";
import { routineMessages } from "@/lib/i18n/pages/routine";
import { AUTO_MISSIONS, MISSIONS, checkinStreak, fullDays, missionsToday, setMission, useRoutine, type Mission } from "@/lib/routine/routine";
import { Card, SectionTitle } from "@/components/health/ui";
import { useNow } from "@/components/body/useNow";

/** Where an automatic mission gets done. */
const MISSION_HREF: Partial<Record<Mission, string>> = { checkin: "#report", vitals: "/sinais", exercise: "/treino" };

/**
 * Daily monitoring routine: missions, check-in streak and a week of progress.
 * `plain` is the frameless version on the Now screen: streak and progress stay in sight, hints step back.
 */
export function MissionsCard({ plain = false }: { plain?: boolean }) {
  const routine = useRoutine();
  const { entries } = useCrewSession();
  const r = routineMessages[useLocale()];
  const now = useNow() ?? 0;

  const done = missionsToday(routine, now || undefined);
  const count = MISSIONS.filter((m) => done[m]).length;
  const streak = checkinStreak(routine, now || undefined);
  const week = fullDays(routine, now || undefined);
  const resolved = useMemo(() => {
    const since = (now || 0) - 7 * 86_400_000;
    return new Set(entries.filter((e) => e.at >= since).flatMap((e) => e.resolved)).size;
  }, [entries, now]);

  const body = (
    <>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(count / MISSIONS.length) * 100}%` }} />
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {MISSIONS.map((m) => {
          const copy = r.missions[m];
          const auto = AUTO_MISSIONS.includes(m);
          const on = done[m];
          const box = (
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${on ? "border-ok bg-ok text-white" : "border-line bg-surface"}`}
              aria-hidden
            >
              {on && <Check className="size-3.5" strokeWidth={3} />}
            </span>
          );
          const text = (
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${on ? "text-ink-2" : ""}`}>{copy.label}</span>
              <span className="block text-xs leading-snug text-ink-3">
                {copy.hint}
                {auto && <span className="ml-1 rounded bg-surface px-1 text-[11px] font-medium text-ink-2">{r.auto}</span>}
              </span>
            </span>
          );
          const cls = "flex min-h-14 w-full items-start gap-3 rounded-2xl bg-sunken px-3 py-2.5 text-left transition-colors hover:bg-accent-soft";
          return (
            <li key={m}>
              {auto ? (
                <Link href={MISSION_HREF[m] ?? "/"} className={cls} aria-label={on ? `${copy.label}, ${r.doneTag}` : copy.label}>
                  {box}
                  {text}
                </Link>
              ) : (
                <button type="button" role="checkbox" aria-checked={on} aria-label={r.markDone(copy.label)} onClick={() => setMission(m, !on)} className={cls}>
                  {box}
                  {text}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-sunken px-2 py-2.5">
          <dt className="sr-only">{r.streakLabel}</dt>
          <dd className="flex items-center justify-center gap-1 text-lg font-bold tabular">
            <Flame className={`size-4 ${streak ? "text-warn" : "text-ink-3"}`} aria-hidden />
            {r.streak(streak)}
          </dd>
          <p className="text-[11px] leading-tight text-ink-3" aria-hidden>
            {r.streakLabel}
          </p>
        </div>
        <div className="rounded-2xl bg-sunken px-2 py-2.5">
          <dt className="sr-only">{r.fullDaysLabel}</dt>
          <dd className="text-lg font-bold tabular">{r.fullDays(week)}</dd>
          <p className="text-[11px] leading-tight text-ink-3" aria-hidden>
            {r.fullDaysLabel}
          </p>
        </div>
        <div className="rounded-2xl bg-sunken px-2 py-2.5">
          <dt className="sr-only">{r.resolvedLabel}</dt>
          <dd className="text-lg font-bold tabular">{r.resolved(resolved)}</dd>
          <p className="text-[11px] leading-tight text-ink-3" aria-hidden>
            {r.resolvedLabel}
          </p>
        </div>
      </dl>
      {count === MISSIONS.length && <p className="mt-2 text-center text-xs font-semibold text-ok">{r.allDone}</p>}
    </>
  );
  if (plain) {
    const tile = "flex min-h-12 w-full items-center gap-2.5 rounded-2xl bg-surface px-3 py-2 text-left text-sm font-bold shadow-card transition-colors hover:bg-accent-soft";
    return (
      <section aria-labelledby="missions-title">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id="missions-title" className="text-[17px] font-bold">
            {r.title}
          </h2>
          <p className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm">
            <Flame className={`size-4 ${streak ? "text-warn" : "text-ink-3"}`} aria-hidden />
            <span className="tabular font-bold">{r.streak(streak)}</span>
            <span className="text-ink-2">{r.streakLabel}</span>
          </p>
          <span className="tabular ml-auto text-base text-ink-2">{r.aside(count, MISSIONS.length)}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
          <div className="h-full rounded-full bg-cheese transition-[width] duration-500" style={{ width: `${(count / MISSIONS.length) * 100}%` }} />
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {MISSIONS.map((m) => {
            const copy = r.missions[m];
            const on = done[m];
            const inner = (
              <>
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-ok bg-ok text-white" : "border-ink-3 bg-surface"}`}
                  aria-hidden
                >
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className={`min-w-0 leading-tight ${on ? "text-ink-2" : ""}`}>{copy.label}</span>
              </>
            );
            return (
              <li key={m}>
                {AUTO_MISSIONS.includes(m) ? (
                  // Not a checkbox: it ticks itself once the thing is done, so the tile says how and leads there.
                  <Link
                    href={MISSION_HREF[m] ?? "/"}
                    onClick={m === "checkin" ? () => document.getElementById("report")?.focus({ preventScroll: true }) : undefined}
                    className={tile}
                    aria-label={on ? `${copy.label}, ${r.doneTag}` : `${copy.label}. ${copy.hint}`}
                  >
                    {on ? (
                      inner
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 leading-tight">
                          {copy.label}
                          <span className="mt-0.5 block text-[13px] font-normal text-ink-2">{copy.hint}</span>
                        </span>
                        <ArrowRight className="size-5 shrink-0 text-accent-ink" aria-hidden />
                      </>
                    )}
                  </Link>
                ) : (
                  <button type="button" role="checkbox" aria-checked={on} aria-label={r.markDone(copy.label)} title={copy.hint} onClick={() => setMission(m, !on)} className={tile}>
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="tabular mt-3 text-sm text-ink-2">
          {count === MISSIONS.length && <span className="mr-2 font-bold text-ok">{r.allDone}</span>}
          {r.fullDays(week)} {r.fullDaysLabel} · {r.resolved(resolved)} {r.resolvedLabel}
        </p>
      </section>
    );
  }
  return (
    <Card aria-labelledby="missions-title">
      <SectionTitle aside={r.aside(count, MISSIONS.length)}>
        <span id="missions-title">{r.title}</span>
      </SectionTitle>
      {body}
    </Card>
  );
}

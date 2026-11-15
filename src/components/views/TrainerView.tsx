"use client";

import { useState } from "react";
import { Camera, Check, ShieldAlert } from "lucide-react";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useLocale } from "@/lib/i18n";
import { trainerMessages } from "@/lib/i18n/pages/trainer";
import { EXERCISES, type ExerciseId } from "@/lib/exercise/exercises";
import { exerciseStats, leastDone, neglected, useExerciseHistory } from "@/lib/exercise/history";
import { missionWeek, missionsToday, setMission, useRoutine } from "@/lib/routine/routine";
import { relativeTime, useNow } from "@/components/body/useNow";
import { TrainerSession } from "@/components/trainer/TrainerSession";

/** The astronaut's personal trainer: pick an exercise, the camera counts the set. */
export function TrainerView() {
  const locale = useLocale();
  const m = trainerMessages[locale];
  const { status } = useCrewSession();
  const history = useExerciseHistory();
  const routine = useRoutine();
  const now = useNow();
  const [active, setActive] = useState<{ id: ExerciseId; run: number; intro: boolean } | null>(null);

  const stats = exerciseStats(history, now);
  const order = leastDone(stats);
  const behind = new Set(neglected(stats));
  const top = Math.max(1, ...order.map((id) => stats[id].reps));
  const weekReps = order.reduce((s, id) => s + stats[id].reps, 0);
  const weekSets = order.reduce((s, id) => s + stats[id].sessions, 0);
  const doneToday = missionsToday(routine, now || undefined).exercise;
  const week = missionWeek(routine, "exercise", now || undefined);
  const weekDays = week.filter(Boolean).length;
  const critical = status === "critical";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 lg:pt-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{m.title}</h1>
        <p className="mt-1.5 text-lg text-ink-2">{m.intro}</p>
        <p className="tabular mt-3 text-base font-bold">{weekSets ? m.week(weekReps, weekSets) : m.weekEmpty}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface px-4 py-3 shadow-card">
          <span className="flex gap-1.5" aria-hidden>
            {week.map((done, i) => (
              <span key={i} className={`size-3.5 rounded-full ${done ? "bg-ok" : "bg-sunken"}`} />
            ))}
          </span>
          <span className="min-w-0">
            <span className={`tabular block text-base font-bold ${weekDays >= 6 ? "text-ok" : ""}`}>{m.days(weekDays)}</span>
            <span className="block text-sm text-ink-2">{m.daysGoal}</span>
          </span>
        </div>
      </div>

      {critical && (
        <p role="alert" className="flex items-start gap-3 rounded-2xl bg-crit px-4 py-3 text-base font-semibold text-white">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {m.critical}
        </p>
      )}

      <section aria-labelledby="exercises-title">
        <h2 id="exercises-title" className="text-[17px] font-bold">
          {m.listTitle}
        </h2>
        <p className="mt-0.5 text-base text-ink-2">{m.orderHint}</p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {order.map((id) => {
            const copy = m.exercises[id];
            const st = stats[id];
            const ex = EXERCISES[id];
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={critical}
                  onClick={() => setActive({ id, run: 0, intro: true })}
                  aria-label={m.start(copy.name)}
                  className="group flex w-full items-center gap-4 rounded-3xl bg-surface p-4 text-left shadow-card transition-colors hover:bg-accent-soft disabled:opacity-50 disabled:hover:bg-surface"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="text-lg font-bold">{copy.name}</span>
                      {behind.has(id) && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-sm font-bold text-warn">{m.least}</span>}
                    </span>
                    <span className="mt-0.5 block text-base text-ink-2">
                      {copy.muscles} · {m.kind[ex.kind]} · {m.target(ex.target)}
                    </span>
                    <span className="mt-2.5 block h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
                      <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(st.reps / top) * 100}%` }} />
                    </span>
                    <span className="tabular mt-1.5 block text-sm text-ink-2">
                      {st.lastAt === null ? m.never : `${m.reps7(st.reps)} · ${m.last(relativeTime(st.lastAt, now, locale))}`}
                    </span>
                  </span>
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-cheese text-cheese-ink transition-transform group-hover:scale-105 group-disabled:scale-100" aria-hidden>
                    <Camera className="size-5" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm text-ink-2">{m.privacy}</p>
      </section>

      <section className="border-t border-line pt-5">
        <button
          type="button"
          role="checkbox"
          aria-checked={doneToday}
          disabled={critical}
          onClick={() => setMission("exercise", !doneToday)}
          className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left shadow-card transition-colors hover:bg-accent-soft disabled:opacity-50"
        >
          <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${doneToday ? "border-ok bg-ok text-white" : "border-ink-3 bg-surface"}`} aria-hidden>
            {doneToday && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold">{doneToday ? m.manual.done : m.manual.label}</span>
            {!doneToday && <span className="block text-sm text-ink-2">{m.manual.hint}</span>}
          </span>
        </button>
        <p className="mt-5 text-base leading-relaxed text-ink-2">{m.why}</p>
      </section>

      {active && !critical && (
        <TrainerSession
          key={`${active.id}-${active.run}`}
          id={active.id}
          intro={active.intro}
          // The next suggestion keeps following the ranking: the least done one that is not this exercise.
          next={order.find((id) => id !== active.id) ?? null}
          onClose={() => setActive(null)}
          onAgain={() => setActive({ id: active.id, run: active.run + 1, intro: false })}
          onNext={(id) => setActive({ id, run: 0, intro: true })}
        />
      )}
    </div>
  );
}

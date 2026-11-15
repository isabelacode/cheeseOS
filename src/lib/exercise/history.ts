import { useSyncExternalStore } from "react";
import { EXERCISE_IDS, isExerciseId, type ExerciseId } from "./exercises";

/**
 * Training history: one record per finished set. Lives only in this browser's
 * localStorage, like the rest of the crew member's data. No video is kept.
 */
export interface ExerciseSession {
  id: string;
  at: number;
  exercise: ExerciseId;
  reps: number;
  /** Repetitions through the full range. */
  good: number;
  /** Mean time per repetition. */
  avgMs: number;
  /** Counted by the camera (false: tapped in by hand). */
  tracked: boolean;
}

export const EXERCISE_KEY = "cheeseos.exercise.v1";
const KEEP = 400;
const DAY = 86_400_000;
const EMPTY: ExerciseSession[] = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: ExerciseSession[] = EMPTY;
/** Used when storage is blocked: the history lives in memory for the session. */
let memory: ExerciseSession[] | null = null;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

/** Drops anything an older or corrupt save got wrong. */
export function sanitizeSessions(input: unknown): ExerciseSession[] {
  if (!Array.isArray(input)) return EMPTY;
  const out: ExerciseSession[] = [];
  for (const v of input) {
    if (typeof v !== "object" || v === null) continue;
    const s = v as Record<string, unknown>;
    if (typeof s.id !== "string" || typeof s.at !== "number" || !isExerciseId(s.exercise) || num(s.reps) < 1) continue;
    const reps = Math.round(num(s.reps));
    out.push({ id: s.id, at: s.at, exercise: s.exercise, reps, good: Math.min(reps, Math.round(num(s.good))), avgMs: num(s.avgMs), tracked: s.tracked !== false });
  }
  return out;
}

function read(): ExerciseSession[] {
  if (memory) return memory;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(EXERCISE_KEY);
  } catch {
    /* blocked */
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    cached = raw ? sanitizeSessions(JSON.parse(raw)) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

export function addSession(session: Omit<ExerciseSession, "id">) {
  const next = [...read(), { ...session, id: crypto.randomUUID() }].slice(-KEEP);
  try {
    window.localStorage.setItem(EXERCISE_KEY, JSON.stringify(next));
    memory = null;
  } catch {
    memory = next;
  }
  listeners.forEach((l) => l());
}

/** Forget the history (storage is cleared by the caller): drops the in-memory fallback and notifies readers. */
export function resetExerciseHistory() {
  memory = null;
  cachedRaw = undefined;
  cached = EMPTY;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === EXERCISE_KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useExerciseHistory(): ExerciseSession[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export interface ExerciseStat {
  /** Repetitions inside the window. */
  reps: number;
  /** Sets inside the window. */
  sessions: number;
  /** Last time it was done, in or out of the window. */
  lastAt: number | null;
}

/**
 * Per exercise: volume over the last `span` days and when it was last done.
 * No upper bound on purpose: `now` may come from a coarse clock that lags a set just saved.
 */
export function exerciseStats(sessions: ExerciseSession[], now: number, span = 7): Record<ExerciseId, ExerciseStat> {
  const stats = Object.fromEntries(EXERCISE_IDS.map((id) => [id, { reps: 0, sessions: 0, lastAt: null }])) as Record<ExerciseId, ExerciseStat>;
  const since = now - span * DAY;
  for (const s of sessions) {
    const st = stats[s.exercise];
    if (s.at > since) {
      st.reps += s.reps;
      st.sessions += 1;
    }
    if (st.lastAt === null || s.at > st.lastAt) st.lastAt = s.at;
  }
  return stats;
}

/**
 * Exercises ordered from the least done: fewest repetitions in the window
 * first, then the one left alone the longest (never done comes first).
 */
export function leastDone(stats: Record<ExerciseId, ExerciseStat>): ExerciseId[] {
  return [...EXERCISE_IDS].sort((a, b) => stats[a].reps - stats[b].reps || (stats[a].lastAt ?? 0) - (stats[b].lastAt ?? 0));
}

/**
 * The exercises to call out as neglected: up to `max` from the top of the
 * ranking, and only those that are really behind the most trained one.
 */
export function neglected(stats: Record<ExerciseId, ExerciseStat>, max = 2): ExerciseId[] {
  const top = Math.max(...EXERCISE_IDS.map((id) => stats[id].reps));
  if (top === 0) return [];
  return leastDone(stats)
    .filter((id) => stats[id].reps < top)
    .slice(0, max);
}

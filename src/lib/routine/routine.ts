import { useSyncExternalStore } from "react";

/**
 * Daily missions, check-in streak and local reminders. Everything lives in
 * this browser's localStorage; nothing is sent anywhere. Reminders fire while
 * the app is open (in-app notice, plus a system notification when allowed).
 */

export const MISSIONS = ["checkin", "vitals", "exercise", "hydration"] as const;
export type Mission = (typeof MISSIONS)[number];

/** Missions completed by using the app; the others are ticked by the crew member. */
export const AUTO_MISSIONS: Mission[] = ["checkin", "vitals"];

export const REMINDER_IDS = ["checkin", "vitals", "exercise", "hydration", "medication"] as const;
export type ReminderId = (typeof REMINDER_IDS)[number];

export interface Reminder {
  id: ReminderId;
  enabled: boolean;
  /** Local time of day, "HH:MM". */
  time: string;
}

export interface RoutineState {
  /** Per local day ("YYYY-MM-DD"): missions completed that day. */
  days: Record<string, Partial<Record<Mission, number>>>;
  reminders: Reminder[];
  /** Last day each reminder was shown, so it fires once a day. */
  fired: Partial<Record<ReminderId, string>>;
  /** Also show a system notification (needs browser permission). */
  notify: boolean;
  /** First time reminders were checked on this device: earlier times of that day stay quiet. */
  since?: number;
}

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: "checkin", enabled: true, time: "08:00" },
  { id: "vitals", enabled: false, time: "12:00" },
  { id: "exercise", enabled: true, time: "15:00" },
  { id: "hydration", enabled: false, time: "10:00" },
  { id: "medication", enabled: false, time: "21:00" },
];

const KEY = "cheeseos.routine.v1";
const KEEP_DAYS = 90;
const EMPTY: RoutineState = { days: {}, reminders: DEFAULT_REMINDERS, fired: {}, notify: false };

export function dayKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The same wall-clock time `n` calendar days earlier (local days are 23-25 h around daylight saving changes). */
function daysBefore(ms: number, n: number) {
  const d = new Date(ms);
  d.setDate(d.getDate() - n);
  return d.getTime();
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const VALID_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: RoutineState = EMPTY;
/** Used when storage is blocked: the state lives in memory for the session. */
let memory: RoutineState | null = null;

/** Each field is checked on its own, so one old or corrupt field does not wipe the mission history. */
function sanitize(input: unknown): RoutineState {
  const v = isRecord(input) ? (input as Partial<RoutineState>) : {};
  const list: unknown[] = Array.isArray(v.reminders) ? v.reminders : [];
  const saved = new Map(list.filter(isRecord).map((r) => [r.id, r]));
  return {
    days: isRecord(v.days) ? (Object.fromEntries(Object.entries(v.days).filter(([, d]) => isRecord(d))) as RoutineState["days"]) : {},
    reminders: DEFAULT_REMINDERS.map((d) => {
      const r = saved.get(d.id);
      return r && typeof r.time === "string" && VALID_TIME.test(r.time) ? { id: d.id, enabled: Boolean(r.enabled), time: r.time } : d;
    }),
    fired: isRecord(v.fired) ? v.fired : {},
    notify: Boolean(v.notify),
    since: typeof v.since === "number" ? v.since : undefined,
  };
}

function read(): RoutineState {
  if (memory) return memory;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    /* blocked */
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    cached = raw ? sanitize(JSON.parse(raw)) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function write(next: RoutineState) {
  const keys = Object.keys(next.days).sort();
  const days = Object.fromEntries(keys.slice(-KEEP_DAYS).map((k) => [k, next.days[k]]));
  const value = { ...next, days };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
    memory = null;
  } catch {
    memory = value;
  }
  listeners.forEach((l) => l());
}

/** Forget the routine (storage is cleared by the caller): drops the in-memory fallback and notifies readers. */
export function resetRoutine() {
  memory = null;
  cachedRaw = undefined;
  cached = EMPTY;
  listeners.forEach((l) => l());
}

export function updateRoutine(fn: (s: RoutineState) => RoutineState) {
  write(fn(read()));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useRoutine(): RoutineState {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Mark a mission done (or undone) for the day of `at`. No-op when nothing changes. */
export function setMission(mission: Mission, done: boolean, at = Date.now()) {
  const day = dayKey(at);
  const cur = read();
  if (Boolean(cur.days[day]?.[mission]) === done) return;
  const today = { ...(cur.days[day] ?? {}) };
  if (done) today[mission] = at;
  else delete today[mission];
  write({ ...cur, days: { ...cur.days, [day]: today } });
}

export function setReminder(id: ReminderId, patch: Partial<Omit<Reminder, "id">>) {
  updateRoutine((s) => ({ ...s, reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
}

export function markFired(ids: ReminderId[], at = Date.now()) {
  if (!ids.length) return;
  const day = dayKey(at);
  updateRoutine((s) => ({ ...s, fired: { ...s.fired, ...Object.fromEntries(ids.map((id) => [id, day])) } }));
}

/** Start the reminder clock on first use, so a fresh install is not greeted by every past reminder. */
export function ensureSince(at = Date.now()) {
  if (read().since === undefined) updateRoutine((s) => ({ ...s, since: at }));
}

export function setNotify(notify: boolean) {
  updateRoutine((s) => ({ ...s, notify }));
}

/** Consecutive days with a health check-in, ending today (or yesterday if today is still open). */
export function checkinStreak(s: RoutineState, now = Date.now()): number {
  const has = (ms: number) => Boolean(s.days[dayKey(ms)]?.checkin);
  const start = has(now) ? 0 : 1;
  let n = 0;
  while (n < KEEP_DAYS && has(daysBefore(now, start + n))) n++;
  return n;
}

/** Days in the last `span` days with every mission done. */
export function fullDays(s: RoutineState, now = Date.now(), span = 7): number {
  let n = 0;
  for (let i = 0; i < span; i++) {
    const d = s.days[dayKey(daysBefore(now, i))] ?? {};
    if (MISSIONS.every((m) => d[m])) n++;
  }
  return n;
}

export function missionsToday(s: RoutineState, now = Date.now()): Record<Mission, boolean> {
  const d = s.days[dayKey(now)] ?? {};
  return Object.fromEntries(MISSIONS.map((m) => [m, Boolean(d[m])])) as Record<Mission, boolean>;
}

/** The mission a reminder is about, if any: a reminder whose mission is already done stays quiet. */
export const REMINDER_MISSION: Partial<Record<ReminderId, Mission>> = {
  checkin: "checkin",
  vitals: "vitals",
  exercise: "exercise",
  hydration: "hydration",
};

function minutesOf(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Reminders whose time has passed today, not yet shown today, and whose mission is still open. */
export function dueReminders(s: RoutineState, now = Date.now()): ReminderId[] {
  const d = new Date(now);
  const minutes = d.getHours() * 60 + d.getMinutes();
  const day = dayKey(now);
  const done = missionsToday(s, now);
  const since = s.since ?? now;
  /** Epoch ms of a reminder's wall-clock time today (not midnight + minutes, which drifts on daylight saving days). */
  const timeToday = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
  };
  return s.reminders
    .filter((r) => r.enabled && minutesOf(r.time) <= minutes && s.fired[r.id] !== day)
    .filter((r) => timeToday(r.time) >= since)
    .filter((r) => {
      const m = REMINDER_MISSION[r.id];
      return !m || !done[m];
    })
    .map((r) => r.id);
}

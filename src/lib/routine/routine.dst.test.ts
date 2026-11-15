import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_REMINDERS, checkinStreak, dayKey, dueReminders, fullDays, type RoutineState } from "./routine";

// A zone with daylight saving: some local days last 23 h or 25 h.
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "America/New_York";
});
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

const state = (p: Partial<RoutineState> = {}): RoutineState => ({ days: {}, reminders: DEFAULT_REMINDERS, fired: {}, notify: false, ...p });
const full = { checkin: 1, vitals: 1, exercise: 1, hydration: 1 };

describe("calendar days across daylight saving changes", () => {
  it("does not skip the 23-hour spring-forward day in the streak", () => {
    // 2026-03-08 is the spring-forward day in New York.
    const now = new Date(2026, 2, 9, 0, 30).getTime();
    const days = { "2026-03-09": { checkin: 1 }, "2026-03-08": { checkin: 1 }, "2026-03-07": { checkin: 1 } };
    expect(checkinStreak(state({ days }), now)).toBe(3);
  });

  it("does not count the 25-hour fall-back day twice", () => {
    // 2026-11-01 is the fall-back day in New York.
    const now = new Date(2026, 10, 1, 23, 30).getTime();
    expect(dayKey(now)).toBe("2026-11-01");
    expect(checkinStreak(state({ days: { "2026-11-01": { checkin: 1 } } }), now)).toBe(1);
    expect(fullDays(state({ days: { "2026-11-01": full } }), now)).toBe(1);
  });

  it("uses the reminder's wall-clock time on a daylight saving day", () => {
    // On the spring-forward day 08:00 is only 7 h after midnight: a first use at 08:30 already missed it.
    const since = new Date(2026, 2, 8, 8, 30).getTime();
    expect(dueReminders(state({ since }), new Date(2026, 2, 8, 8, 45).getTime())).toEqual([]);
    expect(dueReminders(state({ since: new Date(2026, 2, 8, 7, 30).getTime() }), new Date(2026, 2, 8, 8, 1).getTime())).toEqual(["checkin"]);
  });
});

describe("stored routine", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("keeps the mission history when one stored field has an old or corrupt shape", async () => {
    const store = new Map<string, string>([
      ["cheeseos.routine.v1", JSON.stringify({ days: { "2026-11-13": { checkin: 5 } }, reminders: { checkin: "08:00" }, fired: {}, notify: true })],
    ]);
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) },
    });
    const { updateRoutine } = await import("./routine");
    let seen: RoutineState | null = null;
    updateRoutine((s) => (seen = s));
    expect(seen!.days["2026-11-13"]).toEqual({ checkin: 5 });
    expect(seen!.notify).toBe(true);
    expect(seen!.reminders).toEqual(DEFAULT_REMINDERS);
  });

  it("ignores impossible reminder times", async () => {
    const store = new Map<string, string>([
      ["cheeseos.routine.v1", JSON.stringify({ reminders: [{ id: "checkin", enabled: true, time: "99:99" }] })],
    ]);
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) },
    });
    const { updateRoutine } = await import("./routine");
    let seen: RoutineState | null = null;
    updateRoutine((s) => (seen = s));
    expect(seen!.reminders.find((r) => r.id === "checkin")!.time).toBe("08:00");
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_REMINDERS, checkinStreak, dayKey, dueReminders, fullDays, missionWeek, sleepSummary, sleepWeek, type RoutineState } from "./routine";
import { buildExport, buildHtml, type ReportArgs } from "@/components/log/logData";
import { messages } from "@/lib/i18n/messages";
import { logMessages } from "@/lib/i18n/pages/log";
import { BASELINE } from "@/lib/health/vitals";
import { safetyAlerts } from "@/lib/health/safety";
import { adviceOf } from "@/lib/health/advice";
import { extractSymptoms, mergeFindings } from "@/lib/health/symptoms";

const DAY = 86_400_000;
const at = (h: number, m = 0, dayOffset = 0) => {
  const d = new Date(2026, 10, 14 + dayOffset, h, m);
  return d.getTime();
};
const state = (p: Partial<RoutineState> = {}): RoutineState => ({ days: {}, reminders: DEFAULT_REMINDERS, fired: {}, notify: false, sleep: {}, ...p });

describe("streak and progress", () => {
  it("counts consecutive check-in days, tolerating an open today", () => {
    const now = at(9);
    const days = Object.fromEntries([1, 2, 3].map((i) => [dayKey(now - i * DAY), { checkin: 1 }]));
    expect(checkinStreak(state({ days }), now)).toBe(3);
    expect(checkinStreak(state({ days: { ...days, [dayKey(now)]: { checkin: 1 } } }), now)).toBe(4);
    expect(checkinStreak(state({ days: { [dayKey(now - 2 * DAY)]: { checkin: 1 } } }), now)).toBe(0);
  });
  it("counts complete days in the last week", () => {
    const now = at(9);
    const full = { checkin: 1, vitals: 1, exercise: 1, hydration: 1 };
    expect(fullDays(state({ days: { [dayKey(now)]: full, [dayKey(now - DAY)]: { checkin: 1 } } }), now)).toBe(1);
  });
  it("lists a mission day by day over the last week, oldest first", () => {
    const now = at(9);
    const days = { [dayKey(now)]: { exercise: 1 }, [dayKey(now - 2 * DAY)]: { exercise: 1, checkin: 1 }, [dayKey(now - 7 * DAY)]: { exercise: 1 } };
    expect(missionWeek(state({ days }), "exercise", now)).toEqual([false, false, false, false, true, false, true]);
    expect(missionWeek(state({ days }), "checkin", now).filter(Boolean)).toHaveLength(1);
  });
});

describe("sleep", () => {
  const now = at(9);
  it("lists the last seven nights, oldest first, with gaps", () => {
    const sleep = { [dayKey(now)]: 6, [dayKey(now - 2 * DAY)]: 8, [dayKey(now - 7 * DAY)]: 9 };
    expect(sleepWeek(state({ sleep }), now)).toEqual([null, null, null, null, 8, null, 6]);
  });
  it("averages only the reported nights and grades the mean", () => {
    expect(sleepSummary(state(), now)).toEqual({ nights: 0, avg: null, level: 0 });
    expect(sleepSummary(state({ sleep: { [dayKey(now)]: 8, [dayKey(now - DAY)]: 7 } }), now)).toEqual({ nights: 2, avg: 7.5, level: 0 });
    expect(sleepSummary(state({ sleep: { [dayKey(now)]: 6, [dayKey(now - DAY)]: 7 } }), now).level).toBe(1);
    // One or two short nights are only "under the goal"; the loss alert needs three.
    expect(sleepSummary(state({ sleep: { [dayKey(now)]: 5, [dayKey(now - DAY)]: 4 } }), now).level).toBe(1);
    expect(sleepSummary(state({ sleep: { [dayKey(now)]: 5, [dayKey(now - DAY)]: 6, [dayKey(now - 2 * DAY)]: 5 } }), now).level).toBe(2);
  });
});

describe("reminders", () => {
  it("fires a reminder once its time passes, once a day, unless the mission is done", () => {
    const s = state({ since: at(0) });
    expect(dueReminders(s, at(7, 59))).toEqual([]);
    expect(dueReminders(s, at(8, 1))).toEqual(["checkin"]);
    expect(dueReminders(state({ since: at(0), fired: { checkin: dayKey(at(8)) } }), at(8, 30))).toEqual([]);
    expect(dueReminders(state({ since: at(0), days: { [dayKey(at(8))]: { checkin: 1 } } }), at(8, 30))).toEqual([]);
  });
  it("stays quiet about times that passed before the first use", () => {
    expect(dueReminders(state({ since: at(16) }), at(16, 5))).toEqual([]);
    expect(dueReminders(state({ since: at(16) }), at(8, 1, 1))).toEqual(["checkin"]);
  });
});

describe("flight surgeon report", () => {
  const now = at(10);
  const t = messages.pt;
  const entries = [
    { id: "a", text: "tomei dipirona", at: now - 120_000, source: "typed" as const, findings: [], resolved: [] },
    { id: "b", text: "estou com febre", at: now - 60_000, source: "typed" as const, findings: ["fever" as const], resolved: [] },
  ];
  const findings = mergeFindings([], extractSymptoms("estou com febre", "pt", now - 60_000));
  const profile = {
    name: "Ana Souza", role: "Engenheiro de voo", mission: "Ares III", age: 34, sex: "feminino" as const, heightCm: 168, weightKg: 62,
    bloodType: "O+" as const, restingHeartRate: 64, allergies: "dipirona", medications: "", conditions: "",
  };
  const args: ReportArgs = {
    profile, findings, entries, locale: "pt", t, l: logMessages.pt, now, status: "attention",
    safety: safetyAlerts({ allergies: "dipirona", medications: "", entries, findings, adviceFor: (f) => adviceOf(f, t), now }),
    vitals: { ...BASELINE, temperature: 38.4 }, trend: [{ ...BASELINE, at: now - 600_000 }, { ...BASELINE, temperature: 38.4, at: now }],
    streak: 2, missionsDone: 1, missionsTotal: 4,
  };

  it("includes alerts, evolution, simulated vitals and the log", () => {
    const text = buildExport(args);
    expect(text).toContain("ALERTAS DE SEGURANÇA");
    expect(text).toContain("dipirona");
    expect(text).toContain("EVOLUÇÃO DOS SINTOMAS");
    expect(text).toContain("SINAIS VITAIS — SIMULADOS");
    expect(text).toMatch(/Temperatura \(°C\)\s+38,4\s+36,6\s+38,4/);
    expect(text).toContain("Riscos NASA");
    expect(text).toContain('"tomei dipirona"');
  });

  it("escapes report text in the HTML version", () => {
    const html = buildHtml({ ...args, entries: [{ ...entries[0], text: "<script>x</script>" }] });
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

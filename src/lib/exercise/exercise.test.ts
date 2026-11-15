import { describe, expect, it } from "vitest";
import { EXERCISES, EXERCISE_IDS } from "./exercises";
import { exerciseStats, leastDone, neglected, sanitizeSessions, type ExerciseSession } from "./history";
import { LM, REP_START, angleAt, jointAngle, stepRep, summarize, type Point, type RepEvent, type RepRule } from "./pose";

const p = (x: number, y: number, z = 0, visibility = 1): Point => ({ x, y, z, visibility });

/** Feeds a list of angles, 100 ms apart, holding each for a few frames so the smoothing settles. */
function run(rule: RepRule, angles: number[], hold = 6) {
  let state = REP_START;
  const reps: RepEvent[] = [];
  let at = 0;
  for (const a of angles) {
    for (let i = 0; i < hold; i++) {
      const out = stepRep(state, rule, a, (at += 100));
      state = out.state;
      if (out.rep) reps.push(out.rep);
    }
  }
  return reps;
}

describe("joint angles", () => {
  it("measures the angle at the middle point", () => {
    expect(angleAt(p(0, 1), p(0, 0), p(0, -1))).toBeCloseTo(180);
    expect(angleAt(p(0, 1), p(0, 0), p(1, 0))).toBeCloseTo(90);
    expect(angleAt(p(0, 1), p(0, 0), p(0, 0, 1))).toBeCloseTo(90);
  });

  it("uses only the sides in view and returns null with none", () => {
    const pose: Point[] = Array.from({ length: 33 }, () => p(0, 0, 0, 0));
    expect(jointAngle(pose, "knee", "avg")).toBeNull();
    // Left leg straight and visible; right leg bent but hidden.
    pose[LM.leftHip] = p(0, 0);
    pose[LM.leftKnee] = p(0, 1);
    pose[LM.leftAnkle] = p(0, 2);
    pose[LM.rightHip] = p(1, 0, 0, 0.1);
    pose[LM.rightKnee] = p(1, 1, 0, 0.1);
    pose[LM.rightAnkle] = p(2, 1, 0, 0.1);
    expect(jointAngle(pose, "knee", "avg")).toBeCloseTo(180);
    // Both in view: the average, or the more bent one.
    for (const i of [LM.rightHip, LM.rightKnee, LM.rightAnkle]) pose[i] = { ...pose[i], visibility: 1 };
    expect(jointAngle(pose, "knee", "avg")).toBeCloseTo(135);
    expect(jointAngle(pose, "knee", "min")).toBeCloseTo(90);
  });
});

describe("rep counter", () => {
  const squat = EXERCISES.squat.rule;

  it("counts a repetition only after returning to the resting position", () => {
    expect(run(squat, [175, 90])).toHaveLength(0);
    expect(run(squat, [175, 90, 175])).toHaveLength(1);
    expect(run(squat, [175, 90, 175, 90, 175, 90, 175])).toHaveLength(3);
  });

  it("ignores a movement that never reaches the working angle", () => {
    expect(run(squat, [175, 130, 175, 135, 175])).toHaveLength(0);
  });

  it("does not double count when trembling around a threshold", () => {
    expect(run(squat, [175, 114, 117, 113, 118, 112, 175], 2)).toHaveLength(1);
  });

  it("flags shallow and rushed repetitions", () => {
    const [shallow] = run(squat, [175, 110, 175]);
    expect(shallow.good).toBe(false);
    const [deep] = run(squat, [175, 85, 175], 20);
    expect(deep.good).toBe(true);
    expect(deep.rushed).toBe(false);
    expect(deep.peak).toBeLessThan(90);
    const [fast] = run(squat, [175, 85, 175], 3);
    expect(fast.rushed).toBe(true);
  });

  it("counts movements whose angle grows, like the shoulder press", () => {
    const reps = run(EXERCISES.press.rule, [80, 170, 80, 150, 80]);
    expect(reps.map((r) => r.good)).toEqual([true, false]);
  });

  it("never calls an aerobic repetition rushed", () => {
    const reps = run(EXERCISES.highKnees.rule, [175, 100, 175, 100, 175], 2);
    expect(reps).toHaveLength(2);
    expect(reps.every((r) => !r.rushed)).toBe(true);
  });

  it("summarizes a set", () => {
    expect(summarize([])).toEqual({ reps: 0, good: 0, avgMs: 0 });
    const s = summarize([
      { peak: 90, ms: 2000, good: true, rushed: false },
      { peak: 110, ms: 1000, good: false, rushed: true },
    ]);
    expect(s).toEqual({ reps: 2, good: 1, avgMs: 1500 });
  });

  it("every exercise has a reachable rule", () => {
    for (const id of EXERCISE_IDS) {
      const r = EXERCISES[id].rule;
      const dir = r.work < r.rest ? -1 : 1;
      expect(dir * r.work, id).toBeGreaterThan(dir * r.rest);
      expect(dir * r.good, id).toBeGreaterThan(dir * r.work);
    }
  });
});

describe("training history", () => {
  const DAY = 86_400_000;
  const now = 100 * DAY;
  const s = (exercise: ExerciseSession["exercise"], reps: number, daysAgo: number): ExerciseSession => ({
    id: `${exercise}-${daysAgo}`,
    at: now - daysAgo * DAY,
    exercise,
    reps,
    good: reps,
    avgMs: 2000,
    tracked: true,
  });

  it("counts volume inside the window and remembers the last time", () => {
    const stats = exerciseStats([s("squat", 12, 1), s("squat", 10, 3), s("squat", 12, 10), s("curl", 8, 20)], now);
    expect(stats.squat).toEqual({ reps: 22, sessions: 2, lastAt: now - DAY });
    expect(stats.curl).toEqual({ reps: 0, sessions: 0, lastAt: now - 20 * DAY });
    expect(stats.press).toEqual({ reps: 0, sessions: 0, lastAt: null });
  });

  it("ranks the least done first, then the longest left alone", () => {
    const stats = exerciseStats([s("squat", 30, 1), s("press", 5, 2), s("curl", 12, 20), s("deadlift", 12, 9)], now);
    // lunge and highKnees were never done; deadlift was left alone longer than curl; then press, then squat.
    expect(leastDone(stats)).toEqual(["lunge", "highKnees", "curl", "deadlift", "press", "squat"]);
  });

  it("calls out neglected exercises only when some are behind", () => {
    expect(neglected(exerciseStats([], now))).toEqual([]);
    const even = EXERCISE_IDS.map((id) => s(id, 10, 1));
    expect(neglected(exerciseStats(even, now))).toEqual([]);
    expect(neglected(exerciseStats([...even, s("squat", 10, 2), s("curl", 5, 2)], now))).toHaveLength(2);
    expect(neglected(exerciseStats([s("squat", 10, 1)], now))).toEqual(["deadlift", "lunge"]);
  });

  it("drops corrupt records", () => {
    const ok = s("squat", 12, 1);
    expect(sanitizeSessions([ok, null, { ...ok, exercise: "yoga" }, { ...ok, reps: 0 }, { ...ok, at: "x" }, { ...ok, good: 99 }])).toEqual([ok, { ...ok, good: 12 }]);
    expect(sanitizeSessions("nope")).toEqual([]);
  });
});

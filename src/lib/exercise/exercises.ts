import type { RepRule } from "./pose";

/**
 * Exercises the camera can follow. They mirror the crew's countermeasure
 * routine: resistive work (the ARED movements) plus an aerobic drill.
 * Names, muscles and setup tips live in the i18n messages.
 */
export const EXERCISE_IDS = ["squat", "deadlift", "lunge", "press", "curl", "highKnees"] as const;
export type ExerciseId = (typeof EXERCISE_IDS)[number];

export type ExerciseKind = "resistive" | "aerobic";

export interface Exercise {
  id: ExerciseId;
  kind: ExerciseKind;
  /** Repetitions for one set. */
  target: number;
  rule: RepRule;
}

/** Angles in degrees, measured on the 3D landmarks so they hold from the front or the side. */
export const EXERCISES: Record<ExerciseId, Exercise> = {
  squat: { id: "squat", kind: "resistive", target: 12, rule: { joint: "knee", combine: "avg", rest: 155, work: 115, good: 100, minMs: 1500 } },
  deadlift: { id: "deadlift", kind: "resistive", target: 10, rule: { joint: "hip", combine: "avg", rest: 160, work: 125, good: 110, minMs: 1500 } },
  lunge: { id: "lunge", kind: "resistive", target: 12, rule: { joint: "knee", combine: "min", rest: 155, work: 115, good: 100, minMs: 1500 } },
  press: { id: "press", kind: "resistive", target: 12, rule: { joint: "shoulder", combine: "avg", rest: 105, work: 145, good: 158, minMs: 1500 } },
  curl: { id: "curl", kind: "resistive", target: 12, rule: { joint: "elbow", combine: "avg", rest: 140, work: 75, good: 60, minMs: 1500 } },
  highKnees: { id: "highKnees", kind: "aerobic", target: 30, rule: { joint: "hip", combine: "min", rest: 155, work: 125, good: 110, minMs: 0 } },
};

export function isExerciseId(v: unknown): v is ExerciseId {
  return (EXERCISE_IDS as readonly unknown[]).includes(v);
}

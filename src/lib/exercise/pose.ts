/**
 * Joint angles and repetition counting from body landmarks. Pure math, no camera:
 * the pose tracker feeds one landmark set per video frame.
 */

export interface Point {
  x: number;
  y: number;
  z: number;
  /** 0..1 confidence that the point is in view. */
  visibility?: number;
}

/** MediaPipe Pose landmark indices used here. */
export const LM = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export type Joint = "knee" | "hip" | "elbow" | "shoulder";

/** Per joint, the three landmarks (left side, right side) whose middle point holds the angle. */
export const JOINT_POINTS: Record<Joint, [number, number, number][]> = {
  knee: [
    [LM.leftHip, LM.leftKnee, LM.leftAnkle],
    [LM.rightHip, LM.rightKnee, LM.rightAnkle],
  ],
  hip: [
    [LM.leftShoulder, LM.leftHip, LM.leftKnee],
    [LM.rightShoulder, LM.rightHip, LM.rightKnee],
  ],
  elbow: [
    [LM.leftShoulder, LM.leftElbow, LM.leftWrist],
    [LM.rightShoulder, LM.rightElbow, LM.rightWrist],
  ],
  shoulder: [
    [LM.leftHip, LM.leftShoulder, LM.leftElbow],
    [LM.rightHip, LM.rightShoulder, LM.rightElbow],
  ],
};

export const MIN_VISIBILITY = 0.5;

/** Angle at `b` between the segments to `a` and `c`, in degrees (0..180). */
export function angleAt(a: Point, b: Point, c: Point): number {
  const u = [a.x - b.x, a.y - b.y, a.z - b.z];
  const v = [c.x - b.x, c.y - b.y, c.z - b.z];
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const len = Math.hypot(...u) * Math.hypot(...v);
  if (!len) return 180;
  return (Math.acos(Math.min(1, Math.max(-1, dot / len))) * 180) / Math.PI;
}

export type Combine = "avg" | "min";

/**
 * The joint's angle across the sides the camera can see, or null when neither
 * side is in view. `min` follows the more bent side (one leg at a time).
 */
export function jointAngle(pose: Point[], joint: Joint, combine: Combine): number | null {
  const angles: number[] = [];
  for (const [a, b, c] of JOINT_POINTS[joint]) {
    const pts = [pose[a], pose[b], pose[c]];
    if (pts.some((p) => !p || (p.visibility ?? 1) < MIN_VISIBILITY)) continue;
    angles.push(angleAt(pts[0], pts[1], pts[2]));
  }
  if (!angles.length) return null;
  return combine === "min" ? Math.min(...angles) : angles.reduce((s, v) => s + v, 0) / angles.length;
}

export interface RepRule {
  joint: Joint;
  combine: Combine;
  /** Angle of the resting position: back past it, the repetition is complete. */
  rest: number;
  /** Angle that must be reached for the movement to count. */
  work: number;
  /** Angle of a full-range repetition. */
  good: number;
  /** A repetition faster than this is rushed (0 = any pace is fine). */
  minMs: number;
}

export interface RepEvent {
  /** The furthest angle reached. */
  peak: number;
  /** From leaving the resting position to returning to it. */
  ms: number;
  good: boolean;
  rushed: boolean;
}

export interface RepState {
  phase: "rest" | "work";
  /** Smoothed angle. */
  angle: number | null;
  peak: number;
  /** When the body left the resting position. */
  leftAt: number | null;
}

export const REP_START: RepState = { phase: "rest", angle: null, peak: 0, leftAt: null };

/** Share of each new sample in the smoothed angle: enough to drop single-frame jitter. */
const SMOOTHING = 0.5;

/**
 * Advance the counter by one frame. Two thresholds (work and rest) instead of
 * one, so trembling around a single line never counts twice.
 */
export function stepRep(state: RepState, rule: RepRule, raw: number, at: number): { state: RepState; rep: RepEvent | null } {
  const angle = state.angle === null ? raw : state.angle + SMOOTHING * (raw - state.angle);
  // Work in a direction where "further into the movement" is always larger.
  const dir = rule.work < rule.rest ? -1 : 1;
  const v = dir * angle;
  if (state.phase === "rest") {
    const atRest = v <= dir * rule.rest;
    const leftAt = atRest ? null : (state.leftAt ?? at);
    if (v >= dir * rule.work) return { state: { phase: "work", angle, peak: angle, leftAt: leftAt ?? at }, rep: null };
    return { state: { ...state, angle, leftAt }, rep: null };
  }
  const peak = dir * angle > dir * state.peak ? angle : state.peak;
  if (v > dir * rule.rest) return { state: { ...state, angle, peak }, rep: null };
  const ms = at - (state.leftAt ?? at);
  return {
    state: { phase: "rest", angle, peak: 0, leftAt: null },
    rep: { peak, ms, good: dir * peak >= dir * rule.good, rushed: rule.minMs > 0 && ms < rule.minMs },
  };
}

export interface RepSummary {
  reps: number;
  /** Repetitions through the full range. */
  good: number;
  /** Mean time per repetition, 0 without repetitions. */
  avgMs: number;
}

export function summarize(reps: RepEvent[]): RepSummary {
  return {
    reps: reps.length,
    good: reps.filter((r) => r.good).length,
    avgMs: reps.length ? reps.reduce((s, r) => s + r.ms, 0) / reps.length : 0,
  };
}

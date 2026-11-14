import type { Severity, Vitals } from "@/lib/health/types";
import type { VitalKey } from "@/lib/i18n/pages/vitals";

/**
 * Mirrors the boundaries in VITAL_SPECS[].assess (src/lib/health/vitals.ts).
 * Keep both in sync: `normal` is where assess returns 0, `critical` where it returns 3.
 * A null bound means assess has no limit on that side.
 */
export interface VitalBand {
  normal: [number | null, number | null];
  critical: [number | null, number | null];
  /** Default y-axis domain; widened when data falls outside it. */
  domain: [number, number];
}

export const VITAL_BANDS: Record<VitalKey, VitalBand> = {
  // assess: > 130 || < 40 -> 3; > 105 || < 50 -> 2
  heartRate: { normal: [50, 105], critical: [40, 130], domain: [35, 140] },
  // assess: < 90 -> 3; < 95 -> 2
  spo2: { normal: [95, null], critical: [90, null], domain: [86, 100] },
  // assess: >= 39 || < 35 -> 3; > 37.7 -> 2 (no attention band below)
  temperature: { normal: [35, 37.7], critical: [35, 39], domain: [34.5, 39.5] },
  // assess: > 28 || < 8 -> 3; > 21 -> 2 (no attention band below)
  respiration: { normal: [8, 21], critical: [8, 28], domain: [5, 32] },
  // assess (systolic): > 170 || < 80 -> 3; > 140 || < 92 -> 2
  systolic: { normal: [92, 140], critical: [80, 170], domain: [50, 180] },
};

export const VITAL_ORDER: VitalKey[] = ["temperature", "systolic", "respiration", "heartRate", "spo2"];

export const DEFAULT_VITAL: VitalKey = "heartRate";

export function isVitalKey(v: string | null): v is VitalKey {
  return v !== null && (VITAL_ORDER as string[]).includes(v);
}

export type Direction = "in" | "above" | "below";

/** Which side of the normal band the value sits on (only meaningful when severity > 0). */
export function directionOf(key: VitalKey, v: Vitals, severity: Severity): Direction {
  if (severity === 0) return "in";
  const [lo] = VITAL_BANDS[key].normal;
  return lo !== null && v[key] < lo ? "below" : "above";
}

/** Attention and critical lines to draw (a critical line that coincides with the band edge replaces it). */
export function thresholdLines(key: VitalKey): { value: number; kind: "attention" | "critical" }[] {
  const { normal, critical } = VITAL_BANDS[key];
  const out: { value: number; kind: "attention" | "critical" }[] = [];
  for (const side of [0, 1] as const) {
    const n = normal[side];
    const c = critical[side];
    if (c !== null) out.push({ value: c, kind: "critical" });
    if (n !== null && n !== c) out.push({ value: n, kind: "attention" });
  }
  return out;
}

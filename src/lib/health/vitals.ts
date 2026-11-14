import type { Finding, Region, Severity, Status, Vitals } from "./types";
import { REGIONS } from "./types";

/**
 * Simulated biometric stream. In a real habitat these values would come from
 * the suit's sensors; here they drift around a baseline and react to symptoms.
 */

export const BASELINE: Vitals = {
  heartRate: 68,
  spo2: 98,
  temperature: 36.6,
  respiration: 14,
  systolic: 118,
  diastolic: 76,
};

type Delta = Partial<Vitals>;

const EFFECTS: Record<string, Delta> = {
  chest_pain: { heartRate: 28, respiration: 6, systolic: 22, diastolic: 10 },
  dyspnea: { spo2: -7, respiration: 10, heartRate: 18 },
  fainting: { heartRate: -14, systolic: -28, diastolic: -16 },
  palpitations: { heartRate: 40 },
  fever: { temperature: 1.9, heartRate: 14, respiration: 3 },
  anxiety: { heartRate: 16, respiration: 4, systolic: 8 },
  dizziness: { systolic: -10, diastolic: -6 },
  bleeding: { heartRate: 20, systolic: -16 },
  fatigue: { heartRate: -4 },
  nausea: { heartRate: 6 },
  abdominal_pain: { heartRate: 10, systolic: 6 },
  epigastric_pain: { heartRate: 10, systolic: 6 },
  ruq_pain: { heartRate: 12, systolic: 6 },
  luq_pain: { heartRate: 12, systolic: 6 },
  periumbilical_pain: { heartRate: 10, systolic: 6 },
  rlq_pain: { heartRate: 14, systolic: 8, temperature: 0.4 },
  llq_pain: { heartRate: 12, systolic: 6 },
  flank_pain: { heartRate: 16, systolic: 12, respiration: 3 },
  migraine: { heartRate: 6, systolic: 6 },
  cluster_headache: { heartRate: 12, systolic: 10 },
  thunderclap_headache: { heartRate: 16, systolic: 26, diastolic: 12 },
  sore_throat: { temperature: 0.3 },
};

export function targetVitals(findings: Finding[], base: Vitals = BASELINE): Vitals {
  const t = { ...base };
  for (const f of findings) {
    const fx = EFFECTS[f.id];
    if (!fx) continue;
    const scale = f.severity / 2;
    for (const key of Object.keys(fx) as (keyof Vitals)[]) {
      t[key] += (fx[key] ?? 0) * scale;
    }
  }
  t.spo2 = Math.min(100, t.spo2);
  return t;
}

/** One simulation tick: ease toward the target with a bit of physiological noise. */
export function stepVitals(current: Vitals, target: Vitals): Vitals {
  const ease = (a: number, b: number, k: number, noise: number) =>
    a + (b - a) * k + (Math.random() - 0.5) * noise;
  return {
    heartRate: ease(current.heartRate, target.heartRate, 0.12, 1.6),
    spo2: Math.min(100, ease(current.spo2, target.spo2, 0.1, 0.25)),
    temperature: ease(current.temperature, target.temperature, 0.05, 0.02),
    respiration: ease(current.respiration, target.respiration, 0.1, 0.5),
    systolic: ease(current.systolic, target.systolic, 0.08, 1.2),
    diastolic: ease(current.diastolic, target.diastolic, 0.08, 0.8),
  };
}

export interface VitalSpec {
  key: "heartRate" | "spo2" | "temperature" | "respiration" | "systolic";
  unit: string;
  digits: number;
  assess: (v: Vitals) => Severity;
  format?: (v: Vitals) => string;
}

export const VITAL_SPECS: VitalSpec[] = [
  {
    key: "heartRate",
    unit: "bpm",
    digits: 0,
    assess: ({ heartRate: v }) => (v > 130 || v < 40 ? 3 : v > 105 || v < 50 ? 2 : 0),
  },
  {
    key: "spo2",
    unit: "%",
    digits: 0,
    assess: ({ spo2: v }) => (v < 90 ? 3 : v < 95 ? 2 : 0),
  },
  {
    key: "temperature",
    unit: "°C",
    digits: 1,
    assess: ({ temperature: v }) => (v >= 39 || v < 35 ? 3 : v > 37.7 ? 2 : 0),
  },
  {
    key: "respiration",
    unit: "rpm",
    digits: 0,
    assess: ({ respiration: v }) => (v > 28 || v < 8 ? 3 : v > 21 ? 2 : 0),
  },
  {
    key: "systolic",
    unit: "mmHg",
    digits: 0,
    assess: ({ systolic: s }) => (s > 170 || s < 80 ? 3 : s > 140 || s < 92 ? 2 : 0),
    format: (v) => `${Math.round(v.systolic)}/${Math.round(v.diastolic)}`,
  },
];

export function statusOf(severity: Severity): Status {
  return severity >= 3 ? "critical" : severity >= 2 ? "attention" : "nominal";
}

export function overallSeverity(findings: Finding[], vitals: Vitals): Severity {
  let s = 0;
  for (const f of findings) s = Math.max(s, f.severity);
  for (const spec of VITAL_SPECS) s = Math.max(s, spec.assess(vitals));
  return s as Severity;
}

export function regionSeverity(findings: Finding[]): Record<Region, Severity> {
  const out = Object.fromEntries(REGIONS.map((r) => [r, 0])) as Record<Region, Severity>;
  for (const f of findings) {
    for (const r of f.regions) out[r] = Math.max(out[r], f.severity) as Severity;
  }
  return out;
}

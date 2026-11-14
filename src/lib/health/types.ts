export type Region =
  | "head"
  | "torso"
  | "abdomen"
  | "leftArm"
  | "rightArm"
  | "leftLeg"
  | "rightLeg";

export const REGIONS: Region[] = [
  "head",
  "torso",
  "abdomen",
  "leftArm",
  "rightArm",
  "leftLeg",
  "rightLeg",
];

export const SYMPTOM_IDS = [
  "chest_pain",
  "dyspnea",
  "fainting",
  "bleeding",
  "palpitations",
  "dizziness",
  "vision",
  "fever",
  "numbness",
  "nausea",
  "abdominal_pain",
  "headache",
  "congestion",
  "cough",
  "back_pain",
  "arm_pain",
  "leg_pain",
  "muscle_pain",
  "fatigue",
  "anxiety",
] as const;

export type SymptomId = (typeof SYMPTOM_IDS)[number];

/** 0 = nominal, 1 = mild, 2 = attention, 3 = critical */
export type Severity = 0 | 1 | 2 | 3;

export type Status = "nominal" | "attention" | "critical";

export interface Finding {
  /** Stable symptom id; labels and advice come from the i18n messages. */
  id: SymptomId;
  regions: Region[];
  severity: Severity;
  /** Chest pain radiating to the left arm: use the cardiac protocol advice. */
  redFlag?: boolean;
  /** Epoch ms when it was last reported. */
  reportedAt: number;
  /** The phrase that triggered it. */
  evidence: string;
}

export interface Vitals {
  heartRate: number;
  spo2: number;
  temperature: number;
  respiration: number;
  systolic: number;
  diastolic: number;
}

export interface TranscriptEntry {
  id: string;
  text: string;
  at: number;
  source: "voice" | "typed";
  findings: SymptomId[];
  resolved: SymptomId[];
}

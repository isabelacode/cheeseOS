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

export const REGION_LABEL: Record<Region, string> = {
  head: "Cabeça",
  torso: "Tórax",
  abdomen: "Abdômen",
  leftArm: "Braço esq.",
  rightArm: "Braço dir.",
  leftLeg: "Perna esq.",
  rightLeg: "Perna dir.",
};

/** 0 = nominal, 1 = mild, 2 = attention, 3 = critical */
export type Severity = 0 | 1 | 2 | 3;

export type Status = "nominal" | "attention" | "critical";

export interface Finding {
  /** Stable symptom id from the lexicon, e.g. "headache". */
  id: string;
  label: string;
  regions: Region[];
  severity: Severity;
  advice: string;
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
  findings: string[];
  resolved: string[];
}

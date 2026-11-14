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
  "space_motion_sickness",
  "abdominal_pain",
  "epigastric_pain",
  "ruq_pain",
  "luq_pain",
  "periumbilical_pain",
  "rlq_pain",
  "llq_pain",
  "suprapubic_pain",
  "flank_pain",
  "headache",
  "migraine",
  "tension_headache",
  "cluster_headache",
  "sinus_headache",
  "thunderclap_headache",
  "retro_orbital_pain",
  "stiff_neck",
  "ear_pain",
  "sore_throat",
  "congestion",
  "cough",
  "back_pain",
  "arm_pain",
  "leg_pain",
  "joint_pain",
  "hand_pain",
  "finger_pain",
  "hand_numbness",
  "foot_pain",
  "heel_pain",
  "toe_pain",
  "foot_numbness",
  "foot_swelling",
  "cold_extremities",
  "muscle_pain",
  "fatigue",
  "anxiety",
  "disorientation",
  "confusion",
  "insomnia",
  "low_mood",
  "skin_rash",
] as const;

export type SymptomId = (typeof SYMPTOM_IDS)[number];

/** Combined patterns that call for a specific protocol instead of the symptom's own advice. */
export const RED_FLAGS = ["cardiac", "thunderclap", "meningitis", "appendicitis", "peritonitis", "arbovirus", "dvt", "decompression", "hypoxia", "radiation", "fracture", "crisis"] as const;

export type RedFlag = (typeof RED_FLAGS)[number];

/** 0 = nominal, 1 = mild, 2 = attention, 3 = critical */
export type Severity = 0 | 1 | 2 | 3;

export type Status = "nominal" | "attention" | "critical";

export interface Finding {
  /** Stable symptom id; labels and advice come from the i18n messages. */
  id: SymptomId;
  regions: Region[];
  severity: Severity;
  /**
   * A combination that needs a specific protocol (e.g. chest pain radiating to
   * the left arm). `true` comes from older saved sessions and means "cardiac".
   */
  redFlag?: RedFlag | true;
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
  /** "action" = a button press (e.g. marking a symptom resolved), text is empty. */
  source: "voice" | "typed" | "action";
  findings: SymptomId[];
  resolved: SymptomId[];
  /** Findings from this entry the crew member marked as misrecognized. */
  dismissed?: SymptomId[];
}

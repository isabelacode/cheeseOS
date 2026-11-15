import { SYMPTOM_IDS, type Finding, type SymptomId, type TranscriptEntry } from "@/lib/health/types";

/** What the crew session keeps on this device between visits. */
export interface Snapshot {
  findings: Finding[];
  entries: TranscriptEntry[];
  /** Keys of safety alerts the crew member dismissed (each one logged). */
  dismissedAlerts: string[];
}

export const STORE_KEY = "cheeseos.session.v1";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isSymptom = (v: unknown): v is SymptomId => (SYMPTOM_IDS as readonly unknown[]).includes(v);
const symptoms = (v: unknown): SymptomId[] => (Array.isArray(v) ? v.filter(isSymptom) : []);

function finding(v: Obj): Finding {
  return {
    ...(v as unknown as Finding),
    regions: Array.isArray(v.regions) ? (v.regions as Finding["regions"]) : [],
    severity: ([0, 1, 2, 3] as const).find((s) => s === v.severity) ?? 1,
    reportedAt: typeof v.reportedAt === "number" ? v.reportedAt : 0,
    evidence: typeof v.evidence === "string" ? v.evidence : "",
  };
}

function entry(v: Obj): TranscriptEntry {
  return {
    ...(v as unknown as TranscriptEntry),
    text: typeof v.text === "string" ? v.text : "",
    findings: symptoms(v.findings),
    resolved: symptoms(v.resolved),
    ...(v.dismissed !== undefined ? { dismissed: symptoms(v.dismissed) } : {}),
    ...(v.cleared !== undefined ? { cleared: symptoms(v.cleared) } : {}),
  };
}

/**
 * The saved session, with anything an older or corrupt save got wrong dropped
 * or repaired, so the session never receives data it would crash on.
 */
export function parseSnapshot(raw: string | null): Snapshot | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(parsed)) return null;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(isObj) : []);
  return {
    findings: list(parsed.findings).filter((f) => isSymptom(f.id)).map(finding),
    entries: list(parsed.entries).filter((e) => typeof e.id === "string" && typeof e.at === "number").map(entry),
    dismissedAlerts: Array.isArray(parsed.dismissedAlerts) ? parsed.dismissedAlerts.filter((k): k is string => typeof k === "string") : [],
  };
}

export function readStore(): Snapshot | null {
  try {
    return parseSnapshot(window.localStorage.getItem(STORE_KEY));
  } catch {
    return null;
  }
}

export function writeStore(s: Snapshot) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* storage blocked or full: the session lives in memory only */
  }
}

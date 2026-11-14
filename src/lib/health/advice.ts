import type { Finding } from "./types";
import type { Messages } from "@/lib/i18n";

/** The protocol for a red-flag combination, otherwise the symptom's own advice. */
export function adviceOf(f: Finding, t: Messages) {
  if (!f.redFlag) return t.symptoms[f.id].advice;
  return t.redFlags[f.redFlag === true ? "cardiac" : f.redFlag];
}

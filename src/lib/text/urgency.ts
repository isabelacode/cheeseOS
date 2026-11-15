import type { Status } from "@/lib/health/types";

/** Accent-insensitive, lowercased text so "Emergência" and "emergencia" match alike. */
function fold(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'").toLowerCase();
}

/** Phrases that escalate care (pt + en), matched against folded text. */
const ESCALATION = [
  /medic[oa] de voo/,
  /emergenci/,
  /interromp/,
  /imediat/,
  /urgen/,
  /\bpare\b/,
  /flight surgeon/,
  /emergency/,
  /\bstop\b/,
  /immediate/,
  /urgent/,
];

/**
 * A negation right before the phrase ("não é uma emergência", "not urgent",
 * "no need to stop"): matched against the folded text up to the phrase. Only
 * a few filler words may sit between, so "do not delay, call the flight
 * surgeon" still escalates.
 */
const NEGATED =
  /(?:\b(?:nao|nem|nunca|not|never|isn't|isnt|don't|dont|doesn't|doesnt)\s+(?:(?:e|is|be|ha|parece|seem|seems|precisa|requer|exige|need|needs|require|requires|to|de|of|for|a|an|o|um|uma|the|caso|case|necessario|necessaria|necessidade|preciso)\s+){0,4}|\b(?:no|sem)\s+(?:need|necessidade)\s+(?:(?:to|for|of|de|a|an)\s+){0,2})$/;

/** True when free text (e.g. the AI's advice) sounds more urgent than the computed status. */
export function soundsMoreUrgent(text: string, status: Status | null): boolean {
  if (status === "critical") return false;
  const folded = fold(text);
  return ESCALATION.some((re) =>
    [...folded.matchAll(new RegExp(re.source, "g"))].some((m) => !NEGATED.test(folded.slice(0, m.index))),
  );
}

import { normalize } from "./symptoms";
import { mentionsAllergen } from "./safety";

/** Reasoning models may emit their thoughts inline. */
export function cleanModelText(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/<\/?(start_of_turn|end_of_turn|eos|bos)>/g, "")
    .replace(/^\s*(model|assistant)\s*[:\n]/i, "")
    .trim();
}

/** Words too common to tell an echo from an answer. */
const STOP = new Set(
  "a o e de da do das dos em no na nos nas um uma com por para que se eu me meu minha estou esta estou sinto sentindo muito pouco the and of to in on is am i my me a an with for it at im feel feeling have has".split(" "),
);

function words(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((w) => w.length > 2 && !STOP.has(w));
}

export type AiVerdict = "ok" | "empty" | "echo" | "allergen";

/** True when a sentence is mostly the crew member's own words. */
function echoes(sentence: string, said: Set<string>, reportNorm: string): boolean {
  const w = words(sentence);
  if (!w.length) return true;
  const norm = normalize(sentence);
  if (reportNorm.length > 12 && (norm.includes(reportNorm) || (w.length >= 3 && reportNorm.includes(norm)))) return true;
  const fromReport = w.filter((x) => said.has(x)).length;
  const novel = new Set(w.filter((x) => !said.has(x))).size;
  return fromReport / w.length >= 0.6 && novel < 3;
}

/**
 * Whether an AI answer adds something safe, and the answer without the
 * sentences that only restate the report. Small models often just
 * repeat the report ("You have a fever and want to take hyoscine."); such
 * answers are hidden, and any answer naming a drug from the allergy list is
 * dropped. The local rules always stand on their own.
 */
export function reviewAiText(text: string, report: string, allergies: string): { verdict: AiVerdict; text: string } {
  if (mentionsAllergen(text, allergies)) return { verdict: "allergen", text: "" };
  const said = new Set(words(report));
  const reportNorm = normalize(report);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((x) => x.trim());
  const kept = said.size ? sentences.filter((x) => !echoes(x, said, reportNorm)) : sentences;
  const cleaned = kept.join(" ").trim();
  const answer = words(cleaned);
  if (answer.length < 6) return { verdict: kept.length < sentences.length ? "echo" : "empty", text: "" };
  if (said.size) {
    const fromReport = answer.filter((w) => said.has(w)).length / answer.length;
    if (fromReport > 0.55 || new Set(answer.filter((w) => !said.has(w))).size < 5) return { verdict: "echo", text: "" };
  }
  return { verdict: "ok", text: cleaned };
}

export function judgeAiText(text: string, report: string, allergies: string): AiVerdict {
  return reviewAiText(text, report, allergies).verdict;
}

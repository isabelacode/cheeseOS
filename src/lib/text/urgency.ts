import type { Status } from "@/lib/health/types";

/** Accent-insensitive, lowercased text so "Emergência" and "emergencia" match alike. */
function fold(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
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
  /immediately/,
  /urgent/,
];

/** True when free text (e.g. the AI's advice) sounds more urgent than the computed status. */
export function soundsMoreUrgent(text: string, status: Status | null): boolean {
  if (status === "critical") return false;
  const folded = fold(text);
  return ESCALATION.some((re) => re.test(folded));
}

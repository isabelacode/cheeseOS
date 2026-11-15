import type { Locale } from "@/lib/i18n/locale";
import type { Region, SymptomId } from "./types";

export interface TouchOption {
  id: SymptomId;
  /** A plain sentence the local rules recognize; it is logged as the crew member's report. */
  phrase: Record<Locale, string>;
}

const arm = (pt: string, en: string): TouchOption[] => [
  { id: "arm_pain", phrase: { pt: `Estou com dor no braço ${pt}.`, en: `I have pain in my ${en} arm.` } },
  { id: "numbness", phrase: { pt: `Estou com formigamento no braço ${pt}.`, en: `I have tingling in my ${en} arm.` } },
];

const leg = (pt: string, en: string): TouchOption[] => [
  { id: "leg_pain", phrase: { pt: `Estou com dor na perna ${pt === "esquerdo" ? "esquerda" : "direita"}.`, en: `I have pain in my ${en} leg.` } },
  { id: "foot_numbness", phrase: { pt: `Estou com formigamento no pé ${pt}.`, en: `I have tingling in my ${en} foot.` } },
];

/** Reporting without words: the symptoms offered when a body region is tapped. */
export const TOUCH_OPTIONS: Record<Region, TouchOption[]> = {
  head: [
    { id: "headache", phrase: { pt: "Estou com dor de cabeça.", en: "I have a headache." } },
    { id: "dizziness", phrase: { pt: "Estou com tontura.", en: "I feel dizzy." } },
    { id: "vision", phrase: { pt: "Estou com a visão embaçada.", en: "My vision is blurry." } },
    { id: "nausea", phrase: { pt: "Estou com enjoo.", en: "I feel nauseous." } },
  ],
  torso: [
    { id: "chest_pain", phrase: { pt: "Estou com dor no peito.", en: "I have chest pain." } },
    { id: "dyspnea", phrase: { pt: "Estou com falta de ar.", en: "I am short of breath." } },
    { id: "palpitations", phrase: { pt: "Estou com o coração acelerado.", en: "My heart is racing." } },
    { id: "cough", phrase: { pt: "Estou com tosse.", en: "I have a cough." } },
  ],
  abdomen: [
    { id: "abdominal_pain", phrase: { pt: "Estou com dor na barriga.", en: "I have abdominal pain." } },
    { id: "nausea", phrase: { pt: "Estou com enjoo.", en: "I feel nauseous." } },
  ],
  leftArm: arm("esquerdo", "left"),
  rightArm: arm("direito", "right"),
  leftLeg: leg("esquerdo", "left"),
  rightLeg: leg("direito", "right"),
};

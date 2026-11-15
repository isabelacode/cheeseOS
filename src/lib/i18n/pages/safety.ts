import type { Locale } from "../locale";
import type { Messages } from "../messages";
import type { AllergenMatch, DrugClass, SafetyAlert } from "@/lib/health/safety";
import { DRUGS } from "@/lib/health/drugs";

export interface SafetyMessages {
  title: string;
  classes: Record<DrugClass, string>;
  /** "X is the active ingredient in Y, which is on your allergy list", per relation. */
  clause: (m: AllergenMatch, ingredient: string, group: string) => string;
  mentioned: (name: string) => string;
  taken: (name: string) => string;
  takenOther: (name: string, clause: string) => string;
  medication: (clause: string) => string;
  advice: (symptom: string, kit: string, allergens: string) => string;
  reactionHead: (symptom: string, severe: boolean) => string;
  body: { medication: string; mention: string; taken: string; reactionSevere: string; reaction: string; advice: string };
  aiBlocked: string;
  profileLink: string;
  noAi: string;
  dismiss: string;
  dismissLabel: (head: string) => string;
  and: string;
}

const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

const pt: SafetyMessages = {
  title: "Alertas de segurança",
  classes: {
    nsaid: "anti-inflamatórios, AINEs",
    analgesic: "analgésicos",
    penicillin: "penicilinas",
    sulfa: "sulfas",
    opioid: "opioides",
    antiemetic: "antieméticos",
    antispasmodic: "antiespasmódicos",
    antihistamine: "anti-histamínicos",
    latex: "látex",
    iodine: "iodo",
  },
  clause: (m, ing, group) => {
    const { mentioned: x, allergen: a } = m;
    switch (m.relation) {
      case "same":
        return `${x} consta nas suas alergias`;
      case "ingredientOf":
        return `${x} é o princípio ativo de ${a}, que consta nas suas alergias`;
      case "contains":
        return `${x} contém ${a}, que consta nas suas alergias`;
      case "sameIngredient":
        return `${x} tem o mesmo princípio ativo de ${a} (${ing}), que consta nas suas alergias`;
      case "synonym":
        return `${x} é outro nome de ${a}, que consta nas suas alergias`;
      case "group":
        return `${x} é do mesmo grupo de ${a} (${group}), que consta nas suas alergias`;
      case "kit":
        return `${x} pode conter ${a}, que consta nas suas alergias`;
    }
  },
  mentioned: (n) => `Você mencionou ${n}, que consta nas suas alergias`,
  taken: (n) => `Você relatou ter usado ${n}, que consta nas suas alergias`,
  takenOther: (n, c) => `Você relatou ter usado ${n}. ${cap(c)}`,
  medication: (c) => `Medicação em uso conflita com alergia: ${c}`,
  advice: (s, kit, a) => `A orientação para ${s.toLowerCase()} cita ${kit} do kit, e você tem alergia a ${a}`,
  reactionHead: (s, severe) => (severe ? `${s} após contato com alérgeno: possível reação alérgica grave` : `${s} após contato com alérgeno: possível reação alérgica`),
  body: {
    medication: "Uma medicação do seu perfil corresponde a uma alergia declarada. Não tome a próxima dose antes de confirmar com o médico de voo.",
    mention: "Não use este medicamento. Escolha uma alternativa confirmada com o médico de voo.",
    taken: "Pare o uso, avise outro tripulante e observe por 2 horas: coceira, placas na pele, inchaço no rosto ou na garganta, chiado ou falta de ar. Se surgirem, siga o alerta de reação.",
    reactionSevere: "Use a epinefrina do kit médico se houver falta de ar, chiado ou inchaço na garganta. Chame outro tripulante, deite-se com as pernas elevadas e acione o médico de voo agora.",
    reaction: "Interrompa o medicamento, registre a evolução a cada 15 minutos e fique perto de outro tripulante. Falta de ar ou inchaço no rosto é emergência.",
    advice: "Não use itens desse grupo que contenham o alérgeno. Escolha uma alternativa e confirme com o médico de voo.",
  },
  aiBlocked: "A sugestão da IA citou um medicamento que consta nas suas alergias e foi ocultada. Siga as orientações das regras locais.",
  profileLink: "Ver alergias no perfil",
  noAi: "Verificado pelas regras locais, sem IA.",
  dismiss: "Dispensar",
  dismissLabel: (h) => `Dispensar alerta: ${h}`,
  and: "e",
};

const en: SafetyMessages = {
  title: "Safety alerts",
  classes: {
    nsaid: "anti-inflammatories, NSAIDs",
    analgesic: "painkillers",
    penicillin: "penicillins",
    sulfa: "sulfa drugs",
    opioid: "opioids",
    antiemetic: "antiemetics",
    antispasmodic: "antispasmodics",
    antihistamine: "antihistamines",
    latex: "latex",
    iodine: "iodine",
  },
  clause: (m, ing, group) => {
    const { mentioned: x, allergen: a } = m;
    switch (m.relation) {
      case "same":
        return `${x} is on your allergy list`;
      case "ingredientOf":
        return `${x} is the active ingredient in ${a}, which is on your allergy list`;
      case "contains":
        return `${x} contains ${a}, which is on your allergy list`;
      case "sameIngredient":
        return `${x} has the same active ingredient as ${a} (${ing}), which is on your allergy list`;
      case "synonym":
        return `${x} is another name for ${a}, which is on your allergy list`;
      case "group":
        return `${x} is in the same group as ${a} (${group}), which is on your allergy list`;
      case "kit":
        return `${x} may contain ${a}, which is on your allergy list`;
    }
  },
  mentioned: (n) => `You mentioned ${n}, which is on your allergy list`,
  taken: (n) => `You reported taking ${n}, which is on your allergy list`,
  takenOther: (n, c) => `You reported taking ${n}. ${cap(c)}`,
  medication: (c) => `Current medication conflicts with an allergy: ${c}`,
  advice: (s, kit, a) => `Advice for ${s.toLowerCase()} mentions ${kit} from the kit, and you are allergic to ${a}`,
  reactionHead: (s, severe) => (severe ? `${s} after allergen exposure: possible severe allergic reaction` : `${s} after allergen exposure: possible allergic reaction`),
  body: {
    medication: "A medication in your profile matches a declared allergy. Do not take the next dose before checking with the flight surgeon.",
    mention: "Do not use this medication. Pick an alternative confirmed with the flight surgeon.",
    taken: "Stop taking it, tell another crew member and watch for 2 hours: itching, hives, facial or throat swelling, wheezing or shortness of breath. If they appear, follow the reaction alert.",
    reactionSevere: "Use the epinephrine in the medical kit if there is shortness of breath, wheezing or throat swelling. Call another crew member, lie down with legs raised and contact the flight surgeon now.",
    reaction: "Stop the medication, log how it evolves every 15 minutes and stay near another crew member. Shortness of breath or facial swelling is an emergency.",
    advice: "Do not use items from this group that contain the allergen. Pick an alternative and confirm with the flight surgeon.",
  },
  aiBlocked: "The AI suggestion named a medication on your allergy list and was hidden. Follow the local rules' guidance.",
  profileLink: "See allergies in profile",
  noAi: "Checked by local rules, no AI.",
  dismiss: "Dismiss",
  dismissLabel: (h) => `Dismiss alert: ${h}`,
  and: "and",
};

export const safetyMessages: Record<Locale, SafetyMessages> = { pt, en };

const join = (items: string[], and: string) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} ${and} ${items.at(-1)}`;

function clauseOf(m: AllergenMatch, s: SafetyMessages, locale: Locale) {
  const ing = DRUGS.find((d) => d.id === m.drugId)?.ingredient[locale] ?? "";
  return s.clause(m, ing, m.cls ? s.classes[m.cls] : "");
}

/** Headline and body for one alert, naming what the person wrote and the allergy it hits. */
export function alertCopy(a: SafetyAlert, t: Messages, locale: Locale): { head: string; body: string } {
  const s = safetyMessages[locale];
  const symptom = a.symptom ? t.symptoms[a.symptom].label : "";
  const first = a.matches[0];
  const clauses = a.matches.map((m) => clauseOf(m, s, locale)).join("; ");
  switch (a.kind) {
    case "medication":
      return { head: s.medication(clauses), body: s.body.medication };
    case "exposure": {
      const allSame = a.matches.every((m) => m.relation === "same");
      const names = join([...new Set(a.matches.map((m) => m.mentioned))], s.and);
      const head = allSame ? (a.taken ? s.taken(names) : s.mentioned(names)) : a.taken ? s.takenOther(first.mentioned, clauses) : cap(clauses);
      return { head, body: a.taken ? s.body.taken : s.body.mention };
    }
    case "reaction": {
      const severe = a.level === 3;
      return { head: s.reactionHead(symptom, severe), body: severe ? s.body.reactionSevere : s.body.reaction };
    }
    case "advice":
      return { head: s.advice(symptom, first.mentioned, join([...new Set(a.matches.map((m) => m.allergen))], s.and)), body: s.body.advice };
  }
}

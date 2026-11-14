import type { Finding, Region, Severity, SymptomId } from "./types";
import type { Locale } from "@/lib/i18n/locale";

/**
 * Deterministic symptom extractor for Brazilian Portuguese and English speech.
 * Runs instantly and offline; the LLM only writes the narrative feedback.
 * Patterns run on normalized text: lowercase, no accents, apostrophes become
 * spaces ("can't" -> "can t", "I'm" -> "i m").
 */

type Side = "left" | "right" | "both";

interface SymptomRule {
  id: SymptomId;
  patterns: Record<Locale, RegExp[]>;
  /** Fixed regions, or a limb pair resolved by the side mentioned in the phrase. */
  regions: Region[] | { limb: "arm" | "leg" };
  severity: Severity;
}

const RULES: SymptomRule[] = [
  {
    id: "chest_pain",
    patterns: {
      pt: [/dor( \w+)? (no|de) peito/, /aperto( \w+)? no peito/, /peito (doendo|apertado|doi)/, /pontada( \w+)? no peito/],
      en: [/chest pain/, /pain in (my |the )?chest/, /chest (hurts|is hurting|is tight|feels tight|tightness)/, /tight(ness)?( \w+)? (in|on) (my |the )?chest/, /pressure (in|on) (my |the )?chest/],
    },
    regions: ["torso"],
    severity: 3,
  },
  {
    id: "dyspnea",
    patterns: {
      pt: [/falta de ar/, /sem ar/, /dificuldade (para|pra|de) respirar/, /nao consigo respirar/, /respira(r|ndo) mal/, /ofegante/],
      en: [/short(ness)? of breath/, /can t breathe/, /cannot breathe/, /(hard|difficult) to breathe/, /(trouble|difficulty) breathing/, /out of breath/, /breathless/, /can t catch my breath/],
    },
    regions: ["torso"],
    severity: 3,
  },
  {
    id: "fainting",
    patterns: {
      pt: [/desmai/, /vou apagar/, /quase apaguei/, /escureceu a vista/],
      en: [/faint/, /pass(ing|ed)? out/, /black(ing|ed)? out/, /going to collapse/],
    },
    regions: ["head"],
    severity: 3,
  },
  {
    id: "bleeding",
    patterns: { pt: [/sangr/, /sangue/], en: [/bleed/, /blood/] },
    regions: ["head"],
    severity: 3,
  },
  {
    id: "palpitations",
    patterns: {
      pt: [/palpita/, /coracao (acelerado|disparado|batendo forte)/, /taquicardia/],
      en: [/palpitation/, /heart (is )?(racing|pounding|fluttering)/, /racing heart/, /tachycardia/],
    },
    regions: ["torso"],
    severity: 2,
  },
  {
    id: "dizziness",
    patterns: {
      pt: [/tont/, /zonz/, /vertigem/, /tudo girando/],
      en: [/dizz/, /light ?headed/, /vertigo/, /(room|everything) (is )?spinning/],
    },
    regions: ["head"],
    severity: 2,
  },
  {
    id: "vision",
    patterns: {
      pt: [/visao (embacada|turva|borrada)/, /vista (embacada|turva)/, /enxergando mal/],
      en: [/blurr(y|ed) vision/, /vision (is )?(blurry|blurred|fuzzy)/, /can t see (well|clearly|properly)/, /seeing double/],
    },
    regions: ["head"],
    severity: 2,
  },
  {
    id: "fever",
    patterns: { pt: [/febre/, /febril/, /calafrio/], en: [/fever/, /chills/] },
    regions: ["head", "torso"],
    severity: 2,
  },
  {
    id: "numbness",
    patterns: { pt: [/dormen/, /formiga/, /adormecid/], en: [/numb/, /tingl/, /pins and needles/] },
    regions: { limb: "arm" },
    severity: 2,
  },
  {
    id: "nausea",
    patterns: {
      pt: [/nausea/, /enjo/, /vontade de vomitar/, /vomit/, /estomago embrulhado/],
      en: [/nause/, /sick to my stomach/, /throw(ing)? up/, /vomit/, /queasy/],
    },
    regions: ["abdomen"],
    severity: 1,
  },
  {
    id: "abdominal_pain",
    patterns: {
      pt: [/dor (de|na) barriga/, /dor no estomago/, /dor abdominal/, /colica/, /(barriga|estomago)( \w+)? (esta |ta )?(doendo|doi)/],
      en: [/stomach ?ache/, /belly ?ache/, /abdominal pain/, /(stomach|belly|tummy|abdomen)( \w+)? (hurts|is hurting|pain)/, /pain in (my |the )?(stomach|belly|abdomen)/, /cramps/],
    },
    regions: ["abdomen"],
    severity: 2,
  },
  {
    id: "headache",
    patterns: {
      pt: [/dor de cabeca/, /cabeca( \w+)? (esta |ta )?(doendo|doi|latejando)/, /cefaleia/, /enxaqueca/],
      en: [/head ?ache/, /head( \w+)? (hurts|is hurting|is pounding|is throbbing)/, /migraine/],
    },
    regions: ["head"],
    severity: 1,
  },
  {
    id: "congestion",
    patterns: {
      pt: [/nariz entupido/, /rosto inchado/, /cara inchada/, /congest/, /pressao na cabeca/],
      en: [/stuffy nose/, /blocked nose/, /(puffy|swollen) face/, /congest/, /pressure in my head/, /head pressure/],
    },
    regions: ["head"],
    severity: 1,
  },
  {
    id: "cough",
    patterns: { pt: [/tosse/, /tossindo/], en: [/cough/] },
    regions: ["torso"],
    severity: 1,
  },
  {
    id: "back_pain",
    patterns: {
      pt: [/dor nas costas/, /costas( \w+)? (esta |ta )?(doendo|doi)/, /lombar/, /coluna/],
      en: [/back pain/, /back( \w+)? (hurts|is hurting|is killing me|aches)/, /lower back/, /spine/, /pain in (my |the )?back/],
    },
    regions: ["torso"],
    severity: 1,
  },
  {
    id: "arm_pain",
    patterns: {
      pt: [/dor( \w+)? no braco/, /(braco|ombro|cotovelo|punho|mao)( \w+){0,2} (esta |ta )?(doendo|doi|dolorid)/, /(vai|irradia|desce|corre)( \w+){0,2} (pro|para o|ate o|no) braco/, /dor no ombro/, /dor no cotovelo/, /dor no punho/, /dor na mao/],
      en: [/(arm|shoulder|elbow|wrist|hand)( \w+){0,2} (hurts|is hurting|aches|is aching|is sore)/, /pain in (my |the )?((left|right) )?(arm|shoulder|elbow|wrist|hand)/, /(arm|shoulder|elbow|wrist) pain/, /(radiat|spread|going|goes|moving|shoot)\w*( \w+){0,3} arm/],
    },
    regions: { limb: "arm" },
    severity: 1,
  },
  {
    id: "leg_pain",
    patterns: {
      pt: [/dor na perna/, /(perna|joelho|panturrilha|tornozelo|pe|coxa)( \w+){0,2} (esta |ta )?(doendo|doi|dolorid)/, /dor no joelho/, /panturrilha/, /dor no pe\b/, /dor no tornozelo/],
      en: [/(leg|knee|calf|ankle|foot|thigh)( \w+){0,2} (hurts|is hurting|aches|is aching|is sore)/, /pain in (my |the )?((left|right) )?(leg|knee|calf|ankle|foot|thigh)/, /(leg|knee|calf|ankle|foot) pain/],
    },
    regions: { limb: "leg" },
    severity: 1,
  },
  {
    id: "muscle_pain",
    patterns: {
      pt: [/dor muscular/, /musculos? (doloridos?|doendo)/, /corpo dolorido/],
      en: [/muscle (pain|ache|aches|soreness)/, /muscles? (are |is )?(sore|aching)/, /sore muscles/, /body aches?/, /aching all over/],
    },
    regions: ["leftArm", "rightArm", "leftLeg", "rightLeg"],
    severity: 1,
  },
  {
    id: "fatigue",
    patterns: {
      pt: [/cansad/, /cansaco/, /fadiga/, /exaust/, /sem energia/, /muito sono/],
      en: [/tired/, /fatigue/, /exhaust/, /no energy/, /sleepy/, /worn out/, /drained/],
    },
    regions: ["head", "torso", "abdomen", "leftArm", "rightArm", "leftLeg", "rightLeg"],
    severity: 1,
  },
  {
    id: "anxiety",
    patterns: {
      pt: [/ansios/, /ansiedade/, /estressad/, /nervos/, /panico/, /angusti/],
      en: [/anxi/, /stress/, /nervous/, /panic/, /worried/, /overwhelmed/],
    },
    regions: ["head"],
    severity: 1,
  },
];

interface Grammar {
  intensifiers: RegExp;
  softeners: RegExp;
  negation: RegExp;
  resolved: RegExp;
  allGood: RegExp;
  clauseBreak: RegExp;
  left: RegExp;
  right: RegExp;
}

const GRAMMAR: Record<Locale, Grammar> = {
  pt: {
    intensifiers: /\b(muito|muita|forte|intens|insuportavel|demais|pior|horrivel|terrivel)/,
    softeners: /\b(leve|levinho|pouco|pouquinho|fraco|fraquinha)/,
    negation: /\b(nao|nem|sem|nenhum|nenhuma)\b/,
    resolved: /\b(passou|melhorou|sumiu|parou|acabou|ja (nao|foi))\b/,
    allGood: /\b(estou|to|tou|me sinto|sinto|tudo) (bem|otim|normal|tranquil|beleza)/,
    clauseBreak: /\b(?:mas|porem|tambem|alem disso|e)\b|[.;!?]/,
    left: /esquerd/,
    right: /direit/,
  },
  en: {
    intensifiers: /\b(very|really|severe|intense|unbearable|worse|worst|terrible|awful|strong|so bad|a lot)\b/,
    softeners: /\b(mild|slight|slightly|a bit|a little|minor)\b/,
    negation: /\b(no|not|don t|dont|never|without|isn t|aren t)\b/,
    resolved: /\b(gone|went away|better|stopped|passed|no longer|is over|eased)\b/,
    allGood: /\b(i m|im|i am|i feel|feeling|all) (fine|good|great|ok|okay|well|normal)\b/,
    clauseBreak: /\b(?:but|however|also|plus|and)\b|[.;!?]/,
    left: /\bleft\b/,
    right: /\bright\b/,
  },
};

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s₂]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sideOf(clause: string, g: Grammar): Side {
  const left = g.left.test(clause);
  const right = g.right.test(clause);
  if (left && !right) return "left";
  if (right && !left) return "right";
  return "both";
}

function limbRegions(limb: "arm" | "leg", side: Side): Region[] {
  const l: Region = limb === "arm" ? "leftArm" : "leftLeg";
  const r: Region = limb === "arm" ? "rightArm" : "rightLeg";
  if (side === "left") return [l];
  if (side === "right") return [r];
  return [l, r];
}

export interface Extraction {
  findings: Finding[];
  /** Symptom ids the astronaut says are gone. */
  resolved: SymptomId[];
  /** True when the phrase is a general "I'm fine". */
  allGood: boolean;
}

/** Split into clauses so negation and side words only apply locally. */
function clauses(text: string, g: Grammar): string[] {
  return text
    .split(g.clauseBreak)
    .flatMap((c) => c.split(/,/))
    .map((c) => c.trim())
    .filter(Boolean);
}

export function extractSymptoms(raw: string, locale: Locale, now = Date.now()): Extraction {
  const g = GRAMMAR[locale];
  const text = normalize(raw);
  const found = new Map<SymptomId, Finding>();
  const resolved = new Set<SymptomId>();

  for (const clause of clauses(text, g)) {
    for (const rule of RULES) {
      const match = rule.patterns[locale].map((p) => clause.match(p)).find(Boolean);
      if (!match || match.index === undefined) continue;

      const before = clause.slice(Math.max(0, match.index - 24), match.index);
      if (g.resolved.test(clause)) {
        resolved.add(rule.id);
        continue;
      }
      if (g.negation.test(before)) continue;

      let severity = rule.severity as number;
      if (g.intensifiers.test(clause)) severity += 1;
      else if (g.softeners.test(clause)) severity -= 1;
      severity = Math.min(3, Math.max(1, severity));

      const regions = Array.isArray(rule.regions)
        ? rule.regions
        : limbRegions(rule.regions.limb, sideOf(clause, g));

      const prev = found.get(rule.id);
      if (!prev || prev.severity < severity) {
        found.set(rule.id, {
          id: rule.id,
          regions,
          severity: severity as Severity,
          reportedAt: now,
          evidence: clause,
        });
      }
    }
  }

  // Chest pain radiating to the left arm is a classic red flag.
  const chest = found.get("chest_pain");
  const arm = found.get("arm_pain") ?? found.get("numbness");
  if (chest && arm?.regions.includes("leftArm")) {
    arm.severity = 3;
    arm.redFlag = true;
  }

  return {
    findings: [...found.values()],
    resolved: [...resolved],
    allGood: found.size === 0 && g.allGood.test(text),
  };
}

/** Merge a new extraction into the active findings list. */
export function mergeFindings(active: Finding[], ex: Extraction): Finding[] {
  let next = active.filter((f) => !ex.resolved.includes(f.id));
  if (ex.allGood) next = next.filter((f) => f.severity >= 3);
  for (const f of ex.findings) {
    next = next.filter((a) => a.id !== f.id);
    next.push(f);
  }
  return next.sort((a, b) => b.severity - a.severity || b.reportedAt - a.reportedAt);
}

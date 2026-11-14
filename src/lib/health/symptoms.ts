import type { Finding, Region, Severity } from "./types";

/**
 * Deterministic symptom extractor for Brazilian Portuguese speech.
 * Runs instantly and offline; the local LLM only writes the narrative feedback.
 */

type Side = "left" | "right" | "both";

interface SymptomRule {
  id: string;
  label: string;
  patterns: RegExp[];
  /** Fixed regions, or a limb pair resolved by the side mentioned in the phrase. */
  regions: Region[] | { limb: "arm" | "leg" };
  severity: Severity;
  advice: string;
}

const RULES: SymptomRule[] = [
  {
    id: "chest_pain",
    label: "Dor torácica",
    patterns: [/dor( \w+)? (no|de) peito/, /aperto( \w+)? no peito/, /peito (doendo|apertado|doi)/, /pontada( \w+)? no peito/],
    regions: ["torso"],
    severity: 3,
    advice: "Interromper a atividade, fazer ECG agora e acionar o médico de voo.",
  },
  {
    id: "dyspnea",
    label: "Falta de ar",
    patterns: [/falta de ar/, /sem ar/, /dificuldade (para|pra|de) respirar/, /nao consigo respirar/, /respira(r|ndo) mal/, /ofegante/],
    regions: ["torso"],
    severity: 3,
    advice: "Checar O₂ e CO₂ da cabine e a SpO₂; oxigênio suplementar se abaixo de 92%.",
  },
  {
    id: "fainting",
    label: "Pré-síncope",
    patterns: [/desmai/, /vou apagar/, /quase apaguei/, /escureceu a vista/],
    regions: ["head"],
    severity: 3,
    advice: "Fixar-se em posição segura, elevar as pernas e chamar outro tripulante.",
  },
  {
    id: "bleeding",
    label: "Sangramento",
    patterns: [/sangr/, /sangue/],
    regions: ["head"],
    severity: 3,
    advice: "Compressão direta e kit de primeiros socorros; reportar o local exato.",
  },
  {
    id: "palpitations",
    label: "Palpitações",
    patterns: [/palpita/, /cora(c|ç)ao (acelerado|disparado|batendo forte)/, /taquicardia/],
    regions: ["torso"],
    severity: 2,
    advice: "Repouso por 10 min e registrar ECG; evitar cafeína.",
  },
  {
    id: "dizziness",
    label: "Tontura",
    patterns: [/tont/, /zonz/, /vertigem/, /tudo girando/],
    regions: ["head"],
    severity: 2,
    advice: "Ancorar-se a um apoio e evitar movimentos bruscos de cabeça.",
  },
  {
    id: "vision",
    label: "Alteração visual",
    patterns: [/vis(a|ã)o (embacada|turva|borrada)/, /vista (embacada|turva)/, /enxergando mal/],
    regions: ["head"],
    severity: 2,
    advice: "Registrar o episódio; agendar exame de fundo de olho (risco de SANS).",
  },
  {
    id: "fever",
    label: "Febre",
    patterns: [/febre/, /febril/, /calafrio/],
    regions: ["head", "torso"],
    severity: 2,
    advice: "Medir temperatura, hidratar e isolar se houver outros sintomas.",
  },
  {
    id: "numbness",
    label: "Dormência",
    patterns: [/dorm(e|ê)n/, /formiga/, /adormecid/],
    regions: { limb: "arm" },
    severity: 2,
    advice: "Testar força e sensibilidade; checar ajuste do traje e pontos de pressão.",
  },
  {
    id: "nausea",
    label: "Náusea",
    patterns: [/nausea/, /enjo/, /vontade de vomitar/, /vomit/, /estomago embrulhado/],
    regions: ["abdomen"],
    severity: 1,
    advice: "Antiemético do kit e movimentos de cabeça lentos; hidratar em goles.",
  },
  {
    id: "abdominal_pain",
    label: "Dor abdominal",
    patterns: [/dor (de|na) barriga/, /dor no estomago/, /dor abdominal/, /colica/, /(barriga|estomago)( \w+)? (esta |ta )?(doendo|doi)/],
    regions: ["abdomen"],
    severity: 2,
    advice: "Localizar a dor (quadrante) e monitorar evolução por 30 min.",
  },
  {
    id: "headache",
    label: "Dor de cabeça",
    patterns: [/dor de cabeca/, /cabeca( \w+)? (esta |ta )?(doendo|doi|latejando)/, /cefaleia/, /enxaqueca/],
    regions: ["head"],
    severity: 1,
    advice: "Hidratar, reduzir a luz e checar o CO₂ do módulo.",
  },
  {
    id: "congestion",
    label: "Congestão facial",
    patterns: [/nariz entupido/, /rosto inchado/, /cara inchada/, /congest/, /pressao na cabeca/],
    regions: ["head"],
    severity: 1,
    advice: "Efeito comum do deslocamento de fluidos; exercício leve ajuda.",
  },
  {
    id: "cough",
    label: "Tosse",
    patterns: [/tosse/, /tossindo/],
    regions: ["torso"],
    severity: 1,
    advice: "Checar filtros de ar e umidade da cabine.",
  },
  {
    id: "back_pain",
    label: "Dor nas costas",
    patterns: [/dor nas costas/, /costas( \w+)? (esta |ta )?(doendo|doi)/, /lombar/, /coluna/],
    regions: ["torso"],
    severity: 1,
    advice: "Alongamento em posição fetal; comum pelo alongamento da coluna em microgravidade.",
  },
  {
    id: "arm_pain",
    label: "Dor no braço",
    patterns: [/dor( \w+)? no braco/, /(braco|ombro|cotovelo|punho|mao)( \w+){0,2} (esta |ta )?(doendo|doi|dolorid)/, /(vai|irradia|desce|corre)( \w+){0,2} (pro|para o|ate o|no) braco/, /dor no ombro/, /dor no cotovelo/, /dor no punho/, /dor na mao/],
    regions: { limb: "arm" },
    severity: 1,
    advice: "Avaliar se houve esforço; gelo e repouso do membro.",
  },
  {
    id: "leg_pain",
    label: "Dor na perna",
    patterns: [/dor na perna/, /(perna|joelho|panturrilha|tornozelo|pe|coxa)( \w+){0,2} (esta |ta )?(doendo|doi|dolorid)/, /dor no joelho/, /panturrilha/, /dor no pe\b/, /dor no tornozelo/],
    regions: { limb: "leg" },
    severity: 1,
    advice: "Checar inchaço; se unilateral e quente, avaliar trombose.",
  },
  {
    id: "muscle_pain",
    label: "Dor muscular",
    patterns: [/dor muscular/, /musculos? (doloridos?|doendo)/, /corpo dolorido/],
    regions: ["leftArm", "rightArm", "leftLeg", "rightLeg"],
    severity: 1,
    advice: "Normal após treino resistido; hidratação e alongamento.",
  },
  {
    id: "fatigue",
    label: "Fadiga",
    patterns: [/cansad/, /cansaco/, /fadiga/, /exaust/, /sem energia/, /muito sono/],
    regions: ["head", "torso", "abdomen", "leftArm", "rightArm", "leftLeg", "rightLeg"],
    severity: 1,
    advice: "Rever o ciclo de sono e fazer uma pausa de 20 min.",
  },
  {
    id: "anxiety",
    label: "Ansiedade",
    patterns: [/ansios/, /ansiedade/, /estressad/, /nervos/, /panico/, /angusti/],
    regions: ["head"],
    severity: 1,
    advice: "Respiração 4-7-8 por 2 min; conversar com a equipe de suporte psicológico.",
  },
];

const INTENSIFIERS = /\b(muito|muita|forte|intens|insuportavel|demais|pior|horrivel|terrivel)/;
const SOFTENERS = /\b(leve|levinho|pouco|pouquinho|fraco|fraquinha)/;
const NEGATION = /\b(nao|nem|sem|nenhum|nenhuma)\b/;
const RESOLVED = /\b(passou|melhorou|sumiu|parou|acabou|ja (nao|foi))\b/;
const ALL_GOOD = /\b(estou|to|tou|me sinto|sinto|tudo) (bem|otim|normal|tranquil|beleza)/;

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s₂]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sideOf(clause: string): Side {
  const left = /esquerd/.test(clause);
  const right = /direit/.test(clause);
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
  resolved: string[];
  /** True when the phrase is a general "I'm fine". */
  allGood: boolean;
}

/** Split into clauses so negation and side words only apply locally. */
function clauses(text: string): string[] {
  return text
    .split(/\b(?:mas|porem|tambem|alem disso|e)\b|[.;!?]/)
    .flatMap((c) => c.split(/,/))
    .map((c) => c.trim())
    .filter(Boolean);
}

export function extractSymptoms(raw: string, now = Date.now()): Extraction {
  const text = normalize(raw);
  const found = new Map<string, Finding>();
  const resolved = new Set<string>();

  for (const clause of clauses(text)) {
    for (const rule of RULES) {
      const match = rule.patterns.map((p) => clause.match(p)).find(Boolean);
      if (!match || match.index === undefined) continue;

      const before = clause.slice(Math.max(0, match.index - 24), match.index);
      if (RESOLVED.test(clause)) {
        resolved.add(rule.id);
        continue;
      }
      if (NEGATION.test(before)) continue;

      let severity = rule.severity as number;
      if (INTENSIFIERS.test(clause)) severity += 1;
      else if (SOFTENERS.test(clause)) severity -= 1;
      severity = Math.min(3, Math.max(1, severity));

      const regions = Array.isArray(rule.regions)
        ? rule.regions
        : limbRegions(rule.regions.limb, sideOf(clause));

      const prev = found.get(rule.id);
      if (!prev || prev.severity < severity) {
        found.set(rule.id, {
          id: rule.id,
          label: rule.label,
          regions,
          severity: severity as Severity,
          advice: rule.advice,
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
    arm.advice = "Dor torácica irradiando para o braço esquerdo: protocolo cardíaco imediato.";
  }

  return {
    findings: [...found.values()],
    resolved: [...resolved],
    allGood: found.size === 0 && ALL_GOOD.test(text),
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

import type { Finding, SymptomId } from "@/lib/health/types";
import type { Locale } from "@/lib/i18n/locale";

/**
 * NASA Human Research Program (HRP): the five hazards of human spaceflight,
 * "RIDGE" (Radiation, Isolation & confinement, Distance from Earth, Gravity
 * fields, hostile/closed Environments). cheeseOS links every symptom to the
 * hazards that can cause or worsen it, so guidance explains *why in space*.
 */

export const HAZARDS = ["radiation", "isolation", "distance", "gravity", "environment"] as const;
export type Hazard = (typeof HAZARDS)[number];

export type SourceId = "hrpHazards" | "bodyInSpace" | "roadmap" | "std3001v1" | "radiationBrief" | "sansEvidence" | "medlineVitals" | "medlineOximetry";

export interface Source {
  id: SourceId;
  title: string;
  org: string;
  url: string;
}

/** Every link here was checked to resolve to the named NASA or NIH page. */
export const SOURCES: Record<SourceId, Source> = {
  hrpHazards: { id: "hrpHazards", org: "NASA HRP", title: "5 Hazards of Human Spaceflight", url: "https://www.nasa.gov/hrp/hazards/" },
  bodyInSpace: { id: "bodyInSpace", org: "NASA", title: "The Human Body in Space", url: "https://www.nasa.gov/humans-in-space/the-human-body-in-space/" },
  roadmap: { id: "roadmap", org: "NASA HRP", title: "Human Research Roadmap", url: "https://humanresearchroadmap.nasa.gov/" },
  std3001v1: {
    id: "std3001v1",
    org: "NASA OCHMO",
    title: "NASA-STD-3001 Vol. 1 Rev. C — Crew Health",
    url: "https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf",
  },
  radiationBrief: {
    id: "radiationBrief",
    org: "NASA OCHMO",
    title: "NASA-STD-3001 Technical Brief — Radiation Protection",
    url: "https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf",
  },
  sansEvidence: {
    id: "sansEvidence",
    org: "NASA HRP",
    title: "Evidence Report: Spaceflight Associated Neuro-ocular Syndrome (SANS)",
    url: "https://humanresearchroadmap.nasa.gov/evidence/reports/SANS%20EB%202022%20FINAL_8-15-22.pdf",
  },
  medlineVitals: { id: "medlineVitals", org: "NIH MedlinePlus", title: "Vital signs", url: "https://medlineplus.gov/ency/article/002341.htm" },
  medlineOximetry: { id: "medlineOximetry", org: "NIH MedlinePlus", title: "Pulse Oximetry", url: "https://medlineplus.gov/lab-tests/pulse-oximetry/" },
};

/** Hazards that can cause or worsen each symptom. "distance" is added for anything critical. */
const SYMPTOM_HAZARDS: Partial<Record<SymptomId, Hazard[]>> = {
  headache: ["gravity", "environment"],
  migraine: ["gravity", "environment"],
  tension_headache: ["isolation", "gravity"],
  cluster_headache: ["gravity"],
  sinus_headache: ["gravity", "environment"],
  thunderclap_headache: ["gravity"],
  retro_orbital_pain: ["gravity"],
  vision: ["gravity"],
  congestion: ["gravity", "environment"],
  dizziness: ["gravity"],
  fainting: ["gravity"],
  disorientation: ["gravity"],
  space_motion_sickness: ["gravity"],
  nausea: ["gravity", "radiation"],
  back_pain: ["gravity"],
  muscle_pain: ["gravity"],
  joint_pain: ["gravity", "environment"],
  leg_pain: ["gravity"],
  arm_pain: ["gravity"],
  flank_pain: ["gravity", "environment"],
  foot_swelling: ["gravity"],
  heel_pain: ["gravity"],
  foot_pain: ["gravity"],
  fatigue: ["radiation", "isolation", "environment"],
  skin_rash: ["radiation", "environment"],
  fever: ["environment"],
  sore_throat: ["environment"],
  cough: ["environment"],
  dyspnea: ["environment"],
  confusion: ["environment", "isolation"],
  ear_pain: ["environment"],
  numbness: ["environment"],
  hand_numbness: ["environment"],
  finger_pain: ["environment"],
  hand_pain: ["environment"],
  cold_extremities: ["environment"],
  anxiety: ["isolation", "distance"],
  low_mood: ["isolation", "distance"],
  insomnia: ["isolation", "environment"],
  chest_pain: ["distance"],
  palpitations: ["gravity", "isolation"],
  bleeding: ["distance"],
};

export function hazardsOf(f: Pick<Finding, "id" | "severity" | "redFlag">): Hazard[] {
  const base = SYMPTOM_HAZARDS[f.id] ?? [];
  const extra: Hazard[] = [];
  if (f.redFlag === "radiation") extra.push("radiation");
  if (f.redFlag === "decompression" || f.redFlag === "hypoxia") extra.push("environment");
  if (f.redFlag === "fracture") extra.push("gravity");
  // Up to 20 min each way to Earth and no quick return: anything critical is handled on board.
  if (f.severity >= 3 || f.redFlag) extra.push("distance");
  return HAZARDS.filter((h) => base.includes(h) || extra.includes(h));
}

/** Count of active findings per hazard, for the "current exposure" summary. */
export function hazardLoad(findings: Finding[]): Record<Hazard, number> {
  const out = Object.fromEntries(HAZARDS.map((h) => [h, 0])) as Record<Hazard, number>;
  for (const f of findings) for (const h of hazardsOf(f)) out[h]++;
  return out;
}

/** "real" = a published reference value; "simulated" = produced by the cheeseOS demo twin. */
export type Provenance = "real" | "simulated";

export interface ScienceCopy {
  navLabel: string;
  title: string;
  subtitle: string;
  hazards: Record<Hazard, { name: string; short: string; body: string; countermeasure: string; sources: SourceId[] }>;
  /** Why a symptom happens in space; symptoms without an entry fall back to the hazard summary. */
  why: Partial<Record<SymptomId, string>>;
  whyTitle: string;
  hazardsLabel: string;
  sourcesLabel: string;
  activeNow: (n: number) => string;
  noneNow: string;
  limitsTitle: string;
  limitsIntro: string;
  cols: { item: string; value: string; kind: string; source: string };
  provenance: Record<Provenance, string>;
  limits: { label: string; value: string; note: string; provenance: Provenance; source: SourceId }[];
  simTitle: string;
  simBody: string;
  learnMore: string;
  disclaimer: string;
}

const pt: ScienceCopy = {
  navLabel: "Ciência",
  title: "Ciência da missão",
  subtitle: "Os cinco riscos do Programa de Pesquisa Humana da NASA, como eles aparecem nos seus sintomas e de onde vêm os limites usados.",
  hazards: {
    radiation: {
      name: "Radiação",
      short: "Fora da proteção da Terra",
      body: "Fora do campo magnético terrestre, raios cósmicos galácticos e eventos de partículas solares atravessam o casco. Em doses altas causam náusea, fadiga e lesões de pele; a longo prazo aumentam o risco de câncer e de doenças degenerativas.",
      countermeasure: "Dosímetro pessoal, abrigo blindado durante eventos solares e limite de carreira de 600 mSv (NASA-STD-3001).",
      sources: ["hrpHazards", "std3001v1", "radiationBrief"],
    },
    isolation: {
      name: "Isolamento e confinamento",
      short: "Meses num espaço pequeno",
      body: "Equipe pequena, rotina rígida, pouca privacidade e ciclo de luz alterado afetam humor, sono, coesão e desempenho cognitivo.",
      countermeasure: "Horário de sono fixo, iluminação de ciclo dia-noite, contato com a família e suporte psicológico.",
      sources: ["hrpHazards", "bodyInSpace"],
    },
    distance: {
      name: "Distância da Terra",
      short: "Até 20 min de atraso por sentido",
      body: "A caminho de Marte, a comunicação leva até 20 minutos em cada sentido e não há retorno rápido. A tripulação precisa reconhecer e tratar emergências sozinha, com o que há a bordo.",
      countermeasure: "Autonomia médica a bordo: regras locais, protocolos claros e registro para o médico de voo revisar depois.",
      sources: ["hrpHazards", "bodyInSpace"],
    },
    gravity: {
      name: "Campos gravitacionais",
      short: "Microgravidade e transições",
      body: "Sem gravidade, fluidos sobem para a cabeça (congestão, dor de cabeça, alterações nos olhos — SANS), ossos perdem de 1% a 1,5% de densidade por mês, músculos atrofiam e o equilíbrio se desregula nas transições de gravidade.",
      countermeasure: "Cerca de 2 h de exercício resistido e aeróbico por dia, exames de visão periódicos e hidratação.",
      sources: ["hrpHazards", "bodyInSpace", "sansEvidence"],
    },
    environment: {
      name: "Ambiente hostil e fechado",
      short: "Ar, pressão e micróbios da nave",
      body: "O ar é reciclado: CO₂ acumula e causa dor de cabeça e lentidão; micróbios circulam num ambiente fechado com imunidade alterada; trajes e EVAs expõem a mudanças de pressão (doença descompressiva) e a lesões nas mãos.",
      countermeasure: "Monitorar O₂, CO₂ e umidade da cabine, higiene, filtros e pré-respiração de oxigênio antes de EVAs.",
      sources: ["hrpHazards", "roadmap"],
    },
  },
  why: {
    headache: "Fluidos sobem para a cabeça em microgravidade e o CO₂ da cabine costuma ser mais alto que na Terra: as duas coisas dão dor de cabeça.",
    migraine: "O deslocamento de fluidos para a cabeça e o CO₂ da cabine podem desencadear crises em quem já tem enxaqueca.",
    sinus_headache: "Sem gravidade, os seios da face não drenam bem: o rosto incha e a pressão aumenta.",
    vision: "Cerca de 70% dos astronautas em missões longas têm ao menos um sinal de SANS: fluido pressionando o nervo óptico e o globo ocular.",
    retro_orbital_pain: "A pressão de fluidos em volta dos olhos (SANS) pode doer atrás deles; vale registrar e testar a visão.",
    congestion: "O 'rosto inchado' é clássico: cerca de 2 litros de fluido se deslocam das pernas para o tronco e a cabeça.",
    dizziness: "O ouvido interno perde a referência de 'para baixo'; nas transições de gravidade a pressão também cai ao ficar em pé.",
    fainting: "Após semanas sem gravidade o volume de sangue diminui; ao voltar a sentir gravidade a pressão cai (intolerância ortostática).",
    space_motion_sickness: "Olhos e ouvido interno discordam sobre o movimento: muitos astronautas enjoam nos primeiros dias.",
    nausea: "Pode ser enjoo de movimento (gravidade) ou, após evento solar, sinal de exposição à radiação.",
    disorientation: "Sem 'para cima' e 'para baixo', o cérebro precisa recalibrar o equilíbrio usando referências visuais.",
    back_pain: "A coluna se alonga até 3% sem gravidade e os músculos que a sustentam enfraquecem: a dor lombar é comum.",
    muscle_pain: "Sem carga, músculos atrofiam; o treino resistido diário que previne isso também deixa os músculos doloridos.",
    flank_pain: "O cálcio que sai dos ossos passa pelos rins: cálculo renal é um risco conhecido do voo espacial.",
    leg_pain: "Ossos das pernas perdem densidade mais rápido; dor após impacto merece avaliação de fratura.",
    foot_swelling: "Na nave os fluidos sobem; inchaço nos pés costuma surgir ao voltar à gravidade — de um lado só, avaliar trombose.",
    fatigue: "Radiação, sono desregulado por até 16 nasceres do sol por dia e carga de trabalho alta se somam.",
    skin_rash: "A imunidade alterada reativa vírus latentes (herpes, zóster) e a pele resseca no ar reciclado; após evento solar, considerar radiação.",
    fever: "Em ambiente fechado micróbios circulam entre todos, e a imunidade muda em voo: isolar e monitorar.",
    sore_throat: "Ar seco e reciclado irrita a garganta; com febre, pensar em infecção que pode se espalhar pela tripulação.",
    cough: "Poeira, umidade baixa e filtros saturados irritam as vias aéreas.",
    dyspnea: "Pode vir do ar da cabine (O₂ baixo ou CO₂ alto) antes de vir do corpo: checar o ambiente primeiro.",
    confusion: "CO₂ alto ou O₂ baixo afetam o raciocínio antes de outros sinais; isolamento e privação de sono também.",
    ear_pain: "Mudanças de pressão da cabine e do traje afetam o ouvido médio.",
    numbness: "Após EVA, formigamento sugere doença descompressiva (bolhas de nitrogênio); também pode vir de pressão do traje.",
    finger_pain: "Luvas de EVA pressionam as pontas dos dedos; unhas descolando são uma lesão conhecida de caminhadas espaciais.",
    joint_pain: "Durante ou após EVA, dor articular é o sinal clássico de doença descompressiva.",
    anxiety: "Confinamento, distância da família e decisões sem apoio imediato da Terra pesam no estresse.",
    low_mood: "Isolamento prolongado e distância da Terra afetam o humor; falar com a equipe é parte do protocolo, não fraqueza.",
    insomnia: "Ruído constante, luz artificial e o ciclo de 90 minutos da órbita desregulam o relógio biológico.",
    chest_pain: "Longe da Terra não há evacuação rápida: dor no peito sempre segue o protocolo de bordo, sem esperar o solo.",
    palpitations: "O coração muda de forma e volume em microgravidade e o estresse do confinamento soma.",
  },
  whyTitle: "Por que no espaço?",
  hazardsLabel: "Riscos NASA relacionados",
  sourcesLabel: "Fontes",
  activeNow: (n) => `${n} ${n === 1 ? "sintoma ativo ligado" : "sintomas ativos ligados"} a este risco`,
  noneNow: "Nenhum sintoma ativo ligado a este risco",
  limitsTitle: "Limites e referências",
  cols: { item: "Item", value: "Valor usado", kind: "Tipo", source: "Fonte" },
  limitsIntro: "O que é valor publicado e o que é simulação do cheeseOS. Os limites dos sinais vitais são referências clínicas gerais para adultos em repouso.",
  provenance: { real: "Referência publicada", simulated: "Simulação" },
  limits: [
    { label: "Temperatura", value: "Atenção > 37,7 °C · crítico ≥ 39 °C", note: "Febre a partir de cerca de 38 °C em adultos.", provenance: "real", source: "medlineVitals" },
    { label: "Frequência cardíaca", value: "Faixa 50–105 bpm · crítico < 40 ou > 130", note: "Repouso típico 60–100 bpm; atletas ficam abaixo de 60.", provenance: "real", source: "medlineVitals" },
    { label: "Respiração", value: "Faixa 8–21 rpm · crítico > 28", note: "Adulto em repouso: 12–20 rpm.", provenance: "real", source: "medlineVitals" },
    { label: "Saturação de O₂", value: "Atenção < 95% · crítico < 90%", note: "Abaixo de 90% pede oxigênio e avaliação.", provenance: "real", source: "medlineOximetry" },
    { label: "Pressão arterial", value: "Faixa 92–140 mmHg (sistólica)", note: "Referência clínica geral para adultos.", provenance: "real", source: "medlineVitals" },
    { label: "Radiação (carreira)", value: "< 600 mSv de dose efetiva", note: "Limite de carreira da NASA, igual para todas as idades e sexos.", provenance: "real", source: "std3001v1" },
    { label: "Perda óssea", value: "1% a 1,5% por mês", note: "Sem contramedidas, em microgravidade.", provenance: "real", source: "bodyInSpace" },
    { label: "Sinais vitais exibidos", value: "Gerados pelo gêmeo digital", note: "Reagem aos sintomas relatados; não são medições de sensores.", provenance: "simulated", source: "roadmap" },
  ],
  simTitle: "O que é simulado",
  simBody: "Os sinais vitais do cheeseOS são gerados por um modelo de demonstração que reage aos sintomas relatados. Em uma missão real viriam dos sensores vestíveis do traje. As faixas de alerta e os protocolos são reais; os números na tela não são medições.",
  learnMore: "Ver ciência da missão",
  disclaimer: "Ferramenta de apoio e demonstração. Não substitui avaliação médica nem o médico de voo.",
};

const en: ScienceCopy = {
  navLabel: "Science",
  title: "Mission science",
  subtitle: "The five hazards from NASA's Human Research Program, how they show up in your symptoms, and where the limits come from.",
  hazards: {
    radiation: {
      name: "Radiation",
      short: "Beyond Earth's shield",
      body: "Outside Earth's magnetic field, galactic cosmic rays and solar particle events pass through the hull. High doses cause nausea, fatigue and skin injury; over time they raise the risk of cancer and degenerative disease.",
      countermeasure: "Personal dosimeter, shielded shelter during solar events, and a 600 mSv career limit (NASA-STD-3001).",
      sources: ["hrpHazards", "std3001v1", "radiationBrief"],
    },
    isolation: {
      name: "Isolation & confinement",
      short: "Months in a small space",
      body: "A small crew, rigid routine, little privacy and an altered light cycle affect mood, sleep, cohesion and cognitive performance.",
      countermeasure: "Fixed sleep schedule, day-night lighting, contact with family and psychological support.",
      sources: ["hrpHazards", "bodyInSpace"],
    },
    distance: {
      name: "Distance from Earth",
      short: "Up to 20 min delay each way",
      body: "On the way to Mars, messages take up to 20 minutes each way and there is no quick return. The crew must recognize and treat emergencies on its own, with what is on board.",
      countermeasure: "Onboard medical autonomy: local rules, clear protocols and a record for the flight surgeon to review later.",
      sources: ["hrpHazards", "bodyInSpace"],
    },
    gravity: {
      name: "Gravity fields",
      short: "Microgravity and transitions",
      body: "Without gravity, fluids shift to the head (congestion, headache, eye changes — SANS), bones lose 1% to 1.5% of density per month, muscles atrophy and balance is thrown off during gravity transitions.",
      countermeasure: "About 2 h of resistive and aerobic exercise a day, periodic vision checks and hydration.",
      sources: ["hrpHazards", "bodyInSpace", "sansEvidence"],
    },
    environment: {
      name: "Hostile & closed environment",
      short: "Air, pressure and microbes",
      body: "Air is recycled: CO₂ builds up and causes headache and sluggishness; microbes circulate in a closed space while immunity is altered; suits and EVAs bring pressure changes (decompression sickness) and hand injuries.",
      countermeasure: "Monitor cabin O₂, CO₂ and humidity, hygiene, filters, and oxygen pre-breathe before EVAs.",
      sources: ["hrpHazards", "roadmap"],
    },
  },
  why: {
    headache: "Fluids shift to the head in microgravity and cabin CO₂ is usually higher than on Earth: both cause headaches.",
    migraine: "The headward fluid shift and cabin CO₂ can trigger attacks in people who already have migraines.",
    sinus_headache: "Without gravity the sinuses do not drain well: the face swells and pressure builds.",
    vision: "About 70% of long-duration astronauts show at least one sign of SANS: fluid pressing on the optic nerve and eyeball.",
    retro_orbital_pain: "Fluid pressure around the eyes (SANS) can hurt behind them; log it and test your vision.",
    congestion: "The 'puffy face' is classic: about 2 liters of fluid move from the legs to the chest and head.",
    dizziness: "The inner ear loses its sense of 'down'; during gravity transitions blood pressure also drops on standing.",
    fainting: "After weeks without gravity blood volume falls; when gravity returns pressure drops (orthostatic intolerance).",
    space_motion_sickness: "Eyes and inner ear disagree about motion: many astronauts get sick in the first days.",
    nausea: "It may be motion sickness (gravity) or, after a solar event, a sign of radiation exposure.",
    disorientation: "With no 'up' or 'down' the brain must recalibrate balance using visual references.",
    back_pain: "The spine lengthens up to 3% without gravity and its supporting muscles weaken: low back pain is common.",
    muscle_pain: "Unloaded muscles atrophy; the daily resistive training that prevents it also leaves them sore.",
    flank_pain: "Calcium leaving the bones passes through the kidneys: kidney stones are a known spaceflight risk.",
    leg_pain: "Leg bones lose density fastest; pain after an impact deserves a fracture check.",
    foot_swelling: "On board fluids shift up; swollen feet tend to appear back in gravity — on one side only, check for a clot.",
    fatigue: "Radiation, sleep disrupted by up to 16 sunrises a day and a heavy workload add up.",
    skin_rash: "Altered immunity reactivates latent viruses (herpes, shingles) and skin dries in recycled air; after a solar event, consider radiation.",
    fever: "In a closed habitat microbes pass between everyone and immunity changes in flight: isolate and monitor.",
    sore_throat: "Dry recycled air irritates the throat; with fever, think of an infection that can spread through the crew.",
    cough: "Dust, low humidity and clogged filters irritate the airways.",
    dyspnea: "It may come from the cabin air (low O₂ or high CO₂) before the body: check the environment first.",
    confusion: "High CO₂ or low O₂ affect thinking before other signs; isolation and sleep loss do too.",
    ear_pain: "Cabin and suit pressure changes affect the middle ear.",
    numbness: "After an EVA, tingling suggests decompression sickness (nitrogen bubbles); suit pressure points can also cause it.",
    finger_pain: "EVA gloves press on the fingertips; nails lifting off are a known spacewalk injury.",
    joint_pain: "During or after an EVA, joint pain is the classic sign of decompression sickness.",
    anxiety: "Confinement, distance from family and decisions without immediate help from Earth add stress.",
    low_mood: "Long isolation and distance from Earth affect mood; talking to the crew is part of the protocol, not weakness.",
    insomnia: "Constant noise, artificial light and the 90-minute orbit disrupt the body clock.",
    chest_pain: "Far from Earth there is no quick evacuation: chest pain always follows the onboard protocol, without waiting for the ground.",
    palpitations: "The heart changes shape and volume in microgravity, and confinement stress adds up.",
  },
  whyTitle: "Why in space?",
  hazardsLabel: "Related NASA hazards",
  sourcesLabel: "Sources",
  activeNow: (n) => `${n} active ${n === 1 ? "symptom" : "symptoms"} linked to this hazard`,
  noneNow: "No active symptom linked to this hazard",
  limitsTitle: "Limits and references",
  cols: { item: "Item", value: "Value used", kind: "Type", source: "Source" },
  limitsIntro: "What is a published value and what is a cheeseOS simulation. Vital sign limits are general clinical references for adults at rest.",
  provenance: { real: "Published reference", simulated: "Simulation" },
  limits: [
    { label: "Temperature", value: "Attention > 37.7 °C · critical ≥ 39 °C", note: "Fever starts around 38 °C in adults.", provenance: "real", source: "medlineVitals" },
    { label: "Heart rate", value: "Range 50–105 bpm · critical < 40 or > 130", note: "Typical resting 60–100 bpm; athletes sit below 60.", provenance: "real", source: "medlineVitals" },
    { label: "Respiration", value: "Range 8–21 rpm · critical > 28", note: "Adult at rest: 12–20 breaths/min.", provenance: "real", source: "medlineVitals" },
    { label: "O₂ saturation", value: "Attention < 95% · critical < 90%", note: "Below 90% calls for oxygen and assessment.", provenance: "real", source: "medlineOximetry" },
    { label: "Blood pressure", value: "Range 92–140 mmHg (systolic)", note: "General clinical reference for adults.", provenance: "real", source: "medlineVitals" },
    { label: "Radiation (career)", value: "< 600 mSv effective dose", note: "NASA career limit, the same for all ages and sexes.", provenance: "real", source: "std3001v1" },
    { label: "Bone loss", value: "1% to 1.5% per month", note: "Without countermeasures, in microgravity.", provenance: "real", source: "bodyInSpace" },
    { label: "Vitals on screen", value: "Generated by the digital twin", note: "They react to reported symptoms; they are not sensor readings.", provenance: "simulated", source: "roadmap" },
  ],
  simTitle: "What is simulated",
  simBody: "cheeseOS vital signs come from a demo model that reacts to the reported symptoms. On a real mission they would come from the suit's wearable sensors. Alert ranges and protocols are real; the numbers on screen are not measurements.",
  learnMore: "See mission science",
  disclaimer: "Support and demonstration tool. It does not replace medical assessment or the flight surgeon.",
};

export const scienceMessages: Record<Locale, ScienceCopy> = { pt, en };

/** Why this symptom happens in space: the specific line, or the first hazard's summary. */
export function whyInSpace(f: Pick<Finding, "id" | "severity" | "redFlag">, c: ScienceCopy): string | null {
  const specific = c.why[f.id];
  if (specific) return specific;
  const h = hazardsOf(f)[0];
  return h ? c.hazards[h].body : null;
}

import type { Region, Severity, Status, SymptomId } from "@/lib/health/types";
import type { Locale } from "./locale";

type VitalKey = "heartRate" | "spo2" | "temperature" | "respiration" | "systolic";
type SexKey = "feminino" | "masculino" | "outro" | "nao_informado";
type OrErrorCode = "auth" | "credits" | "model" | "rate" | "network" | "other";

export interface Messages {
  meta: { title: string };
  brand: { tagline: string };
  common: { cancel: string; save: string; optional: string; back: string; continue: string };
  language: { label: string; names: Record<Locale, string> };
  sex: Record<SexKey, string>;
  severity: Record<Severity, string>;
  status: Record<Status, { label: string; summary: string }>;
  regions: Record<Region, string>;
  vitals: Record<VitalKey, { label: string; range: string }>;
  symptoms: Record<SymptomId, { label: string; advice: string }>;
  radiatingAdvice: string;
  onboarding: {
    titleNew: string;
    titleEdit: string;
    intro: string;
    stepsLabel: string;
    steps: { title: string; hint: string }[];
    name: string;
    role: string;
    rolePlaceholder: string;
    mission: string;
    missionPlaceholder: string;
    age: string;
    years: string;
    sex: string;
    height: string;
    weight: string;
    bloodType: string;
    bloodUnknown: string;
    restingHr: string;
    restingHrHint: string;
    allergies: string;
    allergiesPlaceholder: string;
    medications: string;
    medicationsPlaceholder: string;
    conditions: string;
    conditionsPlaceholder: string;
    errors: { name: string; role: string; age: string; height: string; weight: string; restingHr: string };
    submitNew: string;
    submitEdit: string;
  };
  nav: {
    label: string;
    now: string;
    vitals: string;
    log: string;
    body: string;
    profile: string;
    settings: string;
    statusLink: (status: string) => string;
    privacyLocal: string;
    privacyCloud: string;
    privacyOff: string;
    privacyLink: string;
    criticalBanner: string;
    criticalAction: string;
    micShortcut: string;
    undo: string;
    undoLast: string;
    undoHint: string;
    undoResolved: (symptom: string) => string;
    undoDismissed: (symptom: string, reports: number) => string;
    undoDeleted: string;
    undoCleared: (entries: number) => string;
    undoClose: string;
  };
  dashboard: {
    loadingScene: string;
    hello: (name: string) => string;
    years: (n: number) => string;
    micOn: string;
    micOff: string;
    sections: string;
    overview: string;
    vitalsNav: string;
    reports: string;
    body: string;
    bodyRegion: string;
    bodyHint: string;
    noComplaints: string;
    editProfile: string;
    healthState: string;
    refining: string;
    source: (engine: string) => string;
    rulesEngine: string;
    noSymptoms: string;
    range: (r: string) => string;
    heartRate: string;
    last60: string;
    bpmNow: string;
    average: string;
    now: string;
  };
  voice: {
    off: string;
    requesting: string;
    denied: string;
    error: string;
    loading: (pct: number) => string;
    sttFailed: string;
    transcribing: string;
    hearing: string;
    listening: string;
    inputLabel: string;
    placeholder: string;
    send: string;
    historyLabel: string;
    empty: string;
    sourceVoice: string;
    sourceTyped: string;
    improvement: string;
    examples: string[];
  };
  engine: {
    sttReady: string;
    sttFailed: string;
    waiting: string;
    browserReady: (model: string) => string;
    browserLoading: (model: string, pct: number) => string;
    browserFailed: (model: string) => string;
    browserWaiting: (model: string) => string;
    sttOnDemand: string;
    offLabel: string;
    offHint: string;
    offStatus: string;
    cloudBadge: string;
    localBadge: string;
    pickerLabel: string;
    openrouterHint: string;
    openrouterNoKey: string;
    browserHint: string;
    browserLabel: string;
    configure: string;
    settingsTitle: string;
    browserSection: string;
    browserIntro: string;
    noGpu: string;
    openrouterIntro: string;
    apiKey: string;
    model: string;
    createKey: string;
    removeKey: string;
    errors: Record<OrErrorCode, string>;
  };
  browserModels: Record<string, string>;
  context: {
    crew: (p: { name: string; role: string; age: number; sex: string; height: string; weight: number; blood: string }) => string;
    allergies: (v: string) => string;
    medications: (v: string) => string;
    conditions: (v: string) => string;
    none: string;
    noneReported: string;
    speech: (t: string) => string;
    activeSymptoms: string;
    vitals: (v: { hr: number; spo2: number; temp: string; rr: number; sys: number; dia: number }) => string;
    overall: (s: string) => string;
    instruction: string;
  };
  prompt: string;
}

const pt: Messages = {
  meta: { title: "cheeseOS · Gêmeo digital" },
  brand: { tagline: "Gêmeo digital de saúde" },
  common: { cancel: "Cancelar", save: "Salvar", optional: "opcional", back: "Voltar", continue: "Continuar" },
  language: { label: "Idioma", names: { pt: "Português", en: "English" } },
  sex: { feminino: "Feminino", masculino: "Masculino", outro: "Outro", nao_informado: "Prefiro não informar" },
  severity: { 0: "Normal", 1: "Leve", 2: "Atenção", 3: "Crítico" },
  status: {
    nominal: { label: "Estável", summary: "Sinais dentro da faixa esperada." },
    attention: { label: "Atenção", summary: "Há sinais que pedem acompanhamento." },
    critical: { label: "Crítico", summary: "Ação imediata recomendada." },
  },
  regions: {
    head: "Cabeça",
    torso: "Tórax",
    abdomen: "Abdômen",
    leftArm: "Braço esq.",
    rightArm: "Braço dir.",
    leftLeg: "Perna esq.",
    rightLeg: "Perna dir.",
  },
  vitals: {
    heartRate: { label: "Frequência cardíaca", range: "50–105" },
    spo2: { label: "Saturação O₂", range: "≥ 95" },
    temperature: { label: "Temperatura", range: "35,0–37,7" },
    respiration: { label: "Respiração", range: "8–21" },
    systolic: { label: "Pressão arterial", range: "92–140" },
  },
  symptoms: {
    chest_pain: { label: "Dor torácica", advice: "Interromper a atividade, fazer ECG agora e acionar o médico de voo." },
    dyspnea: { label: "Falta de ar", advice: "Checar O₂ e CO₂ da cabine e a SpO₂; oxigênio suplementar se abaixo de 92%." },
    fainting: { label: "Pré-síncope", advice: "Fixar-se em posição segura, elevar as pernas e chamar outro tripulante." },
    bleeding: { label: "Sangramento", advice: "Compressão direta e kit de primeiros socorros; reportar o local exato." },
    palpitations: { label: "Palpitações", advice: "Repouso por 10 min e registrar ECG; evitar cafeína." },
    dizziness: { label: "Tontura", advice: "Ancorar-se a um apoio e evitar movimentos bruscos de cabeça." },
    vision: { label: "Alteração visual", advice: "Registrar o episódio; agendar exame de fundo de olho (risco de SANS)." },
    fever: { label: "Febre", advice: "Medir temperatura, hidratar e isolar se houver outros sintomas." },
    numbness: { label: "Dormência", advice: "Testar força e sensibilidade; checar ajuste do traje e pontos de pressão." },
    nausea: { label: "Náusea", advice: "Antiemético do kit e movimentos de cabeça lentos; hidratar em goles." },
    abdominal_pain: { label: "Dor abdominal", advice: "Localizar a dor (quadrante) e monitorar evolução por 30 min." },
    headache: { label: "Dor de cabeça", advice: "Hidratar, reduzir a luz e checar o CO₂ do módulo." },
    congestion: { label: "Congestão facial", advice: "Efeito comum do deslocamento de fluidos; exercício leve ajuda." },
    cough: { label: "Tosse", advice: "Checar filtros de ar e umidade da cabine." },
    back_pain: { label: "Dor nas costas", advice: "Alongamento em posição fetal; comum pelo alongamento da coluna em microgravidade." },
    arm_pain: { label: "Dor no braço", advice: "Avaliar se houve esforço; gelo e repouso do membro." },
    leg_pain: { label: "Dor na perna", advice: "Checar inchaço; se unilateral e quente, avaliar trombose." },
    muscle_pain: { label: "Dor muscular", advice: "Normal após treino resistido; hidratação e alongamento." },
    fatigue: { label: "Fadiga", advice: "Rever o ciclo de sono e fazer uma pausa de 20 min." },
    anxiety: { label: "Ansiedade", advice: "Respiração 4-7-8 por 2 min; conversar com a equipe de suporte psicológico." },
  },
  radiatingAdvice: "Dor torácica irradiando para o braço esquerdo: protocolo cardíaco imediato.",
  onboarding: {
    titleNew: "Vamos montar o seu gêmeo digital",
    titleEdit: "Atualizar dados do tripulante",
    intro: "Esses dados ficam só neste aparelho e ajudam a IA a orientar você. Os sinais vitais continuam simulados.",
    stepsLabel: "Etapas",
    steps: [
      { title: "Identificação", hint: "Quem está sendo monitorado." },
      { title: "Corpo", hint: "Medidas usadas pelo gêmeo digital." },
      { title: "Saúde", hint: "O que a IA deve considerar ao orientar." },
    ],
    name: "Nome completo",
    role: "Função a bordo",
    rolePlaceholder: "Engenheira de voo",
    mission: "Missão",
    missionPlaceholder: "Ares III",
    age: "Idade",
    years: "anos",
    sex: "Sexo",
    height: "Altura",
    weight: "Peso",
    bloodType: "Tipo sanguíneo",
    bloodUnknown: "Não sei",
    restingHr: "Frequência cardíaca em repouso",
    restingHrHint: "Base da simulação. Sem valor, usamos 68 bpm.",
    allergies: "Alergias",
    allergiesPlaceholder: "Ex.: dipirona, látex",
    medications: "Medicações em uso",
    medicationsPlaceholder: "Ex.: melatonina 3 mg à noite",
    conditions: "Condições prévias",
    conditionsPlaceholder: "Ex.: enxaqueca, asma leve",
    errors: {
      name: "Informe o nome completo.",
      role: "Informe a função a bordo.",
      age: "Idade entre 18 e 80 anos.",
      height: "Altura entre 140 e 215 cm.",
      weight: "Peso entre 40 e 160 kg.",
      restingHr: "Frequência de repouso entre 35 e 110 bpm.",
    },
    submitNew: "Abrir meu gêmeo digital",
    submitEdit: "Salvar dados",
  },
  nav: {
    label: "Navegação principal",
    now: "Agora",
    vitals: "Sinais",
    log: "Diário",
    body: "Corpo",
    profile: "Tripulante",
    settings: "Ajustes",
    statusLink: (s) => `Estado geral: ${s}. Abrir o painel Agora`,
    privacyLocal: "No aparelho",
    privacyCloud: "IA na nuvem",
    privacyOff: "IA desligada",
    privacyLink: "Privacidade e motor de IA. Abrir ajustes",
    criticalBanner: "Estado crítico. Interrompa a atividade e acione o médico de voo.",
    criticalAction: "Ver orientação",
    micShortcut: "Atalho: barra de espaço fora de campos de texto",
    undo: "Desfazer",
    undoLast: "Desfazer última correção",
    undoHint: "Atalho: ⌘Z ou Ctrl+Z",
    undoResolved: (s) => `Resolvido: ${s}. Registrado no diário.`,
    undoDismissed: (s, n) =>
      `Descartado: ${s}.${n ? ` Marcado em ${n} ${n === 1 ? "relato" : "relatos"}; os relatos continuam no diário.` : ""}`,
    undoDeleted: "Relato excluído do diário.",
    undoCleared: (n) => `Sessão limpa: ${n} ${n === 1 ? "entrada removida" : "entradas removidas"}.`,
    undoClose: "Fechar aviso",
  },
  dashboard: {
    loadingScene: "Montando o gêmeo digital…",
    hello: (name) => `Olá, ${name}`,
    years: (n) => `${n} anos`,
    micOn: "Escuta ligada",
    micOff: "Ligar escuta contínua",
    sections: "Seções",
    overview: "Visão geral",
    vitalsNav: "Sinais vitais",
    reports: "Novo relato",
    body: "Corpo",
    bodyRegion: "Corpo do tripulante",
    bodyHint: "Toque num ponto para ver a região. Arraste para girar.",
    noComplaints: "Sem queixas registradas.",
    editProfile: "Editar dados do tripulante",
    healthState: "Estado de saúde",
    refining: "Refinando orientação com a IA…",
    source: (engine) => `Fonte: ${engine}`,
    rulesEngine: "Regras locais",
    noSymptoms: "Nenhum sintoma ativo. Continue contando como você está se sentindo.",
    range: (r) => `Faixa ${r}`,
    heartRate: "Frequência cardíaca",
    last60: "últimos 60 s",
    bpmNow: "bpm agora",
    average: "média",
    now: "agora",
  },
  voice: {
    off: "Escuta desligada. Ligue no botão acima ou digite abaixo.",
    requesting: "Pedindo acesso ao microfone…",
    denied: "Microfone bloqueado. Libere o acesso nas permissões do navegador.",
    error: "Não foi possível abrir o microfone.",
    loading: (pct) => `Carregando reconhecimento de voz… ${pct}%`,
    sttFailed: "O reconhecimento de voz falhou ao carregar. Use o campo de texto.",
    transcribing: "Transcrevendo…",
    hearing: "Ouvindo você…",
    listening: "Escutando. Fale como está se sentindo.",
    inputLabel: "Descreva o que está sentindo",
    placeholder: "Ou digite: estou com tontura…",
    send: "Enviar",
    historyLabel: "Histórico de relatos",
    empty: "Os relatos aparecem aqui, com os sintomas reconhecidos em cada fala.",
    sourceVoice: "voz",
    sourceTyped: "texto",
    improvement: "melhora relatada",
    examples: [
      "Estou com dor de cabeça e um pouco de enjoo.",
      "Sinto um aperto forte no peito e falta de ar.",
      "Meu braço esquerdo está formigando.",
      "A dor de cabeça passou, estou bem.",
    ],
  },
  engine: {
    sttReady: "pronto",
    sttFailed: "falhou",
    waiting: "aguardando",
    browserReady: (m) => `${m} no navegador`,
    browserLoading: (m, pct) => `Baixando ${m} · ${pct}%`,
    browserFailed: (m) => `${m} não carregou neste aparelho`,
    browserWaiting: (m) => `${m} aguardando`,
    sttOnDemand: "carrega ao ligar a escuta",
    offLabel: "Desligada",
    offHint: "Sem modelo de IA: só as regras locais, sem gastar processamento",
    offStatus: "IA desligada · só regras locais",
    cloudBadge: "Voz no aparelho · IA na nuvem",
    localBadge: "Processamento 100% no aparelho",
    pickerLabel: "IA da orientação",
    openrouterHint: "Modelos na nuvem com a sua chave",
    openrouterNoKey: "Informe sua chave do OpenRouter",
    browserHint: "Modelo pequeno rodando neste aparelho",
    browserLabel: "Navegador",
    configure: "Configurar IA",
    settingsTitle: "Configurar IA",
    browserSection: "Modelo no navegador",
    browserIntro: "Roda neste aparelho, sem enviar nada. Baixa uma vez e fica em cache.",
    noGpu: " Sem GPU disponível: os modelos maiores ficam lentos.",
    openrouterIntro:
      "Modelos maiores na nuvem com a sua chave. Ela fica salva só neste navegador e vai direto para o OpenRouter. Com esta opção ativa, os relatos e o perfil saem do aparelho.",
    apiKey: "Chave da API",
    model: "Modelo",
    createKey: "Criar uma chave no OpenRouter",
    removeKey: "Remover chave",
    errors: {
      auth: "Chave do OpenRouter inválida.",
      credits: "Sem créditos no OpenRouter.",
      model: "Modelo não encontrado no OpenRouter.",
      rate: "Limite de uso do OpenRouter atingido.",
      network: "Sem resposta do OpenRouter.",
      other: "O OpenRouter recusou o pedido.",
    },
  },
  browserModels: {
    "onnx-community/Qwen2.5-0.5B-Instruct": "Mais leve e rápido, respostas simples",
    "onnx-community/gemma-3-1b-it-ONNX": "Equilibrado, bom português",
    "onnx-community/Qwen2.5-1.5B-Instruct": "Mais capaz, pede GPU e mais memória",
  },
  context: {
    crew: (p) => `Tripulante: ${p.name}, ${p.role}, ${p.age} anos${p.sex ? `, sexo ${p.sex.toLowerCase()}` : ""}, ${p.height} m, ${p.weight} kg${p.blood ? `, tipo sanguíneo ${p.blood}` : ""}.`,
    allergies: (v) => `Alergias: ${v}.`,
    medications: (v) => `Medicações em uso: ${v}.`,
    conditions: (v) => `Condições prévias: ${v}.`,
    none: "nenhuma",
    noneReported: "nenhuma informada",
    speech: (t) => `Fala do tripulante: "${t}"`,
    activeSymptoms: "Sintomas ativos:",
    vitals: (v) =>
      `Sinais vitais: FC ${v.hr} bpm, SpO₂ ${v.spo2}%, temperatura ${v.temp} °C, respiração ${v.rr} rpm, PA ${v.sys}/${v.dia} mmHg.`,
    overall: (s) => `Estado geral: ${s}.`,
    instruction:
      "Dê o feedback imediato ao tripulante em 2 ou 3 frases curtas, em texto simples, sem markdown. Não escale além do estado geral informado.",
  },
  prompt: `Você é o assistente médico de bordo de uma missão em Marte. O contato com a Terra tem até 22 minutos de atraso, então você orienta o tripulante na hora.
Faixas de referência (valores dentro delas são normais, não comente como problema):
- Temperatura 36,0–37,5 °C; febre só acima de 37,7 °C.
- Frequência cardíaca 50–100 bpm; SpO₂ 95–100%; respiração 12–20 rpm; pressão arterial 90–135/60–85 mmHg.
Regras:
- Responda em português do Brasil, em 2 ou 3 frases curtas, em texto simples: sem markdown, sem listas, sem negrito.
- Diga o que fazer agora, de forma prática e calma.
- Não dê diagnóstico definitivo e não invente medições.
- O "Estado geral" já foi calculado pelas regras de bordo. Não escale além dele: só mande interromper a atividade ou acionar o médico de voo se o estado for Crítico.`,
};

const en: Messages = {
  meta: { title: "cheeseOS · Digital twin" },
  brand: { tagline: "Health digital twin" },
  common: { cancel: "Cancel", save: "Save", optional: "optional", back: "Back", continue: "Continue" },
  language: { label: "Language", names: { pt: "Português", en: "English" } },
  sex: { feminino: "Female", masculino: "Male", outro: "Other", nao_informado: "Prefer not to say" },
  severity: { 0: "Normal", 1: "Mild", 2: "Attention", 3: "Critical" },
  status: {
    nominal: { label: "Stable", summary: "Vitals within the expected range." },
    attention: { label: "Attention", summary: "Some signs need monitoring." },
    critical: { label: "Critical", summary: "Immediate action recommended." },
  },
  regions: {
    head: "Head",
    torso: "Chest",
    abdomen: "Abdomen",
    leftArm: "Left arm",
    rightArm: "Right arm",
    leftLeg: "Left leg",
    rightLeg: "Right leg",
  },
  vitals: {
    heartRate: { label: "Heart rate", range: "50–105" },
    spo2: { label: "O₂ saturation", range: "≥ 95" },
    temperature: { label: "Temperature", range: "35.0–37.7" },
    respiration: { label: "Respiration", range: "8–21" },
    systolic: { label: "Blood pressure", range: "92–140" },
  },
  symptoms: {
    chest_pain: { label: "Chest pain", advice: "Stop the activity, run an ECG now and call the flight surgeon." },
    dyspnea: { label: "Shortness of breath", advice: "Check cabin O₂ and CO₂ and SpO₂; give supplemental oxygen if below 92%." },
    fainting: { label: "Pre-syncope", advice: "Secure yourself in a safe position, raise your legs and call another crew member." },
    bleeding: { label: "Bleeding", advice: "Apply direct pressure and use the first-aid kit; report the exact location." },
    palpitations: { label: "Palpitations", advice: "Rest for 10 min and record an ECG; avoid caffeine." },
    dizziness: { label: "Dizziness", advice: "Hold on to a support and avoid sudden head movements." },
    vision: { label: "Vision change", advice: "Log the episode; schedule a fundus exam (SANS risk)." },
    fever: { label: "Fever", advice: "Take your temperature, hydrate and isolate if other symptoms appear." },
    numbness: { label: "Numbness", advice: "Test strength and sensation; check suit fit and pressure points." },
    nausea: { label: "Nausea", advice: "Take the kit's antiemetic and move your head slowly; sip water." },
    abdominal_pain: { label: "Abdominal pain", advice: "Locate the pain (quadrant) and monitor it for 30 min." },
    headache: { label: "Headache", advice: "Hydrate, dim the lights and check the module's CO₂." },
    congestion: { label: "Facial congestion", advice: "Common effect of fluid shift; light exercise helps." },
    cough: { label: "Cough", advice: "Check the cabin air filters and humidity." },
    back_pain: { label: "Back pain", advice: "Stretch in a fetal position; common as the spine lengthens in microgravity." },
    arm_pain: { label: "Arm pain", advice: "Check for overexertion; ice and rest the limb." },
    leg_pain: { label: "Leg pain", advice: "Check for swelling; if one-sided and warm, assess for thrombosis." },
    muscle_pain: { label: "Muscle pain", advice: "Normal after resistance training; hydrate and stretch." },
    fatigue: { label: "Fatigue", advice: "Review the sleep cycle and take a 20-min break." },
    anxiety: { label: "Anxiety", advice: "Do 4-7-8 breathing for 2 min; talk to the psychological support team." },
  },
  radiatingAdvice: "Chest pain radiating to the left arm: start the cardiac protocol now.",
  onboarding: {
    titleNew: "Let's build your digital twin",
    titleEdit: "Update crew member details",
    intro: "This data stays on this device and helps the AI guide you. Vital signs are still simulated.",
    stepsLabel: "Steps",
    steps: [
      { title: "Identity", hint: "Who is being monitored." },
      { title: "Body", hint: "Measurements used by the digital twin." },
      { title: "Health", hint: "What the AI should consider when advising." },
    ],
    name: "Full name",
    role: "Role on board",
    rolePlaceholder: "Flight engineer",
    mission: "Mission",
    missionPlaceholder: "Ares III",
    age: "Age",
    years: "years",
    sex: "Sex",
    height: "Height",
    weight: "Weight",
    bloodType: "Blood type",
    bloodUnknown: "Don't know",
    restingHr: "Resting heart rate",
    restingHrHint: "Baseline for the simulation. Defaults to 68 bpm.",
    allergies: "Allergies",
    allergiesPlaceholder: "E.g. penicillin, latex",
    medications: "Current medication",
    medicationsPlaceholder: "E.g. melatonin 3 mg at night",
    conditions: "Pre-existing conditions",
    conditionsPlaceholder: "E.g. migraine, mild asthma",
    errors: {
      name: "Enter the full name.",
      role: "Enter the role on board.",
      age: "Age between 18 and 80.",
      height: "Height between 140 and 215 cm.",
      weight: "Weight between 40 and 160 kg.",
      restingHr: "Resting heart rate between 35 and 110 bpm.",
    },
    submitNew: "Open my digital twin",
    submitEdit: "Save details",
  },
  nav: {
    label: "Main navigation",
    now: "Now",
    vitals: "Vitals",
    log: "Log",
    body: "Body",
    profile: "Crew",
    settings: "Settings",
    statusLink: (s) => `Overall status: ${s}. Open the Now panel`,
    privacyLocal: "On device",
    privacyCloud: "Cloud AI",
    privacyOff: "AI off",
    privacyLink: "Privacy and AI engine. Open settings",
    criticalBanner: "Critical status. Stop the activity and call the flight surgeon.",
    criticalAction: "See guidance",
    micShortcut: "Shortcut: space bar outside text fields",
    undo: "Undo",
    undoLast: "Undo last correction",
    undoHint: "Shortcut: ⌘Z or Ctrl+Z",
    undoResolved: (s) => `Resolved: ${s}. Added to the log.`,
    undoDismissed: (s, n) => `Dismissed: ${s}.${n ? ` Tagged on ${n} ${n === 1 ? "report" : "reports"}; the reports stay in the log.` : ""}`,
    undoDeleted: "Report deleted from the log.",
    undoCleared: (n) => `Session cleared: ${n} ${n === 1 ? "entry" : "entries"} removed.`,
    undoClose: "Dismiss notice",
  },
  dashboard: {
    loadingScene: "Building the digital twin…",
    hello: (name) => `Hi, ${name}`,
    years: (n) => `${n} years`,
    micOn: "Listening",
    micOff: "Start always-on listening",
    sections: "Sections",
    overview: "Overview",
    vitalsNav: "Vital signs",
    reports: "New report",
    body: "Body",
    bodyRegion: "Crew member's body",
    bodyHint: "Tap a point to see the region. Drag to rotate.",
    noComplaints: "No complaints logged.",
    editProfile: "Edit crew member details",
    healthState: "Health status",
    refining: "Refining guidance with the AI…",
    source: (engine) => `Source: ${engine}`,
    rulesEngine: "Local rules",
    noSymptoms: "No active symptoms. Keep telling us how you feel.",
    range: (r) => `Range ${r}`,
    heartRate: "Heart rate",
    last60: "last 60 s",
    bpmNow: "bpm now",
    average: "average",
    now: "now",
  },
  voice: {
    off: "Listening is off. Turn it on above or type below.",
    requesting: "Requesting microphone access…",
    denied: "Microphone blocked. Allow access in the browser permissions.",
    error: "Couldn't open the microphone.",
    loading: (pct) => `Loading speech recognition… ${pct}%`,
    sttFailed: "Speech recognition failed to load. Use the text field.",
    transcribing: "Transcribing…",
    hearing: "Hearing you…",
    listening: "Listening. Say how you're feeling.",
    inputLabel: "Describe how you feel",
    placeholder: "Or type: I feel dizzy…",
    send: "Send",
    historyLabel: "Report history",
    empty: "Reports show up here, with the symptoms recognized in each one.",
    sourceVoice: "voice",
    sourceTyped: "text",
    improvement: "improvement reported",
    examples: [
      "I have a headache and feel a little nauseous.",
      "I feel a strong tightness in my chest and shortness of breath.",
      "My left arm is tingling.",
      "The headache is gone, I'm fine.",
    ],
  },
  engine: {
    sttReady: "ready",
    sttFailed: "failed",
    waiting: "waiting",
    browserReady: (m) => `${m} in the browser`,
    browserLoading: (m, pct) => `Downloading ${m} · ${pct}%`,
    browserFailed: (m) => `${m} couldn't load on this device`,
    browserWaiting: (m) => `${m} waiting`,
    sttOnDemand: "loads when listening starts",
    offLabel: "Off",
    offHint: "No AI model: local rules only, no compute used",
    offStatus: "AI off · local rules only",
    cloudBadge: "Voice on device · AI in the cloud",
    localBadge: "100% on-device processing",
    pickerLabel: "Guidance AI",
    openrouterHint: "Cloud models with your own key",
    openrouterNoKey: "Add your OpenRouter key",
    browserHint: "Small model running on this device",
    browserLabel: "Browser",
    configure: "Configure AI",
    settingsTitle: "Configure AI",
    browserSection: "Browser model",
    browserIntro: "Runs on this device and sends nothing out. Downloads once, then stays cached.",
    noGpu: " No GPU available: larger models will be slow.",
    openrouterIntro:
      "Larger cloud models with your own key. It's stored only in this browser and goes straight to OpenRouter. With this option on, reports and the profile leave the device.",
    apiKey: "API key",
    model: "Model",
    createKey: "Create an OpenRouter key",
    removeKey: "Remove key",
    errors: {
      auth: "Invalid OpenRouter key.",
      credits: "Out of OpenRouter credits.",
      model: "Model not found on OpenRouter.",
      rate: "OpenRouter rate limit reached.",
      network: "No response from OpenRouter.",
      other: "OpenRouter rejected the request.",
    },
  },
  browserModels: {
    "onnx-community/Qwen2.5-0.5B-Instruct": "Lightest and fastest, simple answers",
    "onnx-community/gemma-3-1b-it-ONNX": "Balanced, good multilingual output",
    "onnx-community/Qwen2.5-1.5B-Instruct": "Most capable, needs a GPU and more memory",
  },
  context: {
    crew: (p) => `Crew member: ${p.name}, ${p.role}, ${p.age} years old${p.sex ? `, ${p.sex.toLowerCase()}` : ""}, ${p.height} m, ${p.weight} kg${p.blood ? `, blood type ${p.blood}` : ""}.`,
    allergies: (v) => `Allergies: ${v}.`,
    medications: (v) => `Current medication: ${v}.`,
    conditions: (v) => `Pre-existing conditions: ${v}.`,
    none: "none",
    noneReported: "none reported",
    speech: (t) => `Crew member said: "${t}"`,
    activeSymptoms: "Active symptoms:",
    vitals: (v) =>
      `Vital signs: HR ${v.hr} bpm, SpO₂ ${v.spo2}%, temperature ${v.temp} °C, respiration ${v.rr} rpm, BP ${v.sys}/${v.dia} mmHg.`,
    overall: (s) => `Overall status: ${s}.`,
    instruction:
      "Give the crew member immediate feedback in 2 or 3 short sentences, plain text, no markdown. Do not escalate beyond the overall status given.",
  },
  prompt: `You are the onboard medical assistant of a Mars mission. Contact with Earth has up to a 22-minute delay, so you guide the crew member right away.
Reference ranges (values inside them are normal; do not treat them as a problem):
- Temperature 36.0–37.5 °C; fever only above 37.7 °C.
- Heart rate 50–100 bpm; SpO₂ 95–100%; respiration 12–20 rpm; blood pressure 90–135/60–85 mmHg.
Rules:
- Answer in English, in 2 or 3 short sentences, plain text: no markdown, no lists, no bold.
- Say what to do now, in a practical and calm way.
- Do not give a definitive diagnosis and do not make up measurements.
- The "Overall status" was already computed by the onboard rules. Do not escalate beyond it: only tell them to stop the activity or call the flight surgeon if the status is Critical.`,
};

export const messages: Record<Locale, Messages> = { pt, en };

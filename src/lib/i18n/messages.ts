import type { RedFlag, Region, Severity, Status, SymptomId } from "@/lib/health/types";
import type { Locale } from "./locale";

type VitalKey = "heartRate" | "spo2" | "temperature" | "respiration" | "systolic";
type SexKey = "feminino" | "masculino" | "outro" | "nao_informado";
type OrErrorCode = "auth" | "credits" | "model" | "rate" | "network" | "other";

export interface Messages {
  meta: { title: string; description: string };
  brand: { tagline: string };
  common: { cancel: string; save: string; optional: string; back: string; continue: string };
  language: { label: string; names: Record<Locale, string> };
  sex: Record<SexKey, string>;
  severity: Record<Severity, string>;
  status: Record<Status, { label: string; summary: string }>;
  regions: Record<Region, string>;
  vitals: Record<VitalKey, { label: string; range: string }>;
  symptoms: Record<SymptomId, { label: string; advice: string }>;
  redFlags: Record<RedFlag, string>;
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
    skip: string;
    now: string;
    history: string;
    me: string;
    sections: string;
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
    undoAlert: string;
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
    protocol: string;
    hazards: (list: string) => string;
    safety: string;
    avoid: (list: string) => string;
    instruction: string;
  };
  prompt: string;
}

const pt: Messages = {
  meta: { title: "cheeseOS · Gêmeo digital", description: "Gêmeo digital de saúde do tripulante, com escuta por voz e IA local." },
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
    dizziness: { label: "Tontura", advice: "Ancorar-se a um apoio e evitar movimentos bruscos de cabeça; comum nas transições de gravidade. Se vier com desmaio, checar pressão." },
    vision: { label: "Alteração visual", advice: "Registrar o episódio: cerca de 70% dos astronautas têm sinais de SANS (fluido pressionando os olhos). Testar visão de perto e agendar fundo de olho." },
    fever: { label: "Febre", advice: "Medir temperatura, hidratar e isolar se houver outros sintomas." },
    numbness: { label: "Dormência", advice: "Testar força e sensibilidade; checar ajuste do traje e pontos de pressão. Após EVA, suspeitar de doença descompressiva." },
    nausea: { label: "Náusea", advice: "Antiemético do kit e movimentos de cabeça lentos; hidratar em goles." },
    space_motion_sickness: { label: "Enjoo espacial", advice: "Comum nos primeiros dias e nas transições de gravidade: fixar a cabeça, olhar um ponto fixo, antiemético do kit e hidratar em goles." },
    abdominal_pain: { label: "Dor abdominal", advice: "Localizar a dor (quadrante) e monitorar evolução por 30 min." },
    epigastric_pain: { label: "Dor epigástrica", advice: "Boca do estômago: estômago, esôfago ou pâncreas; antiácido do kit. Se vier com suor frio ou falta de ar, fazer ECG (infarto pode doer aqui)." },
    ruq_pain: { label: "Dor no quadrante superior direito", advice: "Região do fígado e vesícula: observar piora após comer, febre ou pele amarelada e avisar o médico de voo." },
    luq_pain: { label: "Dor no quadrante superior esquerdo", advice: "Região do baço, estômago e pâncreas: checar trauma recente e palpar com cuidado; registrar e monitorar." },
    periumbilical_pain: { label: "Dor ao redor do umbigo", advice: "Intestino delgado; pode ser o início de uma apendicite. Reavaliar em 1 h se a dor migrar para o lado direito embaixo." },
    rlq_pain: { label: "Dor no quadrante inferior direito", advice: "Região do apêndice: testar dor ao soltar a pressão, medir a temperatura e avisar o médico de voo." },
    llq_pain: { label: "Dor no quadrante inferior esquerdo", advice: "Região do cólon sigmoide (diverticulite, intestino preso): medir a temperatura e registrar o hábito intestinal." },
    suprapubic_pain: { label: "Dor no baixo ventre", advice: "Bexiga ou útero: checar ardência ao urinar, retenção urinária e hidratar." },
    flank_pain: { label: "Dor no flanco (rins)", advice: "Dor em cólica nas costas laterais: risco de cálculo renal (perda óssea em microgravidade). Hidratar e checar sangue na urina." },
    headache: { label: "Dor de cabeça", advice: "Hidratar, reduzir a luz e checar o CO₂ do módulo." },
    migraine: { label: "Enxaqueca", advice: "Dor pulsátil de um lado, piora com luz e barulho: repouso no escuro, analgésico do kit cedo e hidratar." },
    tension_headache: { label: "Cefaleia tensional", advice: "Aperto em faixa dos dois lados: alongar pescoço e ombros, pausa de telas e rever sono e postura." },
    cluster_headache: { label: "Cefaleia em salvas", advice: "Dor intensa em volta de um olho com lacrimejamento: oxigênio a 100% por 15 min e avisar o médico de voo." },
    sinus_headache: { label: "Cefaleia sinusal", advice: "Dor na testa e nas maçãs do rosto com congestão: lavagem nasal, vapor e checar umidade da cabine." },
    thunderclap_headache: { label: "Cefaleia súbita intensa", advice: "Dor de cabeça explosiva e repentina: interromper tudo e acionar o médico de voo imediatamente (risco de hemorragia)." },
    retro_orbital_pain: { label: "Dor retro-orbital", advice: "Dor atrás dos olhos: checar febre (arboviroses), pressão ocular e visão; evitar telas e registrar o episódio." },
    stiff_neck: { label: "Rigidez de nuca", advice: "Testar se o queixo encosta no peito; com febre ou dor de cabeça, acionar o médico de voo." },
    ear_pain: { label: "Dor de ouvido", advice: "Checar mudanças de pressão da cabine e sinais de otite; manobra de Valsalva suave e analgésico do kit." },
    sore_throat: { label: "Dor de garganta", advice: "Gargarejo com água morna e sal, hidratar e medir a temperatura; checar umidade e filtros da cabine." },
    congestion: { label: "Congestão facial", advice: "Efeito comum do deslocamento de fluidos; exercício leve ajuda." },
    cough: { label: "Tosse", advice: "Checar filtros de ar e umidade da cabine." },
    back_pain: { label: "Dor nas costas", advice: "Alongamento em posição fetal; a coluna alonga até 3% em microgravidade. Dor após impacto: avaliar fratura (perda óssea)." },
    arm_pain: { label: "Dor no braço", advice: "Avaliar se houve esforço; gelo e repouso do membro." },
    leg_pain: { label: "Dor na perna", advice: "Checar inchaço; se unilateral e quente, avaliar trombose." },
    joint_pain: { label: "Dor nas articulações", advice: "Checar inchaço, calor e vermelhidão; repouso da articulação. Durante ou após EVA: suspeitar de doença descompressiva. Várias juntas com febre: avaliar arbovirose." },
    hand_pain: { label: "Dor na mão", advice: "Checar esforço repetitivo e ajuste das luvas; repouso, gelo e testar força de preensão." },
    finger_pain: { label: "Dor nos dedos da mão", advice: "Pontas dos dedos ou unhas doloridas: comum pela pressão das luvas de EVA. Checar ajuste da luva e se a unha está descolando." },
    hand_numbness: { label: "Dormência na mão", advice: "Polegar ao anelar: nervo mediano (túnel do carpo); mínimo: nervo ulnar. Afrouxar a luva e testar força. Súbita e de um lado só, avaliar AVC." },
    foot_pain: { label: "Dor no pé", advice: "Checar calçado e pontos de pressão dos apoios de pé; massagear a sola e alongar." },
    heel_pain: { label: "Dor no calcanhar", advice: "Pior nos primeiros passos: fascite plantar. Alongar a panturrilha e a sola, gelo por 15 min." },
    toe_pain: { label: "Dor nos dedos do pé", advice: "Dedão inchado, quente e vermelho: possível gota. Checar unha encravada e atrito dos apoios de pé." },
    foot_numbness: { label: "Dormência no pé", advice: "Checar circulação (cor, temperatura, pulso no pé) e compressão do calçado; nos dois pés, avaliar neuropatia." },
    foot_swelling: { label: "Inchaço no pé/tornozelo", advice: "Nos dois pés: retenção de líquido (coração, rins). Em um só e quente: avaliar trombose. Elevar as pernas e medir a circunferência." },
    cold_extremities: { label: "Extremidades frias/roxas", advice: "Aquecer e checar circulação e enchimento capilar; dedos brancos e depois roxos no frio sugerem Raynaud. Checar temperatura do traje." },
    muscle_pain: { label: "Dor muscular", advice: "Normal após o treino resistido (meta de 1,5 h/dia); hidratar e alongar. Fraqueza crescente: registrar para comparar com a linha de base." },
    fatigue: { label: "Fadiga", advice: "Rever o ciclo de sono (16 nasceres do sol por dia desregulam o relógio biológico): horário fixo, luz LED clara de dia e pausa de 20 min." },
    anxiety: { label: "Ansiedade", advice: "Respiração 4-7-8 por 2 min; conversar com a equipe de suporte psicológico." },
    disorientation: { label: "Desorientação espacial", advice: "Ancorar-se e usar referências visuais (piso, teto); não operar controles nem sair da nave até passar." },
    confusion: { label: "Confusão mental", advice: "Checar SpO₂, O₂ e CO₂ da cabine e fazer um teste cognitivo curto; não executar tarefas críticas sozinho." },
    insomnia: { label: "Insônia", advice: "Manter horário fixo, escurecer o compartimento e usar a luz LED do ciclo dia-noite; evitar cafeína nas 6 h antes de dormir." },
    low_mood: { label: "Humor baixo", advice: "Escrever no diário, falar com alguém da tripulação ou com o suporte psicológico, cuidar das plantas ou olhar pela janela." },
    skin_rash: { label: "Erupção na pele", advice: "Fotografar e registrar; não coçar. Imunidade alterada pode reativar herpes: bolhas em faixa de um lado só sugerem herpes-zóster." },
  },
  redFlags: {
    cardiac: "Dor torácica irradiando para o braço ou ombro esquerdo: protocolo cardíaco imediato.",
    thunderclap: "Cefaleia súbita e explosiva: acionar o médico de voo agora e monitorar consciência e pupilas.",
    meningitis: "Dor de cabeça com febre e rigidez de nuca: suspeita de meningite. Isolar e acionar o médico de voo agora.",
    appendicitis: "Dor no lado direito inferior com febre ou náusea: suspeita de apendicite. Jejum e médico de voo agora.",
    peritonitis: "Barriga rígida ou dor ao soltar a pressão: irritação do peritônio. Jejum, repouso e médico de voo imediatamente.",
    arbovirus: "Febre com dor atrás dos olhos ou nas articulações: avaliar arbovirose (dengue, chikungunya). Hidratar e evitar anti-inflamatórios e aspirina.",
    decompression: "Sintomas durante ou após EVA ou mudança de pressão: suspeita de doença descompressiva. Encerrar a EVA, voltar à nave, oxigênio a 100% e preparar recompressão.",
    hypoxia: "Confusão com dor de cabeça, falta de ar ou alteração visual: possível hipóxia ou CO₂ alto. Máscara de oxigênio, checar SpO₂ e o ar da cabine agora.",
    radiation: "Náusea ou mal-estar após evento solar ou alarme de radiação: ir ao abrigo blindado, ler o dosímetro e registrar a dose.",
    fracture: "Dor após queda ou impacto: os ossos perdem 1% a 1,5% de densidade por mês no espaço. Imobilizar e avaliar fratura antes de usar o membro.",
    crisis: "Pensamentos de se machucar: você não está sozinho. Chame agora alguém da tripulação e o suporte psicológico, e não fique sozinho.",
    dvt: "Pé ou tornozelo inchado de um lado só, quente ou com dor na panturrilha: suspeita de trombose. Não massagear e acionar o médico de voo.",
  },
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
    rolePlaceholder: "Ex.: engenheira de voo",
    mission: "Missão",
    missionPlaceholder: "Ex.: Ares III",
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
    skip: "Pular para o conteúdo",
    now: "Agora",
    history: "Histórico",
    me: "Eu",
    sections: "Seções desta área",
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
    undoAlert: "Alerta de segurança dispensado. Registrado no diário.",
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
    off: "Escuta desligada. Toque no microfone ou digite abaixo.",
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
    browserLabel: "Neste aparelho",
    configure: "Configurar IA",
    settingsTitle: "Configurar IA",
    browserSection: "Modelo no navegador",
    browserIntro: "Roda neste aparelho, sem enviar nada. Baixa uma vez e fica em cache.",
    noGpu: " Sem GPU disponível: os modelos maiores ficam lentos.",
    openrouterIntro:
      "Modelos maiores na nuvem com a sua chave. Ela fica salva só neste navegador e vai direto para o OpenRouter. Com esta opção ativa, os relatos e o perfil saem do aparelho.",
    apiKey: "Chave do OpenRouter",
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
    "onnx-community/gemma-3-1b-it-ONNX": "Recomendado: segue melhor as instruções e escreve bem em português",
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
      `Sinais vitais (SIMULADOS pelo gêmeo digital, não são medições): FC ${v.hr} bpm, SpO₂ ${v.spo2}%, temperatura ${v.temp} °C, respiração ${v.rr} rpm, PA ${v.sys}/${v.dia} mmHg.`,
    overall: (s) => `Estado geral: ${s}.`,
    protocol: "Protocolo de bordo já mostrado ao tripulante (não repita, complemente):",
    hazards: (l) => `Riscos NASA relacionados: ${l}.`,
    safety: "Alertas de segurança já exibidos:",
    avoid: (l) => `NUNCA sugira: ${l} (alergia declarada).`,
    instruction:
      "Escreva 2 ou 3 frases curtas, em texto simples. 1) Uma ação prática que complemente o protocolo (o que observar, como se posicionar, quando reavaliar). 2) Por que isso acontece no espaço, em linguagem simples. 3) Em que sinal de piora escalar. Não repita nem resuma a fala do tripulante. Não escale além do estado geral informado.",
  },
  prompt: `Você é o assistente médico de bordo de uma missão em Marte. O contato com a Terra tem até 20 minutos de atraso em cada sentido, então você orienta o tripulante na hora, sem depender do solo.
Contexto do voo espacial (use para explicar causas prováveis, sem alarmar):
- Fluidos sobem para a cabeça: congestão, dor de cabeça e alterações visuais (SANS afeta cerca de 70% dos astronautas). CO₂ alto também causa dor de cabeça.
- Ossos perdem 1% a 1,5% ao mês: mais risco de fratura em quedas e de cálculo renal. Músculos e aptidão caem 10% a 12%.
- Enjoo e desorientação são comuns nas transições de gravidade. Após EVA, dor articular, coceira ou formigamento sugerem doença descompressiva.
- Imunidade alterada reativa vírus latentes (herpes, zóster). Sono é afetado por 16 nasceres do sol por dia. Isolamento afeta o humor.
Faixas de referência (valores dentro delas são normais, não comente como problema):
- Temperatura 36,0–37,5 °C; febre só acima de 37,7 °C.
- Frequência cardíaca 50–100 bpm; SpO₂ 95–100%; respiração 12–20 rpm; pressão arterial 90–135/60–85 mmHg.
Regras:
- Responda em português do Brasil, em 2 ou 3 frases curtas, em texto simples: sem markdown, sem listas, sem negrito.
- Nunca repita, cite ou resuma o que o tripulante disse: ele já sabe o que sente. Comece direto pela ação.
- O protocolo de bordo já está na tela: acrescente o que ele não diz (o que observar, quando reavaliar, causa provável no espaço).
- Diga o que fazer agora, de forma prática e calma.
- Não dê diagnóstico definitivo e não invente medições. Os sinais vitais são simulados: não os trate como medição real.
- Nunca recomende medicamento citado nas alergias. Se não tiver certeza de um remédio, não cite nenhum.
Exemplo de boa resposta: "Fique em repouso com a cabeça elevada e reavalie em 30 minutos. Em microgravidade os fluidos sobem para a cabeça e o CO₂ da cabine soma, por isso a dor é comum. Se surgir vômito, rigidez na nuca ou alteração da visão, registre e avise o médico de voo."
- O "Estado geral" já foi calculado pelas regras de bordo. Não escale além dele: só mande interromper a atividade ou acionar o médico de voo se o estado for Crítico.`,
};

const en: Messages = {
  meta: { title: "cheeseOS · Digital twin", description: "Crew health digital twin with voice reporting and on-device AI." },
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
    dizziness: { label: "Dizziness", advice: "Hold on to a support and avoid sudden head movements; common during gravity transitions. With fainting, check blood pressure." },
    vision: { label: "Vision change", advice: "Log the episode: about 70% of astronauts show signs of SANS (fluid pressing on the eyes). Test near vision and schedule a fundus exam." },
    fever: { label: "Fever", advice: "Take your temperature, hydrate and isolate if other symptoms appear." },
    numbness: { label: "Numbness", advice: "Test strength and sensation; check suit fit and pressure points. After an EVA, suspect decompression sickness." },
    nausea: { label: "Nausea", advice: "Take the kit's antiemetic and move your head slowly; sip water." },
    space_motion_sickness: { label: "Space motion sickness", advice: "Common in the first days and during gravity transitions: keep the head still, look at a fixed point, take the kit's antiemetic and sip water." },
    abdominal_pain: { label: "Abdominal pain", advice: "Locate the pain (quadrant) and monitor it for 30 min." },
    epigastric_pain: { label: "Epigastric pain", advice: "Pit of the stomach: stomach, esophagus or pancreas; take the kit's antacid. With cold sweat or breathlessness, run an ECG (a heart attack can hurt here)." },
    ruq_pain: { label: "Right upper quadrant pain", advice: "Liver and gallbladder area: watch for pain after meals, fever or yellow skin and notify the flight surgeon." },
    luq_pain: { label: "Left upper quadrant pain", advice: "Spleen, stomach and pancreas area: check for recent trauma, palpate gently, log and monitor." },
    periumbilical_pain: { label: "Pain around the navel", advice: "Small intestine; can be early appendicitis. Reassess in 1 h if the pain moves to the lower right." },
    rlq_pain: { label: "Right lower quadrant pain", advice: "Appendix area: test for pain on release, take your temperature and notify the flight surgeon." },
    llq_pain: { label: "Left lower quadrant pain", advice: "Sigmoid colon area (diverticulitis, constipation): take your temperature and log bowel habits." },
    suprapubic_pain: { label: "Lower belly pain", advice: "Bladder or uterus: check for burning on urination or urinary retention, and hydrate." },
    flank_pain: { label: "Flank pain (kidneys)", advice: "Colicky pain in the side of the back: kidney stone risk (bone loss in microgravity). Hydrate and check for blood in urine." },
    headache: { label: "Headache", advice: "Hydrate, dim the lights and check the module's CO₂." },
    migraine: { label: "Migraine", advice: "Throbbing one-sided pain, worse with light and noise: rest in the dark, take the kit's analgesic early and hydrate." },
    tension_headache: { label: "Tension headache", advice: "Band-like pressure on both sides: stretch neck and shoulders, take a screen break and review sleep and posture." },
    cluster_headache: { label: "Cluster headache", advice: "Severe pain around one eye with tearing: 100% oxygen for 15 min and notify the flight surgeon." },
    sinus_headache: { label: "Sinus headache", advice: "Forehead and cheek pain with congestion: nasal rinse, steam and check cabin humidity." },
    thunderclap_headache: { label: "Sudden severe headache", advice: "Explosive, sudden headache: stop everything and call the flight surgeon immediately (bleeding risk)." },
    retro_orbital_pain: { label: "Retro-orbital pain", advice: "Pain behind the eyes: check for fever (arboviruses), eye pressure and vision; avoid screens and log the episode." },
    stiff_neck: { label: "Stiff neck", advice: "Check whether the chin touches the chest; with fever or headache, call the flight surgeon." },
    ear_pain: { label: "Ear pain", advice: "Check cabin pressure changes and signs of infection; gentle Valsalva and the kit's analgesic." },
    sore_throat: { label: "Sore throat", advice: "Gargle warm salt water, hydrate and take your temperature; check cabin humidity and filters." },
    congestion: { label: "Facial congestion", advice: "Common effect of fluid shift; light exercise helps." },
    cough: { label: "Cough", advice: "Check the cabin air filters and humidity." },
    back_pain: { label: "Back pain", advice: "Stretch in a fetal position; the spine lengthens up to 3% in microgravity. Pain after an impact: assess for a fracture (bone loss)." },
    arm_pain: { label: "Arm pain", advice: "Check for overexertion; ice and rest the limb." },
    leg_pain: { label: "Leg pain", advice: "Check for swelling; if one-sided and warm, assess for thrombosis." },
    joint_pain: { label: "Joint pain", advice: "Check for swelling, warmth and redness; rest the joint. During or after an EVA: suspect decompression sickness. Several joints with fever: assess for an arbovirus." },
    hand_pain: { label: "Hand pain", advice: "Check for repetitive strain and glove fit; rest, ice and test grip strength." },
    finger_pain: { label: "Finger pain", advice: "Sore fingertips or nails: common from EVA glove pressure. Check glove fit and whether a nail is lifting." },
    hand_numbness: { label: "Hand numbness", advice: "Thumb to ring finger: median nerve (carpal tunnel); little finger: ulnar nerve. Loosen the glove and test strength. Sudden and one-sided: assess for stroke." },
    foot_pain: { label: "Foot pain", advice: "Check footwear and pressure points from the foot restraints; massage the sole and stretch." },
    heel_pain: { label: "Heel pain", advice: "Worse on the first steps: plantar fasciitis. Stretch the calf and sole, ice for 15 min." },
    toe_pain: { label: "Toe pain", advice: "Swollen, hot, red big toe: possible gout. Check for an ingrown nail and rubbing from the foot restraints." },
    foot_numbness: { label: "Foot numbness", advice: "Check circulation (color, temperature, foot pulse) and shoe pressure; in both feet, assess for neuropathy." },
    foot_swelling: { label: "Foot/ankle swelling", advice: "Both feet: fluid retention (heart, kidneys). One foot and warm: assess for thrombosis. Raise the legs and measure the circumference." },
    cold_extremities: { label: "Cold/blue extremities", advice: "Warm up and check circulation and capillary refill; fingers turning white then blue in the cold suggest Raynaud's. Check suit temperature." },
    muscle_pain: { label: "Muscle pain", advice: "Normal after resistance training (1.5 h/day target); hydrate and stretch. Growing weakness: log it to compare with the baseline." },
    fatigue: { label: "Fatigue", advice: "Review the sleep cycle (16 sunrises a day throw off the body clock): fixed schedule, bright LED light by day and a 20-min break." },
    anxiety: { label: "Anxiety", advice: "Do 4-7-8 breathing for 2 min; talk to the psychological support team." },
    disorientation: { label: "Spatial disorientation", advice: "Hold on and use visual references (floor, ceiling); don't operate controls or leave the vehicle until it passes." },
    confusion: { label: "Mental confusion", advice: "Check SpO₂ and cabin O₂ and CO₂ and take a short cognitive test; don't do critical tasks alone." },
    insomnia: { label: "Insomnia", advice: "Keep a fixed schedule, darken the crew quarters and use the day-night LED cycle; no caffeine in the 6 h before sleep." },
    low_mood: { label: "Low mood", advice: "Write in the journal, talk to a crewmate or the psychological support team, tend the plants or look out the window." },
    skin_rash: { label: "Skin rash", advice: "Photograph and log it; don't scratch. Altered immunity can reactivate herpes: blisters in a band on one side suggest shingles." },
  },
  redFlags: {
    cardiac: "Chest pain radiating to the left arm or shoulder: start the cardiac protocol now.",
    thunderclap: "Sudden, explosive headache: call the flight surgeon now and monitor consciousness and pupils.",
    meningitis: "Headache with fever and a stiff neck: suspected meningitis. Isolate and call the flight surgeon now.",
    appendicitis: "Lower right pain with fever or nausea: suspected appendicitis. Nothing by mouth; call the flight surgeon now.",
    peritonitis: "Rigid belly or pain on release: peritoneal irritation. Nothing by mouth, rest and call the flight surgeon immediately.",
    arbovirus: "Fever with pain behind the eyes or in the joints: assess for an arbovirus (dengue, chikungunya). Hydrate and avoid NSAIDs and aspirin.",
    decompression: "Symptoms during or after an EVA or a pressure change: suspected decompression sickness. End the EVA, return to the vehicle, give 100% oxygen and prepare for recompression.",
    hypoxia: "Confusion with headache, breathlessness or vision change: possible hypoxia or high CO₂. Put on an oxygen mask and check SpO₂ and cabin air now.",
    radiation: "Nausea or malaise after a solar event or radiation alarm: go to the shielded shelter, read the dosimeter and log the dose.",
    fracture: "Pain after a fall or impact: bones lose 1–1.5% of density a month in space. Immobilize and assess for a fracture before using the limb.",
    crisis: "Thoughts of hurting yourself: you are not alone. Call a crewmate and the psychological support team now, and don't stay alone.",
    dvt: "One swollen foot or ankle that is warm or with calf pain: suspected thrombosis. Don't massage it; call the flight surgeon.",
  },
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
    rolePlaceholder: "E.g. flight engineer",
    mission: "Mission",
    missionPlaceholder: "E.g. Ares III",
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
    skip: "Skip to content",
    now: "Now",
    history: "History",
    me: "Me",
    sections: "Sections in this area",
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
    undoAlert: "Safety alert dismissed. Added to the log.",
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
    off: "Listening is off. Tap the mic at the top of the screen or type below.",
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
    browserLabel: "On this device",
    configure: "Configure AI",
    settingsTitle: "Configure AI",
    browserSection: "Browser model",
    browserIntro: "Runs on this device and sends nothing out. Downloads once, then stays cached.",
    noGpu: " No GPU available: larger models will be slow.",
    openrouterIntro:
      "Larger cloud models with your own key. It's stored only in this browser and goes straight to OpenRouter. With this option on, reports and the profile leave the device.",
    apiKey: "OpenRouter key",
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
    "onnx-community/gemma-3-1b-it-ONNX": "Recommended: follows instructions best, good multilingual output",
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
      `Vital signs (SIMULATED by the digital twin, not measurements): HR ${v.hr} bpm, SpO₂ ${v.spo2}%, temperature ${v.temp} °C, respiration ${v.rr} rpm, BP ${v.sys}/${v.dia} mmHg.`,
    overall: (s) => `Overall status: ${s}.`,
    protocol: "Onboard protocol already shown to the crew member (do not repeat it, add to it):",
    hazards: (l) => `Related NASA hazards: ${l}.`,
    safety: "Safety alerts already shown:",
    avoid: (l) => `NEVER suggest: ${l} (declared allergy).`,
    instruction:
      "Write 2 or 3 short sentences, plain text. 1) One practical action that adds to the protocol (what to watch, how to position, when to reassess). 2) Why this happens in space, in plain words. 3) Which sign of worsening should be escalated. Do not repeat or summarize what the crew member said. Do not escalate beyond the overall status given.",
  },
  prompt: `You are the onboard medical assistant of a Mars mission. Contact with Earth has up to a 20-minute delay each way, so you guide the crew member right away, without relying on the ground.
Spaceflight context (use it to explain likely causes, without alarming):
- Fluids shift to the head: congestion, headache and vision changes (SANS affects about 70% of astronauts). High CO₂ also causes headaches.
- Bones lose 1–1.5% a month: higher risk of fractures in falls and of kidney stones. Muscle and fitness drop 10–12%.
- Nausea and disorientation are common in gravity transitions. After an EVA, joint pain, itching or tingling suggest decompression sickness.
- Altered immunity reactivates latent viruses (herpes, shingles). Sleep is disrupted by 16 sunrises a day. Isolation affects mood.
Reference ranges (values inside them are normal; do not treat them as a problem):
- Temperature 36.0–37.5 °C; fever only above 37.7 °C.
- Heart rate 50–100 bpm; SpO₂ 95–100%; respiration 12–20 rpm; blood pressure 90–135/60–85 mmHg.
Rules:
- Answer in English, in 2 or 3 short sentences, plain text: no markdown, no lists, no bold.
- Never repeat, quote or summarize what the crew member said: they know what they feel. Start straight with the action.
- The onboard protocol is already on screen: add what it does not say (what to watch, when to reassess, likely cause in space).
- Say what to do now, in a practical and calm way.
- Do not give a definitive diagnosis and do not make up measurements. Vital signs are simulated: do not treat them as real readings.
- Never recommend a medication listed in the allergies. If unsure about a drug, name none.
Example of a good answer: "Rest with your head raised and reassess in 30 minutes. In microgravity fluids shift to the head and cabin CO₂ adds to it, which is why this pain is common. If vomiting, a stiff neck or vision changes appear, log it and tell the flight surgeon."
- The "Overall status" was already computed by the onboard rules. Do not escalate beyond it: only tell them to stop the activity or call the flight surgeon if the status is Critical.`,
};

export const messages: Record<Locale, Messages> = { pt, en };

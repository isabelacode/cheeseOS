import type { Locale } from "../locale";

export interface LogMessages {
  title: string;
  counts: (reports: number, active: number) => string;
  composerLabel: string;
  placeholder: string;
  send: string;
  micHint: string;
  filtersLabel: string;
  sourceLabel: string;
  sources: { all: string; voice: string; typed: string; action: string };
  symptomLabel: string;
  allSymptoms: string;
  searchLabel: string;
  searchPlaceholder: string;
  clearFilters: string;
  noMatches: string;
  shown: (n: number, total: number) => string;
  today: string;
  yesterday: string;
  sourceVoice: string;
  sourceTyped: string;
  sourceAction: string;
  markedResolved: (label: string) => string;
  markedDismissed: (label: string) => string;
  markedAlert: (headline: string) => string;
  improvement: string;
  dismissed: string;
  deleteEntry: string;
  confirmDelete: string;
  confirmYes: string;
  confirmNo: string;
  emptyTitle: string;
  emptyBody: string;
  emptyHow: string;
  timelineTitle: string;
  timelineEmpty: string;
  timelineNow: string;
  timelineState: { active: string; resolved: string; dismissed: string; inactive: string };
  timelineRange: (from: string, to: string) => string;
  /** Active span: start and how long it has lasted. */
  timelineSince: (from: string, duration: string) => string;
  /** Ended span: "08:33 · lasted 4 min", or "from 08:33 to 09:10 · lasted 37 min". */
  timelineLasted: (when: string, duration: string) => string;
  /** One line under the timeline: what each state means. */
  timelineLegend: string;
  cleared: (labels: string) => string;
  noneRecognized: string;
  showMore: string;
  showLess: string;
  dayCount: (n: number) => string;
  exportEmpty: string;
  exportTitle: string;
  exportBody: string;
  exportButton: string;
  exportDone: string;
  file: {
    heading: string;
    generated: (when: string) => string;
    crew: string;
    name: string;
    role: string;
    mission: string;
    age: string;
    years: (n: number) => string;
    sex: string;
    bloodType: string;
    allergies: string;
    medications: string;
    conditions: string;
    none: string;
    unknown: string;
    activeFindings: string;
    noActive: string;
    reportedAt: (when: string) => string;
    redFlag: string;
    log: string;
    noEntries: string;
    recognized: string;
    resolved: string;
    dismissed: string;
    cleared: string;
    footer: string;
    fileName: string;
    summary: string;
    status: (label: string, summary: string) => string;
    safety: string;
    noSafety: string;
    vitals: string;
    vitalsNote: string;
    vitalsCols: { vital: string; now: string; min: string; max: string; avg: string };
    evolution: string;
    noEvolution: string;
    duration: (d: string) => string;
    /** Long durations in the report, e.g. "3 dias". */
    days: (n: number) => string;
    state: { active: string; resolved: string; dismissed: string; inactive: string };
    protocol: string;
    hazards: string;
    routine: string;
    streak: (n: number) => string;
    missions: (done: number, total: number) => string;
    training: (reps: number, sets: number) => string;
    trainingLeast: (names: string) => string;
    sleep: (hours: string, nights: number) => string;
    sleepLoss: string;
    print: string;
  };
  exportHtml: string;
  exportHtmlHint: string;
}

const pt: LogMessages = {
  title: "Diário",
  counts: (r, a) => `${r} ${r === 1 ? "relato" : "relatos"} · ${a} ${a === 1 ? "sintoma ativo" : "sintomas ativos"}`,
  composerLabel: "Novo relato",
  placeholder: "Como você está?",
  send: "Enviar",
  micHint: "Ou fale: ligue o microfone no topo da tela (atalho: Espaço).",
  filtersLabel: "Filtrar relatos",
  sourceLabel: "Origem",
  sources: { all: "Todos", voice: "Voz", typed: "Texto", action: "Ações" },
  symptomLabel: "Sintoma",
  allSymptoms: "Todos os sintomas",
  searchLabel: "Buscar nos relatos",
  searchPlaceholder: "Buscar…",
  clearFilters: "Limpar filtros",
  noMatches: "Nenhum relato corresponde aos filtros.",
  shown: (n, total) => `${n} de ${total}`,
  today: "Hoje",
  yesterday: "Ontem",
  sourceVoice: "voz",
  sourceTyped: "texto",
  sourceAction: "ação",
  markedResolved: (l) => `Resolvido: ${l} (melhora informada por você)`,
  markedDismissed: (l) => `Descartado: ${l} (reconhecido por engano)`,
  markedAlert: (h) => `Alerta de segurança dispensado: ${h}`,
  improvement: "melhora relatada",
  dismissed: "descartado",
  deleteEntry: "Excluir relato",
  confirmDelete: "Excluir este relato?",
  confirmYes: "Excluir",
  confirmNo: "Cancelar",
  emptyTitle: "Nenhum relato ainda",
  emptyBody:
    "Aqui fica o histórico completo do que você contou: cada fala ou texto, os sintomas reconhecidos, as melhoras e os sintomas descartados.",
  emptyHow: "Para relatar, ligue o microfone no topo da tela (ou aperte Espaço) e fale, ou digite no campo acima.",
  timelineTitle: "Linha do tempo dos sintomas",
  timelineEmpty: "Os sintomas reconhecidos nos relatos aparecem aqui, do primeiro relato até a melhora.",
  timelineNow: "agora",
  timelineState: { active: "ativo", resolved: "resolvido", dismissed: "descartado", inactive: "encerrado" },
  timelineRange: (from, to) => `das ${from} às ${to}`,
  timelineSince: (from, d) => `desde ${from} · há ${d}`,
  timelineLasted: (w, d) => `${w} · durou ${d}`,
  timelineLegend: "Resolvido: você relatou melhora ou disse que está bem. Encerrado: saiu sem melhora específica registrada. Descartado: reconhecido por engano.",
  cleared: (ls) => `encerrado pelo “estou bem”: ${ls}`,
  noneRecognized: "nenhum sintoma reconhecido",
  showMore: "ver mais",
  showLess: "ver menos",
  dayCount: (n) => `${n} ${n === 1 ? "registro" : "registros"}`,
  exportEmpty: "Faça um relato para gerar o relatório.",
  exportTitle: "Exportar",
  exportBody: "Reúne perfil, alertas de segurança, sintomas ativos com protocolo, evolução dos sintomas, sinais vitais simulados da última hora e o diário completo.",
  exportButton: "Exportar para o médico de voo",
  exportDone: "Arquivo gerado.",
  file: {
    heading: "cheeseOS · Relatório para o médico de voo",
    generated: (w) => `Gerado em ${w}`,
    crew: "TRIPULANTE",
    name: "Nome",
    role: "Função",
    mission: "Missão",
    age: "Idade",
    years: (n) => `${n} anos`,
    sex: "Sexo",
    bloodType: "Tipo sanguíneo",
    allergies: "Alergias",
    medications: "Medicamentos",
    conditions: "Condições",
    none: "nenhuma informada",
    unknown: "não informado",
    activeFindings: "SINTOMAS ATIVOS",
    noActive: "Nenhum sintoma ativo.",
    reportedAt: (w) => `relatado em ${w}`,
    redFlag: "sinal de alerta",
    log: "DIÁRIO DE RELATOS (mais recente primeiro)",
    noEntries: "Nenhum relato.",
    recognized: "Reconhecido",
    resolved: "Melhora",
    dismissed: "Descartado",
    cleared: "Encerrado pelo “estou bem”",
    footer: "Sintomas reconhecidos por regras locais; não substitui avaliação médica.",
    fileName: "relatorio-medico-de-voo",
    summary: "RESUMO",
    status: (l, s) => `Estado geral: ${l} — ${s}`,
    safety: "ALERTAS DE SEGURANÇA (regras locais)",
    noSafety: "Nenhum conflito entre alergias, medicações e relatos.",
    vitals: "SINAIS VITAIS — SIMULADOS",
    vitalsNote: "Valores gerados pelo gêmeo digital a partir dos relatos (última hora). Não são medições de sensores.",
    vitalsCols: { vital: "Sinal", now: "Agora", min: "Mín.", max: "Máx.", avg: "Média" },
    evolution: "EVOLUÇÃO DOS SINTOMAS",
    noEvolution: "Nenhum sintoma registrado.",
    duration: (d) => `duração ${d}`,
    days: (n) => `${n} ${n === 1 ? "dia" : "dias"}`,
    state: { active: "ativo", resolved: "resolvido", dismissed: "descartado", inactive: "encerrado" },
    protocol: "Protocolo",
    hazards: "Riscos NASA",
    routine: "ROTINA DE MONITORAMENTO",
    streak: (n) => `Sequência de check-ins: ${n} ${n === 1 ? "dia" : "dias"}`,
    missions: (d, t) => `Missões de hoje: ${d} de ${t}`,
    training: (r, s) => `Treino com câmera em 7 dias: ${r} ${r === 1 ? "repetição" : "repetições"} em ${s} ${s === 1 ? "série" : "séries"}`,
    trainingLeast: (n) => `Exercícios menos feitos: ${n}`,
    sleep: (h, n) => `Sono informado em 7 dias: média de ${h} h em ${n} ${n === 1 ? "noite" : "noites"}`,
    sleepLoss: " (perda de sono: abaixo de 6 h)",
    print: "Imprimir / salvar PDF",
  },
  exportHtml: "Relatório visual (HTML/PDF)",
  exportHtmlHint: "Abre no navegador e pode ser impresso ou salvo como PDF.",
};

const en: LogMessages = {
  title: "Log",
  counts: (r, a) => `${r} ${r === 1 ? "report" : "reports"} · ${a} active ${a === 1 ? "symptom" : "symptoms"}`,
  composerLabel: "New report",
  placeholder: "How are you feeling?",
  send: "Send",
  micHint: "Or speak: turn on the microphone at the top of the screen (shortcut: Space).",
  filtersLabel: "Filter reports",
  sourceLabel: "Source",
  sources: { all: "All", voice: "Voice", typed: "Text", action: "Actions" },
  symptomLabel: "Symptom",
  allSymptoms: "All symptoms",
  searchLabel: "Search reports",
  searchPlaceholder: "Search…",
  clearFilters: "Clear filters",
  noMatches: "No reports match these filters.",
  shown: (n, total) => `${n} of ${total}`,
  today: "Today",
  yesterday: "Yesterday",
  sourceVoice: "voice",
  sourceTyped: "text",
  sourceAction: "action",
  markedResolved: (l) => `Resolved: ${l} (improvement you reported)`,
  markedDismissed: (l) => `Dismissed: ${l} (recognized by mistake)`,
  markedAlert: (h) => `Safety alert dismissed: ${h}`,
  improvement: "improvement reported",
  dismissed: "dismissed",
  deleteEntry: "Delete report",
  confirmDelete: "Delete this report?",
  confirmYes: "Delete",
  confirmNo: "Cancel",
  emptyTitle: "No reports yet",
  emptyBody:
    "This is the full history of what you told the twin: every spoken or typed report, the symptoms recognized, improvements and dismissed symptoms.",
  emptyHow: "To report, turn on the microphone at the top of the screen (or press Space) and speak, or type in the field above.",
  timelineTitle: "Symptom timeline",
  timelineEmpty: "Symptoms recognized in your reports show up here, from the first report until they improve.",
  timelineNow: "now",
  timelineState: { active: "active", resolved: "resolved", dismissed: "dismissed", inactive: "closed" },
  timelineRange: (from, to) => `from ${from} to ${to}`,
  timelineSince: (from, d) => `since ${from} · ${d} so far`,
  timelineLasted: (w, d) => `${w} · lasted ${d}`,
  timelineLegend: "Resolved: you reported it improved or said you're fine. Closed: ended without a specific improvement on record. Dismissed: recognized by mistake.",
  cleared: (ls) => `closed by “I'm fine”: ${ls}`,
  noneRecognized: "no symptom recognized",
  showMore: "show more",
  showLess: "show less",
  dayCount: (n) => `${n} ${n === 1 ? "entry" : "entries"}`,
  exportEmpty: "Make a report to generate the file.",
  exportTitle: "Export",
  exportBody: "Gathers profile, safety alerts, active symptoms with protocol, symptom evolution, the last hour of simulated vitals and the full log.",
  exportButton: "Export for the flight surgeon",
  exportDone: "File created.",
  file: {
    heading: "cheeseOS · Report for the flight surgeon",
    generated: (w) => `Generated ${w}`,
    crew: "CREW MEMBER",
    name: "Name",
    role: "Role",
    mission: "Mission",
    age: "Age",
    years: (n) => `${n} years`,
    sex: "Sex",
    bloodType: "Blood type",
    allergies: "Allergies",
    medications: "Medications",
    conditions: "Conditions",
    none: "none reported",
    unknown: "unknown",
    activeFindings: "ACTIVE SYMPTOMS",
    noActive: "No active symptoms.",
    reportedAt: (w) => `reported ${w}`,
    redFlag: "red flag",
    log: "REPORT LOG (newest first)",
    noEntries: "No reports.",
    recognized: "Recognized",
    resolved: "Improved",
    dismissed: "Dismissed",
    cleared: "Closed by “I'm fine”",
    footer: "Symptoms recognized by local rules; not a substitute for medical assessment.",
    fileName: "flight-surgeon-report",
    summary: "SUMMARY",
    status: (l, s) => `Overall status: ${l} — ${s}`,
    safety: "SAFETY ALERTS (local rules)",
    noSafety: "No conflict between allergies, medications and reports.",
    vitals: "VITAL SIGNS — SIMULATED",
    vitalsNote: "Values generated by the digital twin from the reports (last hour). Not sensor readings.",
    vitalsCols: { vital: "Vital", now: "Now", min: "Min", max: "Max", avg: "Avg" },
    evolution: "SYMPTOM EVOLUTION",
    noEvolution: "No symptoms recorded.",
    duration: (d) => `lasted ${d}`,
    days: (n) => `${n} ${n === 1 ? "day" : "days"}`,
    state: { active: "active", resolved: "resolved", dismissed: "dismissed", inactive: "closed" },
    protocol: "Protocol",
    hazards: "NASA hazards",
    routine: "MONITORING ROUTINE",
    streak: (n) => `Check-in streak: ${n} ${n === 1 ? "day" : "days"}`,
    missions: (d, t) => `Today's missions: ${d} of ${t}`,
    training: (r, s) => `Camera training in 7 days: ${r} ${r === 1 ? "repetition" : "repetitions"} in ${s} ${s === 1 ? "set" : "sets"}`,
    trainingLeast: (n) => `Exercises done least: ${n}`,
    sleep: (h, n) => `Self-reported sleep in 7 days: average of ${h} h over ${n} ${n === 1 ? "night" : "nights"}`,
    sleepLoss: " (sleep loss: under 6 h)",
    print: "Print / save as PDF",
  },
  exportHtml: "Visual report (HTML/PDF)",
  exportHtmlHint: "Opens in the browser and can be printed or saved as PDF.",
};

export const logMessages: Record<Locale, LogMessages> = { pt, en };

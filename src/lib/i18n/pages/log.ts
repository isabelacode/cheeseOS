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
    footer: string;
    fileName: string;
  };
}

const pt: LogMessages = {
  title: "Diário",
  counts: (r, a) => `${r} ${r === 1 ? "relato" : "relatos"} · ${a} ${a === 1 ? "sintoma ativo" : "sintomas ativos"}`,
  composerLabel: "Novo relato",
  placeholder: "Descreva como está se sentindo…",
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
  timelineRange: (from, to) => `${from} → ${to}`,
  exportTitle: "Exportar",
  exportBody: "Gera um arquivo de texto com seus dados básicos, os sintomas ativos e o diário completo.",
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
    none: "não informado",
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
    footer: "Sintomas reconhecidos por regras locais; não substitui avaliação médica.",
    fileName: "relatorio-medico-de-voo",
  },
};

const en: LogMessages = {
  title: "Log",
  counts: (r, a) => `${r} ${r === 1 ? "report" : "reports"} · ${a} active ${a === 1 ? "symptom" : "symptoms"}`,
  composerLabel: "New report",
  placeholder: "Describe how you feel…",
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
  timelineRange: (from, to) => `${from} → ${to}`,
  exportTitle: "Export",
  exportBody: "Creates a text file with your basic details, active symptoms and the full log.",
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
    footer: "Symptoms recognized by local rules; not a substitute for medical assessment.",
    fileName: "flight-surgeon-report",
  },
};

export const logMessages: Record<Locale, LogMessages> = { pt, en };

import type { Locale } from "../locale";

export interface BodyMessages {
  title: string;
  subtitle: string;
  regionsTitle: string;
  regionsHint: (withComplaint: number, total: number) => string;
  showAll: (n: number) => string;
  showActive: string;
  allClearTitle: string;
  allClearHint: string;
  allClearCta: string;
  selectedLive: (region: string, n: number) => string;
  unavailable: string;
  sideHint: string;
  activeCount: (n: number) => string;
  noFindings: string;
  pickRegion: string;
  pickRegionHint: string;
  activeTitle: string;
  noActive: string;
  reported: (when: string) => string;
  evidence: string;
  resolve: string;
  dismiss: string;
  pastTitle: string;
  noPast: string;
  voice: string;
  typed: string;
  legendTitle: string;
  legendNone: string;
  clear: string;
  recenter: string;
}

export const bodyMessages: Record<Locale, BodyMessages> = {
  pt: {
    title: "Mapa do corpo",
    subtitle: "Onde estão os sintomas relatados. Escolha uma região na lista ou no modelo.",
    regionsTitle: "Regiões",
    regionsHint: (n, total) => (n ? `${n} com queixa` : `${total} regiões`),
    showAll: (n) => `Ver todas as ${n} regiões`,
    showActive: "Mostrar só regiões com queixa",
    allClearTitle: "Nenhum sintoma ativo no corpo",
    allClearHint: "Quando você relatar um sintoma, a região aparece aqui com a orientação de bordo. Você ainda pode abrir qualquer região para ver relatos anteriores.",
    allClearCta: "Contar como estou",
    selectedLive: (region, n) => `${region} selecionada, ${n === 0 ? "sem sintomas ativos" : n === 1 ? "1 sintoma ativo" : `${n} sintomas ativos`}`,
    unavailable: "A visualização 3D não está disponível neste dispositivo. Use a lista de regiões.",
    sideHint: "Esquerda e direita são as do tripulante.",
    activeCount: (n) => (n === 1 ? "1 sintoma ativo" : `${n} sintomas ativos`),
    noFindings: "Sem queixas",
    pickRegion: "Nenhuma região selecionada",
    pickRegionHint: "Selecione uma região para ver sintomas, orientação e relatos anteriores.",
    activeTitle: "Sintomas ativos",
    noActive: "Nenhum sintoma ativo nesta região.",
    reported: (when) => `Relatado ${when}`,
    evidence: "Frase",
    resolve: "Passou",
    dismiss: "Não é isso",
    pastTitle: "Relatos anteriores",
    noPast: "Nenhum relato envolvendo esta região.",
    voice: "Voz",
    typed: "Digitado",
    legendTitle: "Intensidade",
    legendNone: "Sem queixas",
    clear: "Limpar seleção",
    recenter: "Recentrar",
  },
  en: {
    title: "Body map",
    subtitle: "Where reported symptoms are. Pick a region from the list or on the model.",
    regionsTitle: "Regions",
    regionsHint: (n, total) => (n ? `${n} with complaints` : `${total} regions`),
    showAll: (n) => `See all ${n} regions`,
    showActive: "Show only regions with complaints",
    allClearTitle: "No active symptoms on the body",
    allClearHint: "When you report a symptom, its region shows up here with the onboard guidance. You can still open any region to see past reports.",
    allClearCta: "Tell how I feel",
    selectedLive: (region, n) => `${region} selected, ${n === 0 ? "no active symptoms" : n === 1 ? "1 active symptom" : `${n} active symptoms`}`,
    unavailable: "The 3D view isn't available on this device. Use the region list.",
    sideHint: "Left and right are the crew member's own.",
    activeCount: (n) => (n === 1 ? "1 active symptom" : `${n} active symptoms`),
    noFindings: "No complaints",
    pickRegion: "No region selected",
    pickRegionHint: "Select a region to see its symptoms, advice and past reports.",
    activeTitle: "Active symptoms",
    noActive: "No active symptoms in this region.",
    reported: (when) => `Reported ${when}`,
    evidence: "Phrase",
    resolve: "It's gone",
    dismiss: "Not this",
    pastTitle: "Past reports",
    noPast: "No reports involving this region.",
    voice: "Voice",
    typed: "Typed",
    legendTitle: "Intensity",
    legendNone: "No complaints",
    clear: "Clear selection",
    recenter: "Recenter",
  },
};

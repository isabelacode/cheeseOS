import type { Locale } from "../locale";

export interface BodyMessages {
  title: string;
  subtitle: string;
  regionsTitle: string;
  regionsHint: string;
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
    regionsHint: "7 regiões",
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
    legendNone: "Sem queixa",
    clear: "Limpar seleção",
    recenter: "Recentrar",
  },
  en: {
    title: "Body map",
    subtitle: "Where reported symptoms are. Pick a region from the list or on the model.",
    regionsTitle: "Regions",
    regionsHint: "7 regions",
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
    legendNone: "No complaint",
    clear: "Clear selection",
    recenter: "Recenter",
  },
};

import type { Locale } from "../locale";

export interface NowMessages {
  vitalsTitle: string;
  vitalsAside: string;
  openVital: (label: string) => string;
  vitalState: { in: string; above: string; below: string };
  diastolic: string;
  aiSuggestion: string;
  aiEscalates: (status: string) => string;
  resolve: string;
  dismiss: string;
  resolveLabel: (symptom: string) => string;
  dismissLabel: (symptom: string) => string;
  heldBy: (vitals: string, status: string, hasSymptoms: boolean) => string;
  undo: string;
  vitalsOnly: string;
  examplesLabel: string;
  latest: string;
  seeAll: string;
  actionResolved: (symptom: string) => string;
  actionDismissed: (symptom: string) => string;
  dismissedTag: string;
  sourceAction: string;
}

export const nowMessages: Record<Locale, NowMessages> = {
  pt: {
    vitalsTitle: "Sinais vitais",
    vitalsAside: "ao vivo",
    openVital: (label) => `${label}: ver detalhes`,
    vitalState: { in: "na faixa", above: "acima", below: "abaixo" },
    diastolic: "diastólica",
    aiSuggestion: "Sugestão da IA",
    aiEscalates: (status) => `A IA sugere escalar — o estado calculado é ${status}. Siga a orientação acima.`,
    resolve: "Passou",
    dismiss: "Não é isso",
    resolveLabel: (s) => `Marcar ${s} como resolvido`,
    dismissLabel: (s) => `${s} foi reconhecido por engano`,
    heldBy: (v, st, has) =>
      has
        ? `${v} ainda fora da faixa: é isso que mantém o estado em ${st}. Os sinais voltam ao normal aos poucos.`
        : `${v} fora da faixa mantém o estado em ${st}. Os sinais voltam ao normal aos poucos; descreva como você está se sentindo.`,
    undo: "Desfazer",
    vitalsOnly: "Algum sinal vital está fora da faixa. Confira os sinais abaixo e descreva como você está se sentindo.",
    examplesLabel: "Exemplos: toque para preencher",
    latest: "Últimos relatos",
    seeAll: "Ver diário completo",
    actionResolved: (s) => `Resolvido: ${s}`,
    actionDismissed: (s) => `Descartado: ${s} (reconhecido por engano)`,
    dismissedTag: "descartado",
    sourceAction: "ação",
  },
  en: {
    vitalsTitle: "Vital signs",
    vitalsAside: "live",
    openVital: (label) => `${label}: see details`,
    vitalState: { in: "in range", above: "above", below: "below" },
    diastolic: "diastolic",
    aiSuggestion: "AI suggestion",
    aiEscalates: (status) => `The AI suggests escalating — the computed status is ${status}. Follow the guidance above.`,
    resolve: "Gone",
    dismiss: "Not this",
    resolveLabel: (s) => `Mark ${s} as resolved`,
    dismissLabel: (s) => `${s} was recognized by mistake`,
    heldBy: (v, st, has) =>
      has
        ? `${v} still out of range: that is what keeps the status at ${st}. Vitals ease back gradually.`
        : `${v} out of range keeps the status at ${st}. Vitals ease back gradually; describe how you feel.`,
    undo: "Undo",
    vitalsOnly: "A vital sign is out of range. Check the vitals below and describe how you feel.",
    examplesLabel: "Examples: tap to fill in",
    latest: "Latest reports",
    seeAll: "See full log",
    actionResolved: (s) => `Resolved: ${s}`,
    actionDismissed: (s) => `Dismissed: ${s} (recognized by mistake)`,
    dismissedTag: "dismissed",
    sourceAction: "action",
  },
};

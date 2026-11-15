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
  resolveConfirm: string;
  resolveConfirmLabel: (symptom: string) => string;
  dismissLabel: (symptom: string) => string;
  heldBy: (vitals: string, status: string, hasSymptoms: boolean) => string;
  undo: string;
  vitalsOnly: string;
  examplesLabel: string;
  latest: string;
  seeAll: string;
  actionResolved: (symptom: string) => string;
  actionDismissed: (symptom: string) => string;
  actionAlert: (headline: string) => string;
  dismissedTag: string;
  sourceAction: string;
  aiDropped: { echo: string; allergen: string; empty: string };
  recovering: string;
  simulatedNote: string;
  ask: (name: string) => string;
  micIdle: string;
  micIdleHint: string;
  micStopHint: string;
  orTouch: string;
  touchHint: string;
  touchAsk: (region: string) => string;
  whereTitle: string;
  whereHint: string;
  vitalsIn: (n: number) => string;
  vitalsOut: (n: number) => string;
  doNow: (symptom: string) => string;
  toDo: (symptom: string) => string;
  lastReport: string;
}

export const nowMessages: Record<Locale, NowMessages> = {
  pt: {
    vitalsTitle: "Sinais vitais",
    vitalsAside: "simulados · ao vivo",
    openVital: (label) => `${label}: ver detalhes`,
    vitalState: { in: "na faixa", above: "acima", below: "abaixo" },
    diastolic: "diastólica",
    aiSuggestion: "Sugestão da IA",
    aiEscalates: (status) => `A IA sugere escalar — o estado calculado é ${status}. Siga a orientação acima.`,
    resolve: "Passou",
    dismiss: "Não é isso",
    resolveLabel: (s) => `Marcar ${s} como resolvido`,
    resolveConfirm: "Confirmar: passou?",
    resolveConfirmLabel: (s) => `${s} é um sinal de alerta. Toque de novo para confirmar que passou`,
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
    actionAlert: (h) => `Alerta dispensado: ${h}`,
    dismissedTag: "descartado",
    sourceAction: "ação",
    aiDropped: {
      echo: "A IA só repetiu o relato e foi descartada. Vale a orientação das regras locais acima.",
      allergen: "A sugestão da IA citou um medicamento das suas alergias e foi ocultada. Vale a orientação das regras locais acima.",
      empty: "",
    },
    recovering: "Sintoma marcado como resolvido: os sinais simulados voltam à linha de base aos poucos, como no corpo real.",
    simulatedNote: "Valores gerados pelo gêmeo digital a partir dos relatos, não medições de sensores.",
    ask: (name) => `Como você está, ${name}?`,
    micIdle: "Toque e fale.",
    micIdleHint: "Ou aperte a barra de espaço.",
    micStopHint: "Toque para parar.",
    orTouch: "Ou toque onde dói",
    touchHint: "Toque num ponto do corpo. Arraste para girar.",
    touchAsk: (region) => `${region}: o que você sente?`,
    whereTitle: "Onde está",
    whereHint: "Toque em outra região para acrescentar um sintoma.",
    vitalsIn: (n) => `${n} sinais na faixa`,
    vitalsOut: (n) => (n === 1 ? "1 sinal fora da faixa" : `${n} sinais fora da faixa`),
    doNow: (s) => `${s}. Faça isto agora.`,
    toDo: (s) => `${s}. O que fazer.`,
    lastReport: "Seu último relato",
  },
  en: {
    vitalsTitle: "Vital signs",
    vitalsAside: "simulated · live",
    openVital: (label) => `${label}: see details`,
    vitalState: { in: "in range", above: "above", below: "below" },
    diastolic: "diastolic",
    aiSuggestion: "AI suggestion",
    aiEscalates: (status) => `The AI suggests escalating — the computed status is ${status}. Follow the guidance above.`,
    resolve: "It's gone",
    dismiss: "Not this",
    resolveLabel: (s) => `Mark ${s} as resolved`,
    resolveConfirm: "Confirm: it's gone?",
    resolveConfirmLabel: (s) => `${s} is a warning sign. Tap again to confirm it's gone`,
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
    actionAlert: (h) => `Alert dismissed: ${h}`,
    dismissedTag: "dismissed",
    sourceAction: "action",
    aiDropped: {
      echo: "The AI only restated the report and was dropped. The local rules' guidance above stands.",
      allergen: "The AI suggestion named a medication on your allergy list and was hidden. The local rules' guidance above stands.",
      empty: "",
    },
    recovering: "Symptom marked as resolved: simulated vitals return to baseline gradually, like a real body.",
    simulatedNote: "Values generated by the digital twin from your reports, not sensor readings.",
    ask: (name) => `How are you, ${name}?`,
    micIdle: "Tap and talk.",
    micIdleHint: "Or press the space bar.",
    micStopHint: "Tap to stop.",
    orTouch: "Or tap where it hurts",
    touchHint: "Tap a point on the body. Drag to rotate.",
    touchAsk: (region) => `${region}: what do you feel?`,
    whereTitle: "Where it is",
    whereHint: "Tap another region to add a symptom.",
    vitalsIn: (n) => `${n} vitals in range`,
    vitalsOut: (n) => (n === 1 ? "1 vital out of range" : `${n} vitals out of range`),
    doNow: (s) => `${s}. Do this now.`,
    toDo: (s) => `${s}. What to do.`,
    lastReport: "Your last report",
  },
};

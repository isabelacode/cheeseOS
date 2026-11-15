import type { Locale } from "../locale";

export type VitalKey = "heartRate" | "spo2" | "temperature" | "respiration" | "systolic";

export interface VitalsPageMessages {
  title: string;
  subtitle: string;
  selectorLabel: string;
  short: Record<VitalKey, string>;
  status: { inRange: string; above: string; below: string };
  /** Plain-language explanation of the reference range, using the formatted thresholds. */
  explain: Record<VitalKey, (n: Record<string, string>) => string>;
  windowLabel: string;
  lastMinute: string;
  lastHour: string;
  now: string;
  secondsAgo: (s: number) => string;
  legend: { normal: string; normalSystolic: string; attention: string; critical: string; report: string; systolic: string; diastolic: string };
  /** Toggle for the plain-language range explanation. */
  howToRead: string;
  /** Hint under the chart for keyboard inspection. */
  chartKeys: string;
  thresholdTag: { attention: string; critical: string };
  chartSummary: (p: { label: string; window: string; min: string; max: string; current: string; unit: string; reports: number }) => string;
  chartSummaryBp: (p: { window: string; sysMin: string; sysMax: string; diaMin: string; diaMax: string; current: string; reports: number }) => string;
  noData: string;
  tableCaption: (label: string, window: string) => string;
  colTime: string;
  colValue: string;
  reportAt: (time: string, symptoms: string) => string;
  allVitals: string;
  current: string;
  simulatedTitle: string;
  simulatedBody: string;
  loading: string;
}

export const vitalsMessages: Record<Locale, VitalsPageMessages> = {
  pt: {
    title: "Sinais vitais",
    subtitle: "Valor atual, faixa de referência e evolução de cada sinal.",
    selectorLabel: "Escolher sinal vital",
    short: {
      temperature: "Temperatura",
      systolic: "Pressão",
      respiration: "Respiração",
      heartRate: "Freq. cardíaca",
      spo2: "SpO₂",
    },
    status: { inRange: "Na faixa", above: "Acima da faixa", below: "Abaixo da faixa" },
    explain: {
      heartRate: (n) =>
        `Entre ${n.lo} e ${n.hi} bpm é o esperado em repouso. Acima de ${n.hi} ou abaixo de ${n.lo} pede atenção; acima de ${n.critHi} ou abaixo de ${n.critLo} é crítico.`,
      spo2: (n) =>
        `${n.lo}% ou mais indica boa oxigenação do sangue. Abaixo de ${n.lo}% pede atenção; abaixo de ${n.critLo}% é crítico.`,
      temperature: (n) =>
        `Entre ${n.lo} e ${n.hi} °C é considerado normal. Acima de ${n.hi} °C indica febre e pede atenção; a partir de ${n.critHi} °C ou abaixo de ${n.critLo} °C é crítico.`,
      respiration: (n) =>
        `Até ${n.hi} respirações por minuto é o esperado. Acima de ${n.hi} pede atenção; acima de ${n.critHi} ou abaixo de ${n.critLo} é crítico.`,
      systolic: (n) =>
        `A pressão sistólica (o número maior) entre ${n.lo} e ${n.hi} mmHg está na faixa. Acima de ${n.hi} ou abaixo de ${n.lo} pede atenção; acima de ${n.critHi} ou abaixo de ${n.critLo} é crítico. A diastólica aparece no gráfico como referência.`,
    },
    windowLabel: "Janela de tempo",
    lastMinute: "Último minuto",
    lastHour: "Última hora",
    now: "agora",
    secondsAgo: (s) => `−${s} s`,
    legend: {
      normal: "Faixa normal",
      normalSystolic: "Faixa normal (sistólica)",
      attention: "Limite de atenção",
      critical: "Limite crítico",
      report: "Relato com sintoma",
      systolic: "Sistólica",
      diastolic: "Diastólica",
    },
    thresholdTag: { attention: "Atenção", critical: "Crítico" },
    howToRead: "Como ler esta faixa",
    chartKeys: "Setas ← → no gráfico percorrem as leituras.",
    chartSummary: ({ label, window, min, max, current, unit, reports }) =>
      `${label}, ${window.toLowerCase()}: mínimo ${min}, máximo ${max}, atual ${current} ${unit}.${reports ? ` ${reports} ${reports === 1 ? "relato com sintoma" : "relatos com sintomas"} no período.` : ""}`,
    chartSummaryBp: ({ window, sysMin, sysMax, diaMin, diaMax, current, reports }) =>
      `Pressão arterial, ${window.toLowerCase()}: sistólica de ${sysMin} a ${sysMax}, diastólica de ${diaMin} a ${diaMax}, atual ${current} mmHg.${reports ? ` ${reports} ${reports === 1 ? "relato com sintoma" : "relatos com sintomas"} no período.` : ""}`,
    noData: "Ainda não há leituras suficientes nesta janela.",
    tableCaption: (label, window) => `${label}, ${window.toLowerCase()}`,
    colTime: "Horário",
    colValue: "Valor",
    reportAt: (time, symptoms) => `Relato às ${time}: ${symptoms}`,
    allVitals: "Todos os sinais",
    current: "Atual",
    simulatedTitle: "Valores simulados",
    simulatedBody:
      "Este é um gêmeo digital de demonstração: os sinais são simulados a partir dos sintomas relatados. Em uso real, eles viriam dos sensores vestíveis do traje.",
    loading: "Carregando sinais vitais…",
  },
  en: {
    title: "Vitals",
    subtitle: "Current value, reference range and trend for each sign.",
    selectorLabel: "Choose a vital sign",
    short: {
      temperature: "Temperature",
      systolic: "Blood pressure",
      respiration: "Respiration",
      heartRate: "Heart rate",
      spo2: "SpO₂",
    },
    status: { inRange: "In range", above: "Above range", below: "Below range" },
    explain: {
      heartRate: (n) =>
        `Between ${n.lo} and ${n.hi} bpm is expected at rest. Above ${n.hi} or below ${n.lo} needs attention; above ${n.critHi} or below ${n.critLo} is critical.`,
      spo2: (n) =>
        `${n.lo}% or higher means the blood is well oxygenated. Below ${n.lo}% needs attention; below ${n.critLo}% is critical.`,
      temperature: (n) =>
        `Between ${n.lo} and ${n.hi} °C is considered normal. Above ${n.hi} °C indicates fever and needs attention; ${n.critHi} °C or higher, or below ${n.critLo} °C, is critical.`,
      respiration: (n) =>
        `Up to ${n.hi} breaths per minute is expected. Above ${n.hi} needs attention; above ${n.critHi} or below ${n.critLo} is critical.`,
      systolic: (n) =>
        `Systolic pressure (the higher number) between ${n.lo} and ${n.hi} mmHg is in range. Above ${n.hi} or below ${n.lo} needs attention; above ${n.critHi} or below ${n.critLo} is critical. Diastolic is shown in the chart for reference.`,
    },
    windowLabel: "Time window",
    lastMinute: "Last minute",
    lastHour: "Last hour",
    now: "now",
    secondsAgo: (s) => `−${s} s`,
    legend: {
      normal: "Normal range",
      normalSystolic: "Normal range (systolic)",
      attention: "Attention limit",
      critical: "Critical limit",
      report: "Report with symptom",
      systolic: "Systolic",
      diastolic: "Diastolic",
    },
    thresholdTag: { attention: "Attention", critical: "Critical" },
    howToRead: "How to read this range",
    chartKeys: "Arrow keys ← → on the chart step through readings.",
    chartSummary: ({ label, window, min, max, current, unit, reports }) =>
      `${label}, ${window.toLowerCase()}: minimum ${min}, maximum ${max}, current ${current} ${unit}.${reports ? ` ${reports} ${reports === 1 ? "report with a symptom" : "reports with symptoms"} in this period.` : ""}`,
    chartSummaryBp: ({ window, sysMin, sysMax, diaMin, diaMax, current, reports }) =>
      `Blood pressure, ${window.toLowerCase()}: systolic ${sysMin} to ${sysMax}, diastolic ${diaMin} to ${diaMax}, current ${current} mmHg.${reports ? ` ${reports} ${reports === 1 ? "report with a symptom" : "reports with symptoms"} in this period.` : ""}`,
    noData: "Not enough readings in this window yet.",
    tableCaption: (label, window) => `${label}, ${window.toLowerCase()}`,
    colTime: "Time",
    colValue: "Value",
    reportAt: (time, symptoms) => `Report at ${time}: ${symptoms}`,
    allVitals: "All vitals",
    current: "Current",
    simulatedTitle: "Simulated values",
    simulatedBody:
      "This is a demo digital twin: vitals are simulated from the symptoms you report. In a real deployment they would come from the suit's wearable sensors.",
    loading: "Loading vitals…",
  },
};

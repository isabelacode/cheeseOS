import type { Locale } from "../locale";
import type { Mission, ReminderId } from "@/lib/routine/routine";

export interface RoutineMessages {
  title: string;
  aside: (done: number, total: number) => string;
  missions: Record<Mission, { label: string; hint: string }>;
  auto: string;
  doneTag: string;
  markDone: (label: string) => string;
  streak: (n: number) => string;
  streakLabel: string;
  fullDays: (n: number) => string;
  fullDaysLabel: string;
  resolved: (n: number) => string;
  resolvedLabel: string;
  allDone: string;
  reminders: Record<ReminderId, { label: string; body: string }>;
  settings: {
    title: string;
    intro: string;
    enable: (label: string) => string;
    time: (label: string) => string;
    notify: string;
    notifyHint: string;
    notifyDenied: string;
    notifyUnsupported: string;
    openOnly: string;
  };
  toast: { title: string; dismiss: string; open: string };
}

const pt: RoutineMessages = {
  title: "Missões de hoje",
  aside: (d, t) => `${d} de ${t}`,
  missions: {
    checkin: { label: "Check-in de saúde", hint: "Conte como você está, mesmo que esteja bem." },
    vitals: { label: "Revisar sinais vitais", hint: "Abra a tela Sinais e confira as tendências." },
    exercise: { label: "Contramedida de exercício", hint: "Treino resistido e aeróbico: protege ossos e músculos." },
    hydration: { label: "Hidratação", hint: "Beber água ao longo do dia reduz risco de cálculo renal." },
  },
  auto: "automático",
  doneTag: "concluída",
  markDone: (l) => `Marcar “${l}” como feita`,
  streak: (n) => `${n} ${n === 1 ? "dia" : "dias"}`,
  streakLabel: "sequência de check-ins",
  fullDays: (n) => `${n}/7`,
  fullDaysLabel: "dias completos na semana",
  resolved: (n) => String(n),
  resolvedLabel: "sintomas resolvidos em 7 dias",
  allDone: "Rotina do dia completa.",
  reminders: {
    checkin: { label: "Check-in de saúde", body: "Hora do check-in: conte como você está se sentindo." },
    vitals: { label: "Revisar sinais vitais", body: "Confira os sinais vitais e as tendências da última hora." },
    exercise: { label: "Exercício", body: "Hora da contramedida de exercício (resistido e aeróbico)." },
    hydration: { label: "Hidratação", body: "Beba água: hidratação reduz o risco de cálculo renal em voo." },
    medication: { label: "Medicação", body: "Hora da medicação registrada no seu perfil." },
  },
  settings: {
    title: "Lembretes",
    intro: "Avisos locais para a rotina de monitoramento. Ficam só neste aparelho e disparam com o app aberto; lembretes de missões já feitas no dia não aparecem.",
    enable: (l) => `Ativar lembrete: ${l}`,
    time: (l) => `Horário do lembrete: ${l}`,
    notify: "Notificação do sistema",
    notifyHint: "Também mostra o lembrete como notificação do navegador.",
    notifyDenied: "Notificações bloqueadas no navegador. Os lembretes continuam aparecendo dentro do app.",
    notifyUnsupported: "Este navegador não oferece notificações. Os lembretes aparecem dentro do app.",
    openOnly: "Sem servidor nem conta: os lembretes ficam só neste aparelho.",
  },
  toast: { title: "Lembrete", dismiss: "Dispensar", open: "Abrir" },
};

const en: RoutineMessages = {
  title: "Today's missions",
  aside: (d, t) => `${d} of ${t}`,
  missions: {
    checkin: { label: "Health check-in", hint: "Say how you feel, even if you feel fine." },
    vitals: { label: "Review vital signs", hint: "Open the Vitals screen and check the trends." },
    exercise: { label: "Exercise countermeasure", hint: "Resistive and aerobic training: protects bones and muscles." },
    hydration: { label: "Hydration", hint: "Drinking water through the day lowers kidney stone risk." },
  },
  auto: "automatic",
  doneTag: "done",
  markDone: (l) => `Mark “${l}” as done`,
  streak: (n) => `${n} ${n === 1 ? "day" : "days"}`,
  streakLabel: "check-in streak",
  fullDays: (n) => `${n}/7`,
  fullDaysLabel: "complete days this week",
  resolved: (n) => String(n),
  resolvedLabel: "symptoms resolved in 7 days",
  allDone: "Today's routine is complete.",
  reminders: {
    checkin: { label: "Health check-in", body: "Check-in time: tell us how you feel." },
    vitals: { label: "Review vital signs", body: "Check your vitals and the last hour's trends." },
    exercise: { label: "Exercise", body: "Time for the exercise countermeasure (resistive and aerobic)." },
    hydration: { label: "Hydration", body: "Drink water: hydration lowers kidney stone risk in flight." },
    medication: { label: "Medication", body: "Time for the medication in your profile." },
  },
  settings: {
    title: "Reminders",
    intro: "Local notices for the monitoring routine. They stay on this device and fire while the app is open; reminders for missions already done today stay quiet.",
    enable: (l) => `Enable reminder: ${l}`,
    time: (l) => `Reminder time: ${l}`,
    notify: "System notification",
    notifyHint: "Also show reminders as browser notifications.",
    notifyDenied: "Notifications are blocked in the browser. Reminders still show inside the app.",
    notifyUnsupported: "This browser has no notifications. Reminders show inside the app.",
    openOnly: "No server or account: reminders stay on this device only.",
  },
  toast: { title: "Reminder", dismiss: "Dismiss", open: "Open" },
};

export const routineMessages: Record<Locale, RoutineMessages> = { pt, en };

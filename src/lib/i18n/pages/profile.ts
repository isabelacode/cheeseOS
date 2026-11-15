import type { Locale } from "../locale";

export interface ProfileMessages {
  age: (years: number) => string;
  sections: { health: string; body: string; identity: string };
  sectionHints: { health: string; body: string; identity: string };
  bloodType: string;
  bloodUnknown: string;
  noneReported: string;
  noMission: string;
  restingHrDefault: string;
  edit: string;
  editLabel: (section: string) => string;
  saved: string;
  baselineNote: string;
  deviceNote: string;
  settingsLink: string;
  /** Empty safety field: never confirmed, which is not the same as "none". */
  unverified: string;
  noKnownAllergies: string;
  noMedications: string;
  /** Stored when the crew confirms "no medication"; read back as an explicit none. */
  noMedicationsValue: string;
  allergyHint: string;
  parsedLabel: string;
  recognized: string;
  plainText: string;
  otherEditing: string;
  range: (min: number, max: number) => string;
  restingHrHint: string;
  fixFields: (n: number) => string;
}

export const profileMessages: Record<Locale, ProfileMessages> = {
  pt: {
    age: (n) => `${n} anos`,
    sections: { health: "Saúde", body: "Corpo", identity: "Identificação" },
    sectionHints: {
      health: "O que a equipe e a IA precisam saber antes de qualquer conduta.",
      body: "Medidas usadas pelo gêmeo digital.",
      identity: "Quem está sendo monitorado.",
    },
    bloodType: "Tipo sanguíneo",
    bloodUnknown: "Não informado",
    noneReported: "Nenhuma informada",
    noMission: "Sem missão",
    restingHrDefault: "68 bpm (padrão)",
    edit: "Editar",
    editLabel: (s) => `Editar ${s}`,
    saved: "Dados salvos.",
    baselineNote: "A frequência de repouso é a base da simulação: ao mudar, os sinais vitais se ajustam ao novo valor.",
    deviceNote: "Esses dados ficam só neste aparelho. Só saem dele se você escolher o OpenRouter como motor de IA.",
    settingsLink: "Ver ajustes de privacidade",
    unverified: "Não verificado. Edite para confirmar",
    noKnownAllergies: "Sem alergias conhecidas",
    noMedications: "Nenhuma medicação em uso",
    noMedicationsValue: "Nenhuma",
    allergyHint: "Separe por vírgula. Ex.: dipirona, látex",
    parsedLabel: "O checador de segurança entende",
    recognized: "reconhecido: cruzado com remédios e grupos",
    plainText: "não reconhecido: comparado só pelo texto",
    otherEditing: "Salve ou cancele a seção aberta primeiro",
    range: (min, max) => `Entre ${min} e ${max}.`,
    restingHrHint: "Entre 35 e 110. Sem valor, usamos 68 bpm.",
    fixFields: (n) => (n === 1 ? "1 campo precisa de correção." : `${n} campos precisam de correção.`),
  },
  en: {
    age: (n) => `${n} years old`,
    sections: { health: "Health", body: "Body", identity: "Identity" },
    sectionHints: {
      health: "What the crew and the AI must know before any treatment.",
      body: "Measurements used by the digital twin.",
      identity: "Who is being monitored.",
    },
    bloodType: "Blood type",
    bloodUnknown: "Not provided",
    noneReported: "None reported",
    noMission: "No mission",
    restingHrDefault: "68 bpm (default)",
    edit: "Edit",
    editLabel: (s) => `Edit ${s}`,
    saved: "Details saved.",
    baselineNote: "Resting heart rate is the simulation baseline: change it and the vitals settle to the new value.",
    deviceNote: "This data stays on this device. It only leaves if you pick OpenRouter as the AI engine.",
    settingsLink: "See privacy settings",
    unverified: "Not verified. Edit to confirm",
    noKnownAllergies: "No known allergies",
    noMedications: "No current medication",
    noMedicationsValue: "None",
    allergyHint: "Separate with commas. E.g. penicillin, latex",
    parsedLabel: "The safety checker reads",
    recognized: "recognized: cross-checked with drugs and groups",
    plainText: "not recognized: matched by text only",
    otherEditing: "Save or cancel the open section first",
    range: (min, max) => `Between ${min} and ${max}.`,
    restingHrHint: "Between 35 and 110. Leave empty to use 68 bpm.",
    fixFields: (n) => (n === 1 ? "1 field needs fixing." : `${n} fields need fixing.`),
  },
};

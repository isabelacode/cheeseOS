import { useSyncExternalStore } from "react";

export type Sex = "feminino" | "masculino" | "outro" | "nao_informado";

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number] | "";

export interface CrewProfile {
  name: string;
  role: string;
  mission: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  bloodType: BloodType;
  restingHeartRate: number;
  allergies: string;
  medications: string;
  conditions: string;
}

export const SEX_LABEL: Record<Sex, string> = {
  feminino: "Feminino",
  masculino: "Masculino",
  outro: "Outro",
  nao_informado: "Prefiro não informar",
};

/**
 * Stored only on this device. A habitat deployment would sync it with the
 * station's crew medical record instead.
 */
const KEY = "cheeseos.crew.v1";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedProfile: CrewProfile | null = null;

function read(): CrewProfile | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedProfile;
  cachedRaw = raw;
  try {
    cachedProfile = raw ? (JSON.parse(raw) as CrewProfile) : null;
  } catch {
    cachedProfile = null;
  }
  return cachedProfile;
}

export function saveProfile(profile: CrewProfile) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Storage blocked: keep it in memory for this session.
    cachedRaw = JSON.stringify(profile);
    cachedProfile = profile;
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** `undefined` while rendering on the server, `null` when no crew member is registered. */
export function useCrewProfile(): CrewProfile | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

export function firstName(p: CrewProfile) {
  return p.name.trim().split(/\s+/)[0] ?? p.name;
}

/** Profile summary handed to the local LLM so advice accounts for the person. */
export function profileContext(p: CrewProfile): string {
  const sex = p.sex === "nao_informado" ? "" : `, sexo ${SEX_LABEL[p.sex].toLowerCase()}`;
  const blood = p.bloodType ? `, tipo sanguíneo ${p.bloodType}` : "";
  const lines = [
    `Tripulante: ${p.name}, ${p.role}, ${p.age} anos${sex}, ${(p.heightCm / 100).toFixed(2).replace(".", ",")} m, ${p.weightKg} kg${blood}.`,
    `Alergias: ${p.allergies.trim() || "nenhuma informada"}.`,
    `Medicações em uso: ${p.medications.trim() || "nenhuma"}.`,
    `Condições prévias: ${p.conditions.trim() || "nenhuma"}.`,
  ];
  return lines.join("\n");
}

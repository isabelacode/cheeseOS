import { useSyncExternalStore } from "react";
import { formatNumber, type Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";

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

export const SEXES: Sex[] = ["feminino", "masculino", "outro", "nao_informado"];

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

/** Everything this app keeps on the device besides the UI language. */
const DEVICE_KEYS = [
  KEY,
  "cheeseos.session.v1",
  "cheeseos.openrouter.v1",
  "cheeseos.engine.v1",
  "cheeseos.browser-model.v1",
];

/**
 * Removes the crew profile, the saved session and the AI settings from this
 * device. Listeners see `null`, so the app goes back to onboarding.
 */
export function deleteProfile() {
  try {
    DEVICE_KEYS.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // Storage blocked: the profile only lived in memory.
  }
  cachedRaw = null;
  cachedProfile = null;
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

/** Profile summary handed to the LLM so advice accounts for the person. */
export function profileContext(p: CrewProfile, locale: Locale): string {
  const t = messages[locale].context;
  return [
    t.crew({
      name: p.name,
      role: p.role,
      age: p.age,
      sex: p.sex === "nao_informado" ? "" : messages[locale].sex[p.sex],
      height: formatNumber(p.heightCm / 100, 2, locale),
      weight: p.weightKg,
      blood: p.bloodType,
    }),
    t.allergies(p.allergies.trim() || t.noneReported),
    t.medications(p.medications.trim() || t.none),
    t.conditions(p.conditions.trim() || t.none),
  ].join("\n");
}

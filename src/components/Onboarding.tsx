"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, HeartPulse, IdCard, PersonStanding } from "lucide-react";
import { BLOOD_TYPES, SEXES, saveProfile, type CrewProfile, type Sex } from "@/lib/crew/profile";
import { useT, type Messages } from "@/lib/i18n";
import { LanguageToggle } from "./LanguageToggle";
import { BrandMark } from "./BrandMark";

type Draft = Omit<CrewProfile, "age" | "heightCm" | "weightKg" | "restingHeartRate"> & {
  age: string;
  heightCm: string;
  weightKg: string;
  restingHeartRate: string;
};

const EMPTY: Draft = {
  name: "",
  role: "",
  mission: "",
  age: "",
  sex: "nao_informado",
  heightCm: "",
  weightKg: "",
  bloodType: "",
  restingHeartRate: "",
  allergies: "",
  medications: "",
  conditions: "",
};

function toDraft(p: CrewProfile): Draft {
  return {
    ...p,
    age: String(p.age),
    heightCm: String(p.heightCm),
    weightKg: String(p.weightKg),
    restingHeartRate: String(p.restingHeartRate),
  };
}

const STEP_ICONS = [IdCard, PersonStanding, HeartPulse] as const;

function numberIn(v: string, min: number, max: number) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max;
}

type ErrorKey = keyof Messages["onboarding"]["errors"];
type Errors = Partial<Record<keyof Draft, ErrorKey>>;

/** Errors are stored as message keys so they follow a language switch. */
function validate(step: number, d: Draft): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (d.name.trim().length < 2) e.name = "name";
    if (!d.role.trim()) e.role = "role";
  }
  if (step === 1) {
    if (!numberIn(d.age, 18, 80)) e.age = "age";
    if (!numberIn(d.heightCm, 140, 215)) e.heightCm = "height";
    if (!numberIn(d.weightKg, 40, 160)) e.weightKg = "weight";
  }
  if (step === 2) {
    if (d.restingHeartRate && !numberIn(d.restingHeartRate, 35, 110)) e.restingHeartRate = "restingHr";
  }
  return e;
}

export function Onboarding({ initial, onDone }: { initial?: CrewProfile | null; onDone?: () => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initial ? toDraft(initial) : EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const editing = Boolean(initial);
  const t = useT();
  const o = t.onboarding;
  const err = (k: keyof Draft) => (errors[k] ? o.errors[errors[k]] : undefined);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const next = () => {
    const e = validate(step, draft);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step < o.steps.length - 1) {
      setStep(step + 1);
      return;
    }
    const num = (v: string) => Math.round(Number(v.replace(",", ".")));
    saveProfile({
      ...draft,
      name: draft.name.trim(),
      role: draft.role.trim(),
      mission: draft.mission.trim(),
      age: num(draft.age),
      heightCm: num(draft.heightCm),
      weightKg: num(draft.weightKg),
      restingHeartRate: draft.restingHeartRate ? num(draft.restingHeartRate) : 68,
    });
    onDone?.();
  };

  const current = o.steps[step];
  const CurrentIcon = STEP_ICONS[step];

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-[560px]">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-surface shadow-card" role="img" aria-label="cheeseOS">
            <BrandMark size={34} />
          </span>
          <div>
            <p className="text-sm font-semibold">cheeseOS</p>
            <p className="text-xs text-ink-3">{t.brand.tagline}</p>
          </div>
          <LanguageToggle className="ml-auto" />
        </div>

        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-[28px] leading-tight font-bold tracking-tight text-balance">
              {editing ? o.titleEdit : o.titleNew}
            </h1>
            <p className="mt-2 max-w-[52ch] text-[15px] text-ink-2">
              {o.intro}
            </p>
          </div>
          {!editing && (
            <Image
              src="/brand/mascot.webp"
              alt=""
              width={480}
              height={539}
              priority
              className="mascot-float hidden w-28 shrink-0 select-none sm:block"
              draggable={false}
            />
          )}
        </div>

        <ol className="mt-6 grid grid-cols-3 gap-2" aria-label={o.stepsLabel}>
          {o.steps.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className="w-full text-left disabled:cursor-default"
              >
                <span className={`block h-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-accent" : "bg-line"}`} />
                <span className={`mt-2 block text-xs font-semibold ${i === step ? "text-ink" : "text-ink-3"}`}>
                  {i < step && <Check className="mr-1 inline size-3 text-accent" aria-hidden />}
                  {s.title}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <form
          className="mt-5 rounded-3xl bg-surface p-5 shadow-card sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            next();
            // A step that fails validation stays put: move focus to the first invalid field.
            requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
          }}
          noValidate
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <CurrentIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold">{current.title}</h2>
              <p className="text-[13px] text-ink-3">{current.hint}</p>
            </div>
          </div>

          {step === 0 && (
            <div className="grid gap-4">
              <Field label={o.name} error={err("name")}>
                <input autoFocus autoComplete="name" value={draft.name} onChange={(e) => set("name", e.target.value)} aria-invalid={err("name") ? true : undefined} className={input(err("name"))} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={o.role} error={err("role")}>
                  <input placeholder={o.rolePlaceholder} value={draft.role} onChange={(e) => set("role", e.target.value)} aria-invalid={err("role") ? true : undefined} className={input(err("role"))} />
                </Field>
                <Field label={o.mission} optional>
                  <input placeholder={o.missionPlaceholder} value={draft.mission} onChange={(e) => set("mission", e.target.value)} className={input()} />
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={o.age} suffix={o.years} error={err("age")}>
                  <input autoFocus inputMode="numeric" value={draft.age} onChange={(e) => set("age", e.target.value)} aria-invalid={err("age") ? true : undefined} className={input(err("age"))} />
                </Field>
                <Field label={o.sex}>
                  <select value={draft.sex} onChange={(e) => set("sex", e.target.value as Sex)} className={input()}>
                    {SEXES.map((s) => (
                      <option key={s} value={s}>
                        {t.sex[s]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={o.height} suffix="cm" error={err("heightCm")}>
                  <input inputMode="numeric" value={draft.heightCm} onChange={(e) => set("heightCm", e.target.value)} aria-invalid={err("heightCm") ? true : undefined} className={input(err("heightCm"))} />
                </Field>
                <Field label={o.weight} suffix="kg" error={err("weightKg")}>
                  <input inputMode="decimal" value={draft.weightKg} onChange={(e) => set("weightKg", e.target.value)} aria-invalid={err("weightKg") ? true : undefined} className={input(err("weightKg"))} />
                </Field>
                <Field label={o.bloodType} optional>
                  <select value={draft.bloodType} onChange={(e) => set("bloodType", e.target.value as Draft["bloodType"])} className={input()}>
                    <option value="">{o.bloodUnknown}</option>
                    {BLOOD_TYPES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              <Field label={o.restingHr} suffix="bpm" optional error={err("restingHeartRate")} hint={o.restingHrHint}>
                <input autoFocus inputMode="numeric" placeholder="68" value={draft.restingHeartRate} onChange={(e) => set("restingHeartRate", e.target.value)} aria-invalid={err("restingHeartRate") ? true : undefined} className={input(err("restingHeartRate"))} />
              </Field>
              <Field label={o.allergies} optional>
                <input placeholder={o.allergiesPlaceholder} value={draft.allergies} onChange={(e) => set("allergies", e.target.value)} className={input()} />
              </Field>
              <Field label={o.medications} optional>
                <input placeholder={o.medicationsPlaceholder} value={draft.medications} onChange={(e) => set("medications", e.target.value)} className={input()} />
              </Field>
              <Field label={o.conditions} optional>
                <textarea rows={2} placeholder={o.conditionsPlaceholder} value={draft.conditions} onChange={(e) => set("conditions", e.target.value)} className={`${input()} resize-none`} />
              </Field>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(step - 1)} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-sunken">
                <ArrowLeft className="size-4" aria-hidden /> {t.common.back}
              </button>
            ) : editing && onDone ? (
              <button type="button" onClick={onDone} className="rounded-full px-3 py-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-sunken">
                {t.common.cancel}
              </button>
            ) : (
              <span />
            )}
            <button type="submit" className="flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-ink">
              {step < o.steps.length - 1 ? (
                <>
                  {t.common.continue} <ArrowRight className="size-4" aria-hidden />
                </>
              ) : editing ? (
                o.submitEdit
              ) : (
                o.submitNew
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OptionalTag() {
  const t = useT();
  return <span className="text-xs font-normal text-ink-3">{t.common.optional}</span>;
}

function input(error?: string) {
  return `w-full rounded-xl border bg-sunken px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-accent focus:bg-surface ${
    error ? "border-crit" : "border-transparent"
  }`;
}

function Field({
  label,
  children,
  error,
  optional,
  suffix,
  hint,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  optional?: boolean;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[13px] font-semibold">
        <span>
          {label}
          {suffix && <span className="font-normal text-ink-3"> ({suffix})</span>}
        </span>
        {optional && <OptionalTag />}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-crit" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>
      )}
    </label>
  );
}

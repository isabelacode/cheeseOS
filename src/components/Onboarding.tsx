"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, HeartPulse, IdCard, PersonStanding } from "lucide-react";
import { BLOOD_TYPES, SEX_LABEL, saveProfile, type CrewProfile, type Sex } from "@/lib/crew/profile";

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

const STEPS = [
  { title: "Identificação", hint: "Quem está sendo monitorado.", Icon: IdCard },
  { title: "Corpo", hint: "Medidas usadas pelo gêmeo digital.", Icon: PersonStanding },
  { title: "Saúde", hint: "O que a IA deve considerar ao orientar.", Icon: HeartPulse },
] as const;

type Errors = Partial<Record<keyof Draft, string>>;

function numberIn(v: string, min: number, max: number) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max;
}

function validate(step: number, d: Draft): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (d.name.trim().length < 2) e.name = "Informe o nome completo.";
    if (!d.role.trim()) e.role = "Informe a função a bordo.";
  }
  if (step === 1) {
    if (!numberIn(d.age, 18, 80)) e.age = "Idade entre 18 e 80 anos.";
    if (!numberIn(d.heightCm, 140, 215)) e.heightCm = "Altura entre 140 e 215 cm.";
    if (!numberIn(d.weightKg, 40, 160)) e.weightKg = "Peso entre 40 e 160 kg.";
  }
  if (step === 2) {
    if (d.restingHeartRate && !numberIn(d.restingHeartRate, 35, 110))
      e.restingHeartRate = "Frequência de repouso entre 35 e 110 bpm.";
  }
  return e;
}

export function Onboarding({ initial, onDone }: { initial?: CrewProfile | null; onDone?: () => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initial ? toDraft(initial) : EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const editing = Boolean(initial);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const next = () => {
    const e = validate(step, draft);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step < STEPS.length - 1) {
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

  const current = STEPS[step];

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-[560px]">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-surface shadow-card" role="img" aria-label="cheeseOS">
            <span className="flex items-start text-lg leading-none font-bold tracking-tight">
              c<span className="-mt-1 ml-px text-xs text-accent">+</span>
            </span>
          </span>
          <div>
            <p className="text-sm font-semibold">cheeseOS</p>
            <p className="text-xs text-ink-3">Gêmeo digital de saúde</p>
          </div>
        </div>

        <h1 className="text-[28px] leading-tight font-bold tracking-tight text-balance">
          {editing ? "Atualizar dados do tripulante" : "Vamos montar o seu gêmeo digital"}
        </h1>
        <p className="mt-2 max-w-[52ch] text-[15px] text-ink-2">
          Esses dados ficam só neste aparelho e ajudam a IA local a orientar você. Os sinais vitais continuam simulados.
        </p>

        <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Etapas">
          {STEPS.map((s, i) => (
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
            next();
          }}
          noValidate
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <current.Icon className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold">{current.title}</h2>
              <p className="text-[13px] text-ink-3">{current.hint}</p>
            </div>
          </div>

          {step === 0 && (
            <div className="grid gap-4">
              <Field label="Nome completo" error={errors.name}>
                <input autoFocus autoComplete="name" value={draft.name} onChange={(e) => set("name", e.target.value)} className={input(errors.name)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Função a bordo" error={errors.role}>
                  <input placeholder="Engenheira de voo" value={draft.role} onChange={(e) => set("role", e.target.value)} className={input(errors.role)} />
                </Field>
                <Field label="Missão" optional>
                  <input placeholder="Ares III" value={draft.mission} onChange={(e) => set("mission", e.target.value)} className={input()} />
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Idade" suffix="anos" error={errors.age}>
                  <input autoFocus inputMode="numeric" value={draft.age} onChange={(e) => set("age", e.target.value)} className={input(errors.age)} />
                </Field>
                <Field label="Sexo">
                  <select value={draft.sex} onChange={(e) => set("sex", e.target.value as Sex)} className={input()}>
                    {(Object.keys(SEX_LABEL) as Sex[]).map((s) => (
                      <option key={s} value={s}>
                        {SEX_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Altura" suffix="cm" error={errors.heightCm}>
                  <input inputMode="numeric" value={draft.heightCm} onChange={(e) => set("heightCm", e.target.value)} className={input(errors.heightCm)} />
                </Field>
                <Field label="Peso" suffix="kg" error={errors.weightKg}>
                  <input inputMode="decimal" value={draft.weightKg} onChange={(e) => set("weightKg", e.target.value)} className={input(errors.weightKg)} />
                </Field>
                <Field label="Tipo sanguíneo" optional>
                  <select value={draft.bloodType} onChange={(e) => set("bloodType", e.target.value as Draft["bloodType"])} className={input()}>
                    <option value="">Não sei</option>
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
              <Field label="Frequência cardíaca em repouso" suffix="bpm" optional error={errors.restingHeartRate} hint="Base da simulação. Sem valor, usamos 68 bpm.">
                <input autoFocus inputMode="numeric" placeholder="68" value={draft.restingHeartRate} onChange={(e) => set("restingHeartRate", e.target.value)} className={input(errors.restingHeartRate)} />
              </Field>
              <Field label="Alergias" optional>
                <input placeholder="Ex.: dipirona, látex" value={draft.allergies} onChange={(e) => set("allergies", e.target.value)} className={input()} />
              </Field>
              <Field label="Medicações em uso" optional>
                <input placeholder="Ex.: melatonina 3 mg à noite" value={draft.medications} onChange={(e) => set("medications", e.target.value)} className={input()} />
              </Field>
              <Field label="Condições prévias" optional>
                <textarea rows={2} placeholder="Ex.: enxaqueca, asma leve" value={draft.conditions} onChange={(e) => set("conditions", e.target.value)} className={`${input()} resize-none`} />
              </Field>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(step - 1)} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-sunken">
                <ArrowLeft className="size-4" aria-hidden /> Voltar
              </button>
            ) : editing && onDone ? (
              <button type="button" onClick={onDone} className="rounded-full px-3 py-2 text-sm font-semibold text-ink-2 transition-colors hover:bg-sunken">
                Cancelar
              </button>
            ) : (
              <span />
            )}
            <button type="submit" className="flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-ink">
              {step < STEPS.length - 1 ? (
                <>
                  Continuar <ArrowRight className="size-4" aria-hidden />
                </>
              ) : editing ? (
                "Salvar dados"
              ) : (
                "Abrir meu gêmeo digital"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
        {optional && <span className="text-xs font-normal text-ink-3">opcional</span>}
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

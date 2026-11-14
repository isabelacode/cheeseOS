"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { EditableCard, Field, inputClass, numberIn, toInt } from "@/components/profile/fields";
import { BLOOD_TYPES, SEXES, saveProfile, type BloodType, type CrewProfile, type Sex } from "@/lib/crew/profile";
import { useLocale, useT, type Messages } from "@/lib/i18n";
import { profileMessages } from "@/lib/i18n/pages/profile";
import { useCrewSession } from "@/lib/session/CrewSession";

type SectionId = "health" | "body" | "identity";
type ErrorKey = keyof Messages["onboarding"]["errors"];

/** Section edits write through saveProfile; the shell re-renders with the new profile. */
function useSectionState() {
  const [editing, setEditing] = useState<SectionId | null>(null);
  const [saved, setSaved] = useState<SectionId | null>(null);
  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(null), 4000);
    return () => clearTimeout(id);
  }, [saved]);
  return {
    editing,
    saved,
    edit: (s: SectionId) => {
      setEditing(s);
      setSaved(null);
    },
    cancel: () => setEditing(null),
    done: (s: SectionId) => {
      setEditing(null);
      setSaved(s);
    },
  };
}

export function ProfileView() {
  const { profile } = useCrewSession();
  const locale = useLocale();
  const p = profileMessages[locale];
  const state = useSectionState();
  const meta = [profile.role, profile.mission || p.noMission, p.age(profile.age)];

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-balance">{profile.name}</h1>
        <p className="mt-1 text-[15px] text-ink-2">{meta.join(" · ")}</p>
      </header>
      <HealthSection profile={profile} state={state} />
      <BodySection profile={profile} state={state} />
      <IdentitySection profile={profile} state={state} />
      <p className="flex items-start gap-2 px-1 text-[13px] text-ink-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
        <span>
          {p.deviceNote}{" "}
          <Link href="/ajustes" className="font-semibold text-accent-ink hover:underline">
            {p.settingsLink}
          </Link>
        </span>
      </p>
    </div>
  );
}

type SectionProps = { profile: CrewProfile; state: ReturnType<typeof useSectionState> };

function useCardProps(id: SectionId, state: SectionProps["state"]) {
  const p = profileMessages[useLocale()];
  return {
    id: `profile-${id}`,
    title: p.sections[id],
    hint: p.sectionHints[id],
    editing: state.editing === id,
    saved: state.saved === id ? p.saved : null,
    editLabel: p.editLabel(p.sections[id]),
    editText: p.edit,
    onEdit: () => state.edit(id),
    onCancel: state.cancel,
  };
}

function useErrorText() {
  const errors = useT().onboarding.errors;
  return (k?: ErrorKey) => (k ? errors[k] : undefined);
}

function Item({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-2xl bg-sunken px-3.5 py-3 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs font-semibold text-ink-2">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold break-words">{children}</dd>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <span className="font-normal text-ink-2">{children}</span>;
}

/* ---------- Health: safety-critical first ---------- */

function HealthSection({ profile, state }: SectionProps) {
  const t = useT();
  const o = t.onboarding;
  const p = profileMessages[useLocale()];
  const card = useCardProps("health", state);
  const [draft, setDraft] = useState({ bloodType: profile.bloodType, allergies: profile.allergies, medications: profile.medications, conditions: profile.conditions });
  const allergies = profile.allergies.trim();

  return (
    <EditableCard
      {...card}
      onEdit={() => {
        setDraft({ bloodType: profile.bloodType, allergies: profile.allergies, medications: profile.medications, conditions: profile.conditions });
        card.onEdit();
      }}
      onSubmit={() => {
        saveProfile({
          ...profile,
          bloodType: draft.bloodType,
          allergies: draft.allergies.trim(),
          medications: draft.medications.trim(),
          conditions: draft.conditions.trim(),
        });
        state.done("health");
      }}
      view={
        <dl className="grid gap-2 sm:grid-cols-[minmax(0,180px)_1fr]">
          <div className="row-span-3 flex flex-col justify-center rounded-2xl bg-accent-soft px-4 py-4">
            <dt className="text-xs font-semibold text-accent-ink">{p.bloodType}</dt>
            <dd className={`mt-1 tabular font-bold tracking-tight ${profile.bloodType ? "text-[40px] leading-none text-ink" : "text-lg text-ink-2"}`}>
              {profile.bloodType || p.bloodUnknown}
            </dd>
          </div>
          <div className={`rounded-2xl px-3.5 py-3 ${allergies ? "bg-warn-soft" : "bg-sunken"}`}>
            <dt className={`flex items-center gap-1.5 text-xs font-semibold ${allergies ? "text-warn" : "text-ink-2"}`}>
              {allergies && <AlertTriangle className="size-3.5" aria-hidden />}
              {o.allergies}
            </dt>
            <dd className="mt-0.5 text-[15px] font-semibold break-words">{allergies || <Empty>{p.noneReported}</Empty>}</dd>
          </div>
          <Item label={o.medications}>{profile.medications.trim() || <Empty>{p.noneReported}</Empty>}</Item>
          <Item label={o.conditions}>{profile.conditions.trim() || <Empty>{p.noneReported}</Empty>}</Item>
        </dl>
      }
      form={
        <div className="grid gap-4">
          <Field label={o.bloodType} optional>
            {(a) => (
              <select {...a} value={draft.bloodType} onChange={(e) => setDraft({ ...draft, bloodType: e.target.value as BloodType })} className={inputClass()}>
                <option value="">{o.bloodUnknown}</option>
                {BLOOD_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label={o.allergies} optional>
            {(a) => <input {...a} placeholder={o.allergiesPlaceholder} value={draft.allergies} onChange={(e) => setDraft({ ...draft, allergies: e.target.value })} className={inputClass()} />}
          </Field>
          <Field label={o.medications} optional>
            {(a) => <input {...a} placeholder={o.medicationsPlaceholder} value={draft.medications} onChange={(e) => setDraft({ ...draft, medications: e.target.value })} className={inputClass()} />}
          </Field>
          <Field label={o.conditions} optional>
            {(a) => (
              <textarea {...a} rows={2} placeholder={o.conditionsPlaceholder} value={draft.conditions} onChange={(e) => setDraft({ ...draft, conditions: e.target.value })} className={`${inputClass()} resize-none`} />
            )}
          </Field>
        </div>
      }
    />
  );
}

/* ---------- Body ---------- */

type BodyDraft = { age: string; sex: Sex; heightCm: string; weightKg: string; restingHeartRate: string };
type BodyErrors = Partial<Record<keyof BodyDraft, ErrorKey>>;

function bodyDraft(p: CrewProfile): BodyDraft {
  return { age: String(p.age), sex: p.sex, heightCm: String(p.heightCm), weightKg: String(p.weightKg), restingHeartRate: String(p.restingHeartRate) };
}

function validateBody(d: BodyDraft): BodyErrors {
  const e: BodyErrors = {};
  if (!numberIn(d.age, 18, 80)) e.age = "age";
  if (!numberIn(d.heightCm, 140, 215)) e.heightCm = "height";
  if (!numberIn(d.weightKg, 40, 160)) e.weightKg = "weight";
  if (d.restingHeartRate.trim() && !numberIn(d.restingHeartRate, 35, 110)) e.restingHeartRate = "restingHr";
  return e;
}

function BodySection({ profile, state }: SectionProps) {
  const t = useT();
  const o = t.onboarding;
  const p = profileMessages[useLocale()];
  const card = useCardProps("body", state);
  const errorText = useErrorText();
  const [draft, setDraft] = useState<BodyDraft>(() => bodyDraft(profile));
  const [errors, setErrors] = useState<BodyErrors>({});
  const set = <K extends keyof BodyDraft>(k: K, v: BodyDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  return (
    <EditableCard
      {...card}
      onEdit={() => {
        setDraft(bodyDraft(profile));
        setErrors({});
        card.onEdit();
      }}
      onSubmit={() => {
        const e = validateBody(draft);
        setErrors(e);
        if (Object.keys(e).length) return;
        saveProfile({
          ...profile,
          age: toInt(draft.age),
          sex: draft.sex,
          heightCm: toInt(draft.heightCm),
          weightKg: toInt(draft.weightKg),
          restingHeartRate: draft.restingHeartRate.trim() ? toInt(draft.restingHeartRate) : 68,
        });
        state.done("body");
      }}
      view={
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Item label={o.sex}>{t.sex[profile.sex]}</Item>
          <Item label={o.age}>
            <span className="tabular">{p.age(profile.age)}</span>
          </Item>
          <Item label={o.height}>
            <span className="tabular">{profile.heightCm} cm</span>
          </Item>
          <Item label={o.weight}>
            <span className="tabular">{profile.weightKg} kg</span>
          </Item>
          <Item label={o.restingHr} wide>
            <span className="tabular">{profile.restingHeartRate} bpm</span>
          </Item>
        </dl>
      }
      form={
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={o.age} suffix={o.years} error={errorText(errors.age)}>
              {(a) => <input {...a} inputMode="numeric" value={draft.age} onChange={(e) => set("age", e.target.value)} className={inputClass(errors.age)} />}
            </Field>
            <Field label={o.sex}>
              {(a) => (
                <select {...a} value={draft.sex} onChange={(e) => set("sex", e.target.value as Sex)} className={inputClass()}>
                  {SEXES.map((s) => (
                    <option key={s} value={s}>
                      {t.sex[s]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={o.height} suffix="cm" error={errorText(errors.heightCm)}>
              {(a) => <input {...a} inputMode="numeric" value={draft.heightCm} onChange={(e) => set("heightCm", e.target.value)} className={inputClass(errors.heightCm)} />}
            </Field>
            <Field label={o.weight} suffix="kg" error={errorText(errors.weightKg)}>
              {(a) => <input {...a} inputMode="decimal" value={draft.weightKg} onChange={(e) => set("weightKg", e.target.value)} className={inputClass(errors.weightKg)} />}
            </Field>
          </div>
          <Field label={o.restingHr} suffix="bpm" optional error={errorText(errors.restingHeartRate)} hint={p.baselineNote}>
            {(a) => (
              <input {...a} inputMode="numeric" placeholder="68" value={draft.restingHeartRate} onChange={(e) => set("restingHeartRate", e.target.value)} className={inputClass(errors.restingHeartRate)} />
            )}
          </Field>
        </div>
      }
    />
  );
}

/* ---------- Identification ---------- */

type IdDraft = { name: string; role: string; mission: string };
type IdErrors = Partial<Record<keyof IdDraft, ErrorKey>>;

function IdentitySection({ profile, state }: SectionProps) {
  const o = useT().onboarding;
  const p = profileMessages[useLocale()];
  const card = useCardProps("identity", state);
  const errorText = useErrorText();
  const [draft, setDraft] = useState<IdDraft>({ name: profile.name, role: profile.role, mission: profile.mission });
  const [errors, setErrors] = useState<IdErrors>({});
  const set = <K extends keyof IdDraft>(k: K, v: string) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  return (
    <EditableCard
      {...card}
      onEdit={() => {
        setDraft({ name: profile.name, role: profile.role, mission: profile.mission });
        setErrors({});
        card.onEdit();
      }}
      onSubmit={() => {
        const e: IdErrors = {};
        if (draft.name.trim().length < 2) e.name = "name";
        if (!draft.role.trim()) e.role = "role";
        setErrors(e);
        if (Object.keys(e).length) return;
        saveProfile({ ...profile, name: draft.name.trim(), role: draft.role.trim(), mission: draft.mission.trim() });
        state.done("identity");
      }}
      view={
        <dl className="grid gap-2 sm:grid-cols-2">
          <Item label={o.name} wide>
            {profile.name}
          </Item>
          <Item label={o.role}>{profile.role}</Item>
          <Item label={o.mission}>{profile.mission || <Empty>{p.noMission}</Empty>}</Item>
        </dl>
      }
      form={
        <div className="grid gap-4">
          <Field label={o.name} error={errorText(errors.name)}>
            {(a) => <input {...a} autoComplete="name" value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputClass(errors.name)} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={o.role} error={errorText(errors.role)}>
              {(a) => <input {...a} placeholder={o.rolePlaceholder} value={draft.role} onChange={(e) => set("role", e.target.value)} className={inputClass(errors.role)} />}
            </Field>
            <Field label={o.mission} optional>
              {(a) => <input {...a} placeholder={o.missionPlaceholder} value={draft.mission} onChange={(e) => set("mission", e.target.value)} className={inputClass()} />}
            </Field>
          </div>
        </div>
      }
    />
  );
}

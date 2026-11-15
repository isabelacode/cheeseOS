"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CircleCheck, CircleHelp, ShieldCheck } from "lucide-react";
import { EditableCard, Field, inputClass, numberIn, toInt } from "@/components/profile/fields";
import { BLOOD_TYPES, SEXES, saveProfile, type BloodType, type CrewProfile, type Sex } from "@/lib/crew/profile";
import { useLocale, useT, type Messages } from "@/lib/i18n";
import { profileMessages } from "@/lib/i18n/pages/profile";
import { useCrewSession } from "@/lib/session/CrewSession";
import { allergyItems, allergyState } from "@/lib/health/safety";

type SectionId = "health" | "body" | "identity";
type ErrorKey = keyof Messages["onboarding"]["errors"];

/** Section edits write through saveProfile; the shell re-renders with the new profile. */
function useSectionState() {
  const [editing, setEditing] = useState<SectionId | null>(null);
  const [saved, setSaved] = useState<SectionId | null>(null);
  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => setSaved(null), 6000);
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
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-balance">{profile.name}</h1>
        <p className="mt-1 text-[15px] text-ink-2">{meta.join(" · ")}</p>
      </header>
      {/* The safety-critical health record spans the page; body and identity sit side by side below it. */}
      <HealthSection profile={profile} state={state} />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <BodySection profile={profile} state={state} />
        <IdentitySection profile={profile} state={state} />
      </div>
      <p className="flex items-start gap-2 px-1 text-[13px] text-ink-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
        <span>
          {p.deviceNote}{" "}
          <Link href="/ajustes" className="inline-flex min-h-11 items-center font-semibold text-accent-ink hover:underline sm:min-h-0">
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
    editBlocked: state.editing && state.editing !== id ? p.otherEditing : null,
  };
}

function useErrorText() {
  const errors = useT().onboarding.errors;
  return (k?: ErrorKey) => (k ? errors[k] : undefined);
}

function Item({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-sunken px-3.5 py-3 ${className}`}>
      <dt className="text-xs font-semibold text-ink-2">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold break-words">{children}</dd>
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <span className="font-normal text-ink-2">{children}</span>;
}

/** Empty safety field: a prompt to confirm, never read as "none". */
function Unverified() {
  const p = profileMessages[useLocale()];
  return (
    <span className="flex items-center gap-1.5 font-semibold text-warn">
      <CircleHelp className="size-4 shrink-0" aria-hidden />
      {p.unverified}
    </span>
  );
}

function ConfirmedNone({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 font-semibold text-ok">
      <CircleCheck className="size-4 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

/** The allergy list as the safety checker parsed it. */
function AllergyChips({ text, onWarn }: { text: string; onWarn?: boolean }) {
  const p = profileMessages[useLocale()];
  const items = allergyItems(text);
  if (!items.length) return null;
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((i) => (
        <li
          key={i.word}
          title={i.recognized ? p.recognized : p.plainText}
          className={`rounded-md px-2 py-0.5 text-[13px] font-semibold ${
            i.recognized ? "bg-warn text-white" : `border border-dashed border-warn/60 text-warn ${onWarn ? "bg-surface/60" : ""}`
          }`}
        >
          {i.word}
          <span className="sr-only"> ({i.recognized ? p.recognized : p.plainText})</span>
        </li>
      ))}
    </ul>
  );
}

/** "No known allergies" / "no medication": an explicit answer that locks the text field. */
function NoneCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mt-1.5 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium sm:min-h-9">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 shrink-0 accent-accent" />
      {label}
    </label>
  );
}

/* ---------- Health: safety-critical first ---------- */

function HealthSection({ profile, state }: SectionProps) {
  const t = useT();
  const o = t.onboarding;
  const p = profileMessages[useLocale()];
  const card = useCardProps("health", state);
  const [draft, setDraft] = useState({ bloodType: profile.bloodType, allergies: profile.allergies, medications: profile.medications, conditions: profile.conditions });
  const allergies = profile.allergies.trim();
  const aState = allergyState(profile.allergies);
  const mState = allergyState(profile.medications);
  const draftAllergyNone = allergyState(draft.allergies) === "none";
  const draftMedsNone = allergyState(draft.medications) === "none";

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
        <dl className="grid gap-2 sm:grid-cols-[minmax(0,180px)_1fr] lg:grid-cols-[200px_repeat(3,minmax(0,1fr))]">
          <div className="flex flex-col justify-center rounded-2xl bg-accent-soft px-4 py-4 sm:row-span-3 lg:row-span-1">
            <dt className="text-xs font-semibold text-accent-ink">{p.bloodType}</dt>
            <dd className={`mt-1 tabular font-bold tracking-tight ${profile.bloodType ? "text-[40px] leading-none text-ink" : "text-lg text-ink-2"}`}>
              {profile.bloodType || p.bloodUnknown}
            </dd>
          </div>
          <div className={`rounded-2xl px-3.5 py-3 ${aState === "listed" ? "bg-warn-soft" : "bg-sunken"}`}>
            <dt className={`flex items-center gap-1.5 text-xs font-semibold ${aState === "listed" ? "text-warn" : "text-ink-2"}`}>
              {aState === "listed" && <AlertTriangle className="size-3.5" aria-hidden />}
              {o.allergies}
            </dt>
            <dd className="mt-0.5 text-[15px] font-semibold break-words">
              {aState === "unverified" ? (
                <Unverified />
              ) : aState === "none" ? (
                <ConfirmedNone>{p.noKnownAllergies}</ConfirmedNone>
              ) : (
                <>
                  <span className="sr-only">{allergies}</span>
                  <AllergyChips text={allergies} onWarn />
                </>
              )}
            </dd>
          </div>
          <Item label={o.medications}>
            {mState === "unverified" ? (
              <Unverified />
            ) : mState === "none" ? (
              <ConfirmedNone>{p.noMedications}</ConfirmedNone>
            ) : (
              profile.medications.trim()
            )}
          </Item>
          <Item label={o.conditions}>{profile.conditions.trim() || <Empty>{p.noneReported}</Empty>}</Item>
        </dl>
      }
      form={
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Field label={o.bloodType} optional>
            {(a) => (
              <select {...a} value={draft.bloodType} onChange={(e) => setDraft({ ...draft, bloodType: e.target.value as BloodType })} className={inputClass()}>
                <option value="">{p.bloodUnknown}</option>
                {BLOOD_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div>
            <Field label={o.allergies} hint={draftAllergyNone ? undefined : p.allergyHint}>
              {(a) => (
                <input
                  {...a}
                  placeholder={o.allergiesPlaceholder}
                  value={draftAllergyNone ? "" : draft.allergies}
                  disabled={draftAllergyNone}
                  onChange={(e) => setDraft({ ...draft, allergies: e.target.value })}
                  className={`${inputClass()} disabled:opacity-50`}
                />
              )}
            </Field>
            {!draftAllergyNone && allergyItems(draft.allergies).length > 0 && (
              <div className="mt-2 rounded-xl bg-warn-soft px-3 py-2" aria-live="polite">
                <p className="text-xs font-semibold text-warn">{p.parsedLabel}</p>
                <AllergyChips text={draft.allergies} onWarn />
              </div>
            )}
            <NoneCheckbox
              label={p.noKnownAllergies}
              checked={draftAllergyNone}
              onChange={(v) => setDraft({ ...draft, allergies: v ? p.noKnownAllergies : "" })}
            />
          </div>
          <div>
            <Field label={o.medications}>
              {(a) => (
                <input
                  {...a}
                  placeholder={o.medicationsPlaceholder}
                  value={draftMedsNone ? "" : draft.medications}
                  disabled={draftMedsNone}
                  onChange={(e) => setDraft({ ...draft, medications: e.target.value })}
                  className={`${inputClass()} disabled:opacity-50`}
                />
              )}
            </Field>
            <NoneCheckbox
              label={p.noMedications}
              checked={draftMedsNone}
              onChange={(v) => setDraft({ ...draft, medications: v ? p.noMedicationsValue : "" })}
            />
          </div>
          <Field label={o.conditions} optional>
            {(a) => (
              <textarea {...a} rows={3} placeholder={o.conditionsPlaceholder} value={draft.conditions} onChange={(e) => setDraft({ ...draft, conditions: e.target.value })} className={`${inputClass()} resize-y`} />
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
          <Item label={o.age}>
            <span className="tabular">{p.age(profile.age)}</span>
          </Item>
          <Item label={o.sex}>{t.sex[profile.sex]}</Item>
          <Item label={o.height}>
            <span className="tabular">{profile.heightCm} cm</span>
          </Item>
          <Item label={o.weight}>
            <span className="tabular">{profile.weightKg} kg</span>
          </Item>
          <Item label={o.restingHr} className="col-span-2">
            <span className="tabular">{profile.restingHeartRate} bpm</span>
          </Item>
        </dl>
      }
      form={
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={o.age} suffix={o.years} error={errorText(errors.age)} hint={p.range(18, 80)}>
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
            <Field label={o.height} suffix="cm" error={errorText(errors.heightCm)} hint={p.range(140, 215)}>
              {(a) => <input {...a} inputMode="numeric" value={draft.heightCm} onChange={(e) => set("heightCm", e.target.value)} className={inputClass(errors.heightCm)} />}
            </Field>
            <Field label={o.weight} suffix="kg" error={errorText(errors.weightKg)} hint={p.range(40, 160)}>
              {(a) => <input {...a} inputMode="numeric" value={draft.weightKg} onChange={(e) => set("weightKg", e.target.value)} className={inputClass(errors.weightKg)} />}
            </Field>
          </div>
          <Field label={o.restingHr} suffix="bpm" optional error={errorText(errors.restingHeartRate)} hint={`${p.restingHrHint} ${p.baselineNote}`}>
            {(a) => (
              <input {...a} inputMode="numeric" value={draft.restingHeartRate} onChange={(e) => set("restingHeartRate", e.target.value)} className={inputClass(errors.restingHeartRate)} />
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
          <Item label={o.name} className="col-span-full">
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

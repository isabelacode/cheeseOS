"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronRight, Download, Eraser, Mic, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { BrowserModelList, EngineRadioGroup, EngineStatusPanel, OpenRouterForm } from "@/components/ai/AiControls";
import { ConfirmAction } from "@/components/settings/ConfirmAction";
import { Card, SectionTitle } from "@/components/health/ui";
import { deleteProfile } from "@/lib/crew/profile";
import { LOCALES, setLocale, useLocale, useT } from "@/lib/i18n";
import { settingsMessages } from "@/lib/i18n/pages/settings";
import { useCrewSession } from "@/lib/session/CrewSession";

export function SettingsView() {
  const s = settingsMessages[useLocale()];
  return (
    <div className="flex w-full max-w-[720px] flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{s.title}</h1>
        <p className="mt-1 text-[15px] text-ink-2">{s.intro}</p>
      </header>
      <ProfileLink />
      <AiSection />
      <LanguageSection />
      <VoiceSection />
      <DataSection />
    </div>
  );
}

function ProfileLink() {
  const s = settingsMessages[useLocale()];
  const { profile } = useCrewSession();
  return (
    <Link
      href="/perfil"
      className="flex min-h-16 items-center gap-3 rounded-3xl bg-surface p-4 shadow-card transition-colors hover:bg-sunken sm:px-5"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
        <UserRound className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{s.profileLink}</span>
        <span className="block truncate text-[13px] text-ink-2">
          {profile.name} · {s.profileLinkHint}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink-2" aria-hidden />
    </Link>
  );
}

function AiSection() {
  const s = settingsMessages[useLocale()];
  const { ai } = useCrewSession();
  const keyRef = useRef<HTMLInputElement>(null);
  return (
    <Card aria-labelledby="ai-engine">
      <SectionTitle>
        <span id="ai-engine">{s.ai.title}</span>
      </SectionTitle>
      <p className="-mt-1 mb-4 text-[13px] text-ink-2">{s.ai.intro}</p>
      <div className="grid gap-4">
        <EngineStatusPanel ai={ai} />
        <EngineRadioGroup ai={ai} onNeedKey={() => keyRef.current?.focus()} />
        <div className="border-t border-line pt-4">
          <BrowserModelList ai={ai} />
        </div>
        <div className="border-t border-line pt-4">
          <OpenRouterForm ai={ai} keyInputRef={keyRef} />
        </div>
        <div className="border-t border-line pt-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <ShieldCheck className="size-4 text-accent-ink" aria-hidden /> {s.privacy.title}
          </h3>
          <ul className="mt-2 grid gap-1.5 text-[13px] text-ink-2">
            <li>{s.privacy.voice}</li>
            <li>{s.privacy.local}</li>
            <li className={ai.active === "openrouter" ? "font-semibold text-ink" : undefined}>{s.privacy.cloud}</li>
            <li>{s.privacy.key}</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

function LanguageSection() {
  const t = useT();
  const locale = useLocale();
  const s = settingsMessages[locale];
  return (
    <Card aria-labelledby="language">
      <SectionTitle>
        <span id="language">{s.language.title}</span>
      </SectionTitle>
      <p className="-mt-1 mb-3 text-[13px] text-ink-2">{s.language.hint}</p>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">{t.language.label}</legend>
        {LOCALES.map((l) => (
          <label
            key={l}
            lang={l === "pt" ? "pt-BR" : "en"}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 py-2.5 text-sm font-semibold transition-colors has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:ring-2 has-focus-visible:ring-accent"
          >
            <input
              type="radio"
              name="locale"
              value={l}
              checked={locale === l}
              onChange={() => setLocale(l)}
              className="size-4 shrink-0 accent-accent focus-visible:outline-none"
            />
            {t.language.names[l]}
          </label>
        ))}
      </fieldset>
    </Card>
  );
}

function VoiceSection() {
  const s = settingsMessages[useLocale()].voice;
  const { ai, mic } = useCrewSession();
  const stt = ai.models.stt;
  const sttText =
    stt.state === "ready" ? s.stt.ready : stt.state === "loading" ? s.stt.loading(Math.round(stt.progress * 100)) : stt.state === "error" ? s.stt.error : s.stt.idle;
  return (
    <Card aria-labelledby="voice">
      <SectionTitle>
        <span id="voice">{s.title}</span>
      </SectionTitle>
      <p className="max-w-[64ch] text-[13px] text-ink-2">
        {s.howTo[0]}
        <kbd className="rounded-md border border-line bg-sunken px-1.5 py-0.5 font-sans text-xs font-semibold text-ink">{s.howTo[1]}</kbd>
        {s.howTo[2]}
      </p>
      <p className="mt-2 max-w-[64ch] text-[13px] text-ink-2">{s.onDemand}</p>
      <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ${stt.state === "error" ? "bg-crit-soft" : "bg-sunken"}`}>
        <Mic className={`size-4 shrink-0 ${stt.state === "error" ? "text-crit" : "text-ink-2"}`} aria-hidden />
        <p role="status" className={`min-w-0 flex-1 text-sm font-semibold ${stt.state === "error" ? "text-crit" : ""}`}>
          {s.status}: {sttText}
          {ai.device && stt.state === "ready" && <span className="font-normal text-ink-2"> · {ai.device === "webgpu" ? s.deviceGpu : s.deviceCpu}</span>}
        </p>
        {stt.state === "idle" && (
          <button
            type="button"
            onClick={ai.loadStt}
            className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-accent-soft hover:text-accent-ink"
          >
            <Download className="size-4" aria-hidden /> {s.preload}
          </button>
        )}
      </div>
      {stt.state === "loading" && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.round(stt.progress * 100)}%` }} />
        </div>
      )}
      {stt.state === "error" && <p className="mt-2 text-[13px] text-ink-2">{s.failedHint}</p>}
      {(mic.state === "denied" || mic.state === "error") && (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-crit">
          {mic.state === "denied" ? s.mic.denied : s.mic.error}
        </p>
      )}
    </Card>
  );
}

function DataSection() {
  const s = settingsMessages[useLocale()].data;
  const { clearSession } = useCrewSession();
  return (
    <Card aria-labelledby="data">
      <SectionTitle>
        <span id="data">{s.title}</span>
      </SectionTitle>
      <p className="-mt-1 text-[13px] text-ink-2">{s.intro}</p>
      <div className="divide-y divide-line">
        <ConfirmAction
          title={s.clearTitle}
          body={s.clearBody}
          confirmText={s.clearConfirm}
          confirmLabel={s.clearYes}
          Icon={Eraser}
          onConfirm={clearSession}
          done={s.cleared}
        />
        <ConfirmAction
          title={s.deleteTitle}
          body={s.deleteBody}
          confirmText={s.deleteConfirm}
          confirmLabel={s.deleteYes}
          Icon={Trash2}
          onConfirm={deleteProfile}
        />
      </div>
    </Card>
  );
}

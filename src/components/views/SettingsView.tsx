"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { BellRing, ChevronRight, Download, Eraser, Gauge, Mic, Orbit, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { setDemoMode, useDemoMode } from "@/lib/demo";
import { REMINDER_IDS, setNotify, setReminder, useRoutine } from "@/lib/routine/routine";
import { routineMessages } from "@/lib/i18n/pages/routine";
import { scienceMessages } from "@/lib/science/nasa";
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
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{s.title}</h1>
        <p className="mt-1 text-[15px] text-ink-2">{s.intro}</p>
      </header>
      {/* Two balanced columns on wide screens; on phones the DOM order is the reading order. */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <ProfileLink />
          <ScienceLink />
          <LanguageSection />
          <AiSection />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <VoiceSection />
          <RemindersSection />
          <DemoSection />
          <DataSection />
        </div>
      </div>
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
        <span className="block text-[13px] break-words text-ink-2">
          {profile.name} · {s.profileLinkHint}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink-2" aria-hidden />
    </Link>
  );
}

function ScienceLink() {
  const c = scienceMessages[useLocale()];
  return (
    <Link href="/ciencia" className="flex min-h-16 items-center gap-3 rounded-3xl bg-surface p-4 shadow-card transition-colors hover:bg-sunken sm:px-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
        <Orbit className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{c.title}</span>
        <span className="block text-[13px] text-ink-2">{c.subtitle}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink-2" aria-hidden />
    </Link>
  );
}

/** Browser notification permission, read without effects (it is not observable, so re-read on each render). */
function useNotificationPermission() {
  return useSyncExternalStore(
    () => () => {},
    () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission),
    () => "default",
  );
}

function RemindersSection() {
  const r = routineMessages[useLocale()];
  const routine = useRoutine();
  const permission = useNotificationPermission();
  const [, rerender] = useState(0);

  async function toggleNotify(on: boolean) {
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission().catch(() => "denied");
      rerender((n) => n + 1);
    }
    setNotify(on);
  }

  return (
    <Card aria-labelledby="reminders">
      <SectionTitle>
        <span id="reminders" className="flex items-center gap-1.5">
          {r.settings.title}
        </span>
      </SectionTitle>
      <p className="-mt-1 mb-3 max-w-[60ch] text-[13px] text-ink-2">{r.settings.intro}</p>
      <ul className="grid gap-2">
        {REMINDER_IDS.map((id) => {
          const rem = routine.reminders.find((x) => x.id === id)!;
          const label = r.reminders[id].label;
          return (
            <li key={id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-sunken px-3.5 py-2.5">
              <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={rem.enabled}
                  onChange={(e) => setReminder(id, { enabled: e.target.checked })}
                  aria-label={r.settings.enable(label)}
                  className="size-4 shrink-0 accent-accent"
                />
                <span className="min-w-0">
                  {label}
                  <span className="block text-xs font-normal text-ink-3">{r.reminders[id].body}</span>
                </span>
              </label>
              <input
                type="time"
                value={rem.time}
                disabled={!rem.enabled}
                onChange={(e) => e.target.value && setReminder(id, { time: e.target.value })}
                aria-label={r.settings.time(label)}
                className="tabular min-h-11 rounded-full border border-line bg-surface px-3 text-sm outline-none focus:border-accent disabled:opacity-50"
              />
            </li>
          );
        })}
      </ul>
      <div className="mt-3 rounded-2xl border border-line px-3.5 py-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={routine.notify && permission === "granted"}
            disabled={permission === "denied" || permission === "unsupported"}
            onChange={(e) => toggleNotify(e.target.checked)}
            aria-describedby="notify-hint"
            className="size-4 shrink-0 accent-accent"
          />
          <BellRing className="size-4 shrink-0 text-accent-ink" aria-hidden />
          {r.settings.notify}
        </label>
        <p id="notify-hint" className="max-w-[60ch] pl-14 text-xs text-ink-3">
          {permission === "denied" ? r.settings.notifyDenied : permission === "unsupported" ? r.settings.notifyUnsupported : r.settings.notifyHint}
        </p>
      </div>
      <p className="mt-2 text-xs text-ink-3">{r.settings.openOnly}</p>
    </Card>
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
        {/* The form mounts after the pick, so focus it on the next frame. */}
        <EngineRadioGroup ai={ai} onNeedKey={() => requestAnimationFrame(() => keyRef.current?.focus())} />
        {ai.choice === "browser" && (
          <div className="border-t border-line pt-4">
            <BrowserModelList ai={ai} />
          </div>
        )}
        {ai.choice === "openrouter" && (
          <div className="border-t border-line pt-4">
            <OpenRouterForm ai={ai} keyInputRef={keyRef} />
          </div>
        )}
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
      <p className="max-w-[60ch] text-[13px] text-ink-2">
        {s.howTo[0]}
        <kbd className="rounded-md border border-line bg-sunken px-1.5 py-0.5 font-sans text-xs font-semibold text-ink">{s.howTo[1]}</kbd>
        {s.howTo[2]}
      </p>
      <p className="mt-2 max-w-[60ch] text-[13px] text-ink-2">{s.onDemand}</p>
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

function DemoSection() {
  const s = settingsMessages[useLocale()].demo;
  const demo = useDemoMode();
  return (
    <Card aria-labelledby="demo">
      <SectionTitle>
        <span id="demo">{s.title}</span>
      </SectionTitle>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
        <input type="checkbox" checked={demo} onChange={(e) => setDemoMode(e.target.checked)} aria-describedby="demo-hint" className="size-4 shrink-0 accent-accent" />
        <Gauge className="size-4 shrink-0 text-accent-ink" aria-hidden />
        {s.label}
      </label>
      <p id="demo-hint" className="max-w-[60ch] pl-7 text-[13px] text-ink-2">
        {s.hint}
      </p>
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

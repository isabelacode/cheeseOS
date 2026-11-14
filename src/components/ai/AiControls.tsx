"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { AlertTriangle, CheckCircle2, Cloud, Cpu, ExternalLink, Loader2, PowerOff, type LucideIcon } from "lucide-react";
import type { EngineId, useLocalAi } from "@/hooks/useLocalAi";
import { BROWSER_MODELS, formatSize } from "@/lib/llm/browser-models";
import { DEFAULT_OPENROUTER_MODEL, saveOpenRouterSettings } from "@/lib/llm/openrouter";
import { useLocale, useT } from "@/lib/i18n";
import { settingsMessages } from "@/lib/i18n/pages/settings";

type Ai = ReturnType<typeof useLocalAi>;

const ENGINE_ICON: Record<EngineId, LucideIcon> = { openrouter: Cloud, browser: Cpu, off: PowerOff };

/** Current engine in plain language, with a recovery hint when something failed. */
export function EngineStatusPanel({ ai }: { ai: Ai }) {
  const t = useT();
  const e = t.engine;
  const s = settingsMessages[useLocale()].ai;
  const { active, choice, hasKey, models, browserModel, activeModel, fellBack, openrouter, error } = ai;
  const llm = models.llm;
  const Icon = ENGINE_ICON[active];
  const current = activeModel ?? browserModel;
  /** True only while a browser model is loaded and answering. */
  const browserServing = active === "browser" && activeModel !== null && llm.state === "ready";

  let text: string;
  let hint: string | null = null;
  let tone: "ok" | "busy" | "error" = "ok";
  if (active === "openrouter") {
    text = `OpenRouter · ${openrouter.model}`;
    if (error) {
      tone = "error";
      text = e.errors[error];
      hint = s.errorHints[error];
    }
  } else if (active === "off") {
    text = e.offStatus;
  } else if (!activeModel) {
    // Every candidate failed: say so, and say what advice runs on instead.
    tone = "error";
    const tried = BROWSER_MODELS.filter((m) => ai.failedModels.includes(m.id)).map((m) => m.label);
    text = tried.length > 1 ? s.allFailed(tried.join(", ")) : e.browserFailed(browserModel.label);
    hint = `${s.rulesOnly} ${tried.length > 1 ? s.allFailedHint : s.browserFailedHint}`;
  } else if (llm.state === "ready") {
    text = e.browserReady(current.label);
  } else if (llm.state === "loading") {
    tone = "busy";
    text = e.browserLoading(current.label, Math.round(llm.progress * 100));
    hint = `${s.rulesOnly} ${s.browserLoadingHint}`;
  } else if (llm.state === "error" && !fellBack) {
    tone = "error";
    text = e.browserFailed(current.label);
    hint = `${s.rulesOnly} ${s.browserFailedHint}`;
  } else {
    // Idle, or between a failed load and the fallback starting.
    tone = "busy";
    text = e.browserWaiting(current.label);
    hint = s.rulesOnly;
  }
  const noKeyText = browserServing ? s.noKeyFallback(current.label) : active === "browser" && activeModel && llm.state !== "error" ? s.noKeyLoading : s.noKeyRules;

  return (
    <div className={`rounded-2xl px-4 py-3 ${tone === "error" ? "bg-crit-soft" : "bg-sunken"}`} role="status" aria-live="polite">
      <p className="text-xs font-semibold text-ink-2">{s.inUse}</p>
      <p className={`mt-0.5 flex items-center gap-2 text-sm font-semibold ${tone === "error" ? "text-crit" : "text-ink"}`}>
        {tone === "error" ? (
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
        ) : tone === "busy" ? (
          <Loader2 className={`size-4 shrink-0 ${llm.state === "loading" ? "animate-spin" : ""}`} aria-hidden />
        ) : (
          <Icon className="size-4 shrink-0" aria-hidden />
        )}
        <span className="min-w-0 break-words">{text}</span>
      </p>
      {active === "browser" && llm.state === "loading" && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.round(llm.progress * 100)}%` }} />
        </div>
      )}
      {active === "browser" && fellBack && activeModel && (
        <p className="mt-1 text-[13px] font-semibold text-warn">{s.fellBack(browserModel.label, activeModel.label)}</p>
      )}
      {hint && <p className="mt-1 text-[13px] text-ink-2">{hint}</p>}
      {choice === "openrouter" && !hasKey && <p className="mt-1 text-[13px] text-ink-2">{noKeyText}</p>}
      <p className={`mt-1.5 text-xs font-semibold ${active === "openrouter" ? "text-warn" : "text-accent-ink"}`}>
        {active === "openrouter" ? e.cloudBadge : e.localBadge}
      </p>
    </div>
  );
}

/** The three engines as a native radio group (arrow keys move between them). */
export function EngineRadioGroup({ ai, onNeedKey }: { ai: Ai; onNeedKey: () => void }) {
  const e = useT().engine;
  const name = useId();
  const options: { id: EngineId; label: string; hint: string }[] = [
    { id: "openrouter", label: "OpenRouter", hint: ai.hasKey ? e.openrouterHint : e.openrouterNoKey },
    { id: "browser", label: e.browserLabel, hint: e.browserHint },
    { id: "off", label: e.offLabel, hint: e.offHint },
  ];
  return (
    <fieldset className="grid gap-2">
      <legend className="sr-only">{e.pickerLabel}</legend>
      {options.map(({ id, label, hint }) => {
        const Icon = ENGINE_ICON[id];
        return (
          <label
            key={id}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 py-3 transition-colors has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:ring-2 has-focus-visible:ring-accent"
          >
            <input
              type="radio"
              name={name}
              value={id}
              checked={ai.choice === id}
              onChange={() => {
                ai.choose(id);
                if (id === "openrouter" && !ai.hasKey) onNeedKey();
              }}
              className="size-4 shrink-0 accent-accent focus-visible:outline-none"
            />
            <Icon className="size-5 shrink-0 text-ink-2" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-[13px] text-ink-2">{hint}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** On-device model choice; applies at once (the new model loads if the browser engine is active). */
export function BrowserModelList({ ai }: { ai: Ai }) {
  const t = useT();
  const e = t.engine;
  const locale = useLocale();
  const s = settingsMessages[locale].ai;
  const name = useId();
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
        <Cpu className="size-4 text-accent-ink" aria-hidden /> {s.modelsTitle}
      </legend>
      <p className="text-[13px] text-ink-2">
        {e.browserIntro}
        {ai.device === "wasm" && e.noGpu}
      </p>
      {BROWSER_MODELS.map((m) => (
        <label
          key={m.id}
          className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:ring-2 has-focus-visible:ring-accent"
        >
          <input
            type="radio"
            name={name}
            value={m.id}
            checked={ai.browserModel.id === m.id}
            onChange={() => ai.chooseBrowserModel(m.id)}
            className="size-4 shrink-0 accent-accent focus-visible:outline-none"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{m.label}</span>
            <span className="block text-xs text-ink-2">{t.browserModels[m.id]}</span>
            {ai.failedModels.includes(m.id) && <span className="mt-0.5 block text-xs font-semibold text-crit">{e.browserFailed(m.label)}</span>}
            {ai.fellBack && ai.activeModel?.id === m.id && <span className="mt-0.5 block text-xs font-semibold text-ok">{s.activeFallback}</span>}
          </span>
          <span className="tabular text-xs font-semibold text-ink-2">{formatSize(ai.device === "wasm" ? m.cpuMb : m.gpuMb, locale)}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Bring-your-own-key form. Saving a key also switches the engine to OpenRouter. */
export function OpenRouterForm({ ai, keyInputRef }: { ai: Ai; keyInputRef?: RefObject<HTMLInputElement | null> }) {
  const t = useT();
  const e = t.engine;
  const s = settingsMessages[useLocale()].ai;
  const { openrouter } = ai;
  const [apiKey, setApiKey] = useState(openrouter.apiKey);
  const [model, setModel] = useState(openrouter.model);
  const [notice, setNotice] = useState<string | null>(null);
  const [keyError, setKeyError] = useState(false);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const keyRef = keyInputRef ?? fallbackRef;
  const ids = useId();
  const input = "w-full rounded-xl border bg-sunken px-3.5 py-2.5 font-mono text-sm outline-none transition-colors focus:border-accent focus:bg-surface";

  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (!apiKey.trim()) {
          setKeyError(true);
          setNotice(null);
          keyRef.current?.focus();
          return;
        }
        saveOpenRouterSettings({ apiKey, model });
        ai.choose("openrouter");
        setNotice(s.savedKey);
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Cloud className="size-4 text-accent-ink" aria-hidden /> {s.keyTitle}
        </h3>
        <span className={`flex items-center gap-1 text-xs font-semibold ${ai.hasKey ? "text-ok" : "text-ink-2"}`}>
          {ai.hasKey && <CheckCircle2 className="size-3.5" aria-hidden />}
          {ai.hasKey ? s.keySaved : s.keyMissing}
        </span>
      </div>
      <p className="text-[13px] text-ink-2">{e.openrouterIntro}</p>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold">{e.apiKey}</span>
        <input
          ref={keyRef}
          name="apiKey"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(ev) => {
            setApiKey(ev.target.value);
            setKeyError(false);
          }}
          placeholder="sk-or-v1-…"
          aria-invalid={keyError || undefined}
          aria-describedby={keyError ? `${ids}-err` : undefined}
          className={`${input} ${keyError ? "border-crit" : "border-transparent"}`}
        />
        {keyError && (
          <span id={`${ids}-err`} role="alert" className="mt-1 block text-xs text-crit">
            {s.keyRequired}
          </span>
        )}
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold">{e.model}</span>
        <input
          name="model"
          spellCheck={false}
          value={model}
          onChange={(ev) => setModel(ev.target.value)}
          placeholder={DEFAULT_OPENROUTER_MODEL}
          aria-describedby={`${ids}-model`}
          className={`${input} border-transparent`}
        />
        <span id={`${ids}-model`} className="mt-1 block text-xs text-ink-2">
          {s.modelHint}
        </span>
      </label>
      <a
        href="https://openrouter.ai/keys"
        target="_blank"
        rel="noreferrer"
        className="flex w-fit items-center gap-1 py-1 text-sm font-semibold text-accent-ink hover:underline"
      >
        {e.createKey} <ExternalLink className="size-3.5" aria-hidden />
      </a>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="min-h-11 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-ink">
          {s.saveKey}
        </button>
        {ai.hasKey && (
          <button
            type="button"
            onClick={() => {
              saveOpenRouterSettings({ apiKey: "", model });
              setApiKey("");
              setNotice(s.removedKey);
            }}
            className="min-h-11 rounded-full px-4 py-2 text-sm font-semibold text-crit transition-colors hover:bg-crit-soft"
          >
            {e.removeKey}
          </button>
        )}
      </div>
      <p role="status" className="text-[13px] font-semibold text-ok empty:hidden">
        {notice}
      </p>
    </form>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_BROWSER_MODEL, fallbackChain, readBrowserModel, saveBrowserModel, browserModelById, type BrowserModel } from "@/lib/llm/browser-models";
import { OpenRouterError, openRouterFeedback, useOpenRouterSettings, type OpenRouterErrorCode } from "@/lib/llm/openrouter";
import { messages, type Locale } from "@/lib/i18n";
import type { AiRequest, AiResponse, ModelKey, ModelState } from "@/workers/protocol";

export interface ModelInfo {
  state: ModelState;
  progress: number;
  error?: string;
}

type Pending = (text: string) => void;

/** "off" = no model at all: the instant rule-based advice only. */
export type EngineId = "openrouter" | "browser" | "off";

const CHOICE_KEY = "cheeseos.engine.v1";
/** After this the on-device answer is dropped and the local rules stand alone. */
const BROWSER_TIMEOUT_MS = 30_000;

function readChoice(): EngineId {
  try {
    const v = window.localStorage.getItem(CHOICE_KEY);
    return v === "browser" || v === "off" ? v : "openrouter";
  } catch {
    return "openrouter";
  }
}

/**
 * Speech-to-text always runs on device (Whisper in a worker). The feedback LLM
 * is the visitor's choice: OpenRouter with their own key (cloud) or a small model
 * running in the browser. Without a key, the browser model is used.
 */
export function useLocalAi() {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef(new Map<string, Pending>());
  const [device, setDevice] = useState<"webgpu" | "wasm" | null>(null);
  const [models, setModels] = useState<Record<ModelKey, ModelInfo>>({
    stt: { state: "idle", progress: 0 },
    llm: { state: "idle", progress: 0 },
  });
  const openrouter = useOpenRouterSettings();
  const [choice, setChoice] = useState<EngineId>("openrouter");
  const [error, setError] = useState<OpenRouterErrorCode | null>(null);
  const [browserModel, setBrowserModel] = useState<BrowserModel>(DEFAULT_BROWSER_MODEL);
  /** Models that failed to load on this device during this session. */
  const [failed, setFailed] = useState<string[]>([]);
  /** The model last sent to the worker, so a load error can be pinned on it. */
  const requestedRef = useRef<string | null>(null);
  // Saved choices are read on mount; nothing is downloaded before that.
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const worker = new Worker(new URL("../workers/ai.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    const waiting = pending.current;

    worker.onmessage = (e: MessageEvent<AiResponse>) => {
      const msg = e.data;
      switch (msg.type) {
        case "device":
          setDevice(msg.device);
          break;
        case "status":
          if (msg.model === "llm" && msg.state === "error" && requestedRef.current) {
            const id = requestedRef.current;
            setFailed((f) => (f.includes(id) ? f : [...f, id]));
          }
          setModels((m) => ({
            ...m,
            [msg.model]: { ...m[msg.model], state: msg.state, error: msg.error, progress: msg.state === "ready" ? 1 : msg.state === "loading" ? 0 : m[msg.model].progress },
          }));
          break;
        case "progress":
          setModels((m) => ({ ...m, [msg.model]: { ...m[msg.model], progress: msg.ratio } }));
          break;
        case "transcript":
        case "feedback":
          waiting.get(msg.id)?.(msg.text);
          waiting.delete(msg.id);
          break;
        case "error":
          if (msg.id) {
            waiting.get(msg.id)?.("");
            waiting.delete(msg.id);
          }
          console.error("[local-ai]", msg.error);
          break;
      }
    };

    return () => {
      worker.terminate();
      waiting.clear();
    };
  }, []);

  const send = useCallback((req: AiRequest, transfer: Transferable[] = []) => {
    workerRef.current?.postMessage(req, transfer);
  }, []);

  const request = useCallback(
    (build: (id: string) => AiRequest, transfer: Transferable[] = []) =>
      new Promise<string>((resolve) => {
        const id = crypto.randomUUID();
        pending.current.set(id, resolve);
        send(build(id), transfer);
      }),
    [send],
  );

  const hasKey = Boolean(openrouter.apiKey);
  const active: EngineId = choice === "off" ? "off" : choice === "openrouter" && hasKey ? "openrouter" : "browser";

  // If the chosen model fails to load (no GPU, not enough memory), the next
  // smaller one is tried automatically; null when every candidate failed.
  const activeModel: BrowserModel | null = fallbackChain(browserModel).find((m) => !failed.includes(m.id)) ?? null;
  const activeModelId = activeModel?.id ?? null;

  // The browser model is only downloaded while it is the active engine, and
  // released as soon as another engine (or "off") is picked.
  useEffect(() => {
    if (!booted) return;
    if (active === "browser" && activeModelId) {
      requestedRef.current = activeModelId;
      send({ type: "loadLlm", model: activeModelId });
    } else if (active !== "browser") {
      requestedRef.current = null;
      send({ type: "unloadLlm" });
    }
  }, [booted, active, activeModelId, send]);

  /** Whisper is loaded on demand, when listening is first turned on. */
  const loadStt = useCallback(() => send({ type: "loadStt" }), [send]);

  const load = useCallback(() => {
    setChoice(readChoice());
    setBrowserModel(readBrowserModel());
    setBooted(true);
  }, []);

  const chooseBrowserModel = useCallback((id: string) => {
    saveBrowserModel(id);
    setBrowserModel(browserModelById(id));
    // Picking a model by hand gives every model a fresh try.
    setFailed([]);
  }, []);

  const choose = useCallback((id: EngineId) => {
    setChoice(id);
    setError(null);
    try {
      window.localStorage.setItem(CHOICE_KEY, id);
    } catch {
      /* per-session only */
    }
  }, []);

  const transcribe = useCallback(
    (audio: Float32Array, locale: Locale) => request((id) => ({ type: "transcribe", id, audio, locale }), [audio.buffer]),
    [request],
  );

  const feedback = useCallback(
    async (context: string, locale: Locale): Promise<{ text: string; engine: EngineId; model: string }> => {
      if (active === "openrouter") {
        try {
          const text = await openRouterFeedback(openrouter, messages[locale].prompt, context);
          setError(null);
          return { text, engine: "openrouter", model: openrouter.model };
        } catch (e) {
          setError(e instanceof OpenRouterError ? e.code : "other");
          return { text: "", engine: "openrouter", model: openrouter.model };
        }
      }
      if (active === "off") return { text: "", engine: "off", model: "" };
      if (models.llm.state !== "ready" || !activeModel) return { text: "", engine: "browser", model: activeModel?.label ?? browserModel.label };
      // The rules already answered; a slow device must not leave the card "refining" forever.
      const text = await Promise.race([
        request((id) => ({ type: "feedback", id, context, locale })),
        new Promise<string>((resolve) => setTimeout(() => resolve(""), BROWSER_TIMEOUT_MS)),
      ]);
      return { text, engine: "browser", model: activeModel.label };
    },
    [active, openrouter, models.llm.state, request, browserModel.label, activeModel],
  );

  /** The browser model actually in use (may be a smaller fallback); null when none could load. */
  const fellBack = activeModel !== null && activeModel.id !== browserModel.id;
  return { device, models, openrouter, hasKey, choice, active, error, browserModel, activeModel, fellBack, failedModels: failed, choose, chooseBrowserModel, load, loadStt, transcribe, feedback };
}

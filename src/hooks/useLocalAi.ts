"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_BROWSER_MODEL, readBrowserModel, saveBrowserModel, browserModelById, type BrowserModel } from "@/lib/llm/browser-models";
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

  // The browser model is only downloaded while it is the active engine, and
  // released as soon as another engine (or "off") is picked.
  const browserModelId = browserModel.id;
  useEffect(() => {
    if (!booted) return;
    send(active === "browser" ? { type: "loadLlm", model: browserModelId } : { type: "unloadLlm" });
  }, [booted, active, browserModelId, send]);

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
      if (models.llm.state !== "ready") return { text: "", engine: "browser", model: browserModel.label };
      const text = await request((id) => ({ type: "feedback", id, context, locale }));
      return { text, engine: "browser", model: browserModel.label };
    },
    [active, openrouter, models.llm.state, request, browserModel.label],
  );

  return { device, models, openrouter, hasKey, choice, active, error, browserModel, choose, chooseBrowserModel, load, loadStt, transcribe, feedback };
}

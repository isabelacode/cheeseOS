"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_BROWSER_MODEL, readBrowserModel, saveBrowserModel, browserModelById, type BrowserModel } from "@/lib/llm/browser-models";
import { OpenRouterError, openRouterFeedback, useOpenRouterSettings } from "@/lib/llm/openrouter";
import type { AiRequest, AiResponse, ModelKey, ModelState } from "@/workers/protocol";

export interface ModelInfo {
  state: ModelState;
  progress: number;
  error?: string;
}

type Pending = (text: string) => void;

export type EngineId = "openrouter" | "browser";

export const ENGINE_LABEL: Record<EngineId, string> = {
  openrouter: "OpenRouter",
  browser: "Navegador",
};

const CHOICE_KEY = "cheeseos.engine.v1";

function readChoice(): EngineId {
  try {
    return window.localStorage.getItem(CHOICE_KEY) === "browser" ? "browser" : "openrouter";
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
  const [error, setError] = useState<string | null>(null);
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
  const active: EngineId = choice === "openrouter" && hasKey ? "openrouter" : "browser";

  // The browser model is only downloaded once it is actually the active engine.
  const browserModelId = browserModel.id;
  useEffect(() => {
    if (booted && active === "browser") send({ type: "loadLlm", model: browserModelId });
  }, [booted, active, browserModelId, send]);

  const load = useCallback(() => {
    send({ type: "loadStt" });
    setChoice(readChoice());
    setBrowserModel(readBrowserModel());
    setBooted(true);
  }, [send]);

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
    (audio: Float32Array) => request((id) => ({ type: "transcribe", id, audio }), [audio.buffer]),
    [request],
  );

  const feedback = useCallback(
    async (context: string): Promise<{ text: string; engine: string }> => {
      if (active === "openrouter") {
        try {
          const text = await openRouterFeedback(openrouter, context);
          setError(null);
          return { text, engine: `OpenRouter · ${openrouter.model}` };
        } catch (e) {
          setError(e instanceof OpenRouterError ? e.message : "Sem resposta do OpenRouter.");
          return { text: "", engine: "" };
        }
      }
      if (models.llm.state !== "ready") return { text: "", engine: "" };
      const text = await request((id) => ({ type: "feedback", id, context }));
      return { text, engine: `Navegador · ${browserModel.label}` };
    },
    [active, openrouter, models.llm.state, request, browserModel.label],
  );

  return { device, models, openrouter, hasKey, choice, active, error, browserModel, choose, chooseBrowserModel, load, transcribe, feedback };
}

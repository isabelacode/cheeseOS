"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiRequest, AiResponse, ModelKey, ModelState } from "@/workers/protocol";

export interface ModelInfo {
  state: ModelState;
  progress: number;
  error?: string;
}

type Pending = (text: string) => void;

export interface OllamaInfo {
  state: "checking" | "ready" | "unavailable";
  model: string;
  reason?: string;
}

/** Owns the on-device AI worker (Whisper + small LLM). */
export function useLocalAi() {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef(new Map<string, Pending>());
  const [device, setDevice] = useState<"webgpu" | "wasm" | null>(null);
  const [models, setModels] = useState<Record<ModelKey, ModelInfo>>({
    stt: { state: "idle", progress: 0 },
    llm: { state: "idle", progress: 0 },
  });

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
            [msg.model]: { ...m[msg.model], state: msg.state, error: msg.error, progress: msg.state === "ready" ? 1 : m[msg.model].progress },
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

  const [ollama, setOllama] = useState<OllamaInfo>({ state: "checking", model: "" });

  /** Re-checks the habitat Ollama server; falls back to the in-browser LLM. */
  const checkOllama = useCallback(async () => {
    setOllama((o) => ({ ...o, state: "checking" }));
    try {
      const res = await fetch("/api/ollama", { cache: "no-store" });
      const data = (await res.json()) as { available: boolean; model: string; reason?: string };
      setOllama({ state: data.available ? "ready" : "unavailable", model: data.model, reason: data.reason });
      return data.available;
    } catch {
      setOllama({ state: "unavailable", model: "", reason: "offline" });
      return false;
    }
  }, []);

  const load = useCallback(async () => {
    send({ type: "loadStt" });
    if (!(await checkOllama())) send({ type: "loadLlm" });
  }, [send, checkOllama]);

  const request = useCallback(
    (build: (id: string) => AiRequest, transfer: Transferable[] = []) =>
      new Promise<string>((resolve) => {
        const id = crypto.randomUUID();
        pending.current.set(id, resolve);
        send(build(id), transfer);
      }),
    [send],
  );

  const transcribe = useCallback(
    (audio: Float32Array) => request((id) => ({ type: "transcribe", id, audio }), [audio.buffer]),
    [request],
  );

  const browserFeedback = useCallback(
    (context: string) => request((id) => ({ type: "feedback", id, context })),
    [request],
  );

  const feedback = useCallback(
    async (context: string): Promise<{ text: string; engine: string }> => {
      if (ollama.state === "ready") {
        try {
          const res = await fetch("/api/ollama", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ context }),
          });
          if (res.ok) {
            const data = (await res.json()) as { text: string; model: string };
            return { text: data.text, engine: `Ollama · ${data.model}` };
          }
        } catch {
          /* fall through to the in-browser model */
        }
        setOllama((o) => ({ ...o, state: "unavailable", reason: "offline" }));
        send({ type: "loadLlm" });
      }
      if (models.llm.state !== "ready") return { text: "", engine: "" };
      return { text: await browserFeedback(context), engine: "Qwen 2.5 0.5B · navegador" };
    },
    [ollama.state, models.llm.state, browserFeedback, send],
  );

  return { device, models, ollama, load, checkOllama, transcribe, feedback };
}

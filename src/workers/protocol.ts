import type { Locale } from "@/lib/i18n/locale";

export type ModelKey = "stt" | "llm";
export type ModelState = "idle" | "loading" | "ready" | "error";

export type AiRequest =
  | { type: "loadStt" }
  | { type: "loadLlm"; model: string }
  | { type: "unloadLlm" }
  | { type: "transcribe"; id: string; audio: Float32Array; locale: Locale }
  | { type: "feedback"; id: string; context: string; locale: Locale }
  /** Stops an in-flight feedback generation (handled out of queue order). */
  | { type: "cancel"; id: string };

export type AiResponse =
  | { type: "device"; device: "webgpu" | "wasm" }
  /** `id` names the model the status is about (for the LLM, the requested model id). */
  | { type: "status"; model: ModelKey; state: ModelState; error?: string; id?: string }
  | { type: "progress"; model: ModelKey; ratio: number }
  | { type: "transcript"; id: string; text: string }
  | { type: "feedback"; id: string; text: string }
  | { type: "error"; id?: string; error: string };

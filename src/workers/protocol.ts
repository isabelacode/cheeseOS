import type { Locale } from "@/lib/i18n/locale";

export type ModelKey = "stt" | "llm";
export type ModelState = "idle" | "loading" | "ready" | "error";

export type AiRequest =
  | { type: "loadStt" }
  | { type: "loadLlm"; model: string }
  | { type: "transcribe"; id: string; audio: Float32Array; locale: Locale }
  | { type: "feedback"; id: string; context: string; locale: Locale };

export type AiResponse =
  | { type: "device"; device: "webgpu" | "wasm" }
  | { type: "status"; model: ModelKey; state: ModelState; error?: string }
  | { type: "progress"; model: ModelKey; ratio: number }
  | { type: "transcript"; id: string; text: string }
  | { type: "feedback"; id: string; text: string }
  | { type: "error"; id?: string; error: string };

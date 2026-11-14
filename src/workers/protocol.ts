export type ModelKey = "stt" | "llm";
export type ModelState = "idle" | "loading" | "ready" | "error";

export type AiRequest =
  | { type: "loadStt" }
  | { type: "loadLlm" }
  | { type: "transcribe"; id: string; audio: Float32Array }
  | { type: "feedback"; id: string; context: string };

export type AiResponse =
  | { type: "device"; device: "webgpu" | "wasm" }
  | { type: "status"; model: ModelKey; state: ModelState; error?: string }
  | { type: "progress"; model: ModelKey; ratio: number }
  | { type: "transcript"; id: string; text: string }
  | { type: "feedback"; id: string; text: string }
  | { type: "error"; id?: string; error: string };

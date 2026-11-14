/// <reference lib="webworker" />
import {
  env,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
  type TextGenerationPipeline,
} from "@huggingface/transformers";
import type { AiRequest, AiResponse, ModelKey } from "./protocol";
import { MEDICAL_SYSTEM_PROMPT, cleanModelText } from "@/lib/health/prompt";

/**
 * Everything here runs on the astronaut's own device: no request leaves the
 * habitat once the weights are cached. Weights placed under /public/models/
 * are used first, so a fully offline deployment just ships them there.
 */
env.allowLocalModels = true;
env.localModelPath = "/models/";
env.allowRemoteModels = true;

const STT_MODEL = "onnx-community/whisper-base";

const post = (msg: AiResponse) => self.postMessage(msg);

let device: "webgpu" | "wasm" = "wasm";
let deviceReady = false;
let stt: AutomaticSpeechRecognitionPipeline | null = null;
let llm: TextGenerationPipeline | null = null;
let llmId: string | null = null;

async function detectDevice() {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return "wasm" as const;
  try {
    return (await gpu.requestAdapter()) ? ("webgpu" as const) : ("wasm" as const);
  } catch {
    return "wasm" as const;
  }
}

function progress(model: ModelKey) {
  const files = new Map<string, { loaded: number; total: number }>();
  return (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== "progress" || !p.file) return;
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 });
    let loaded = 0;
    let total = 0;
    for (const f of files.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    post({ type: "progress", model, ratio: total ? loaded / total : 0 });
  };
}

async function ensureDevice() {
  if (deviceReady) return;
  device = await detectDevice();
  deviceReady = true;
  post({ type: "device", device });
}

async function loadStt() {
  if (stt) return;
  await ensureDevice();
  post({ type: "status", model: "stt", state: "loading" });
  try {
    stt = (await pipeline("automatic-speech-recognition", STT_MODEL, {
      device,
      dtype: device === "webgpu" ? { encoder_model: "fp32", decoder_model_merged: "q4" } : "q8",
      progress_callback: progress("stt"),
    })) as AutomaticSpeechRecognitionPipeline;
    post({ type: "status", model: "stt", state: "ready" });
  } catch (e) {
    post({ type: "status", model: "stt", state: "error", error: String(e) });
  }
}

/** Used when the visitor has no OpenRouter key or picks on-device processing. */
async function loadLlm(model: string) {
  if (llm && llmId === model) return;
  await ensureDevice();
  if (llm) {
    // Free the previous model's GPU/WASM memory before loading another one.
    await llm.dispose().catch(() => {});
    llm = null;
  }
  llmId = model;
  post({ type: "status", model: "llm", state: "loading" });
  try {
    llm = (await pipeline("text-generation", model, {
      device,
      dtype: device === "webgpu" ? "q4f16" : "q4",
      progress_callback: progress("llm"),
    })) as TextGenerationPipeline;
    post({ type: "status", model: "llm", state: "ready" });
  } catch (e) {
    llmId = null;
    post({ type: "status", model: "llm", state: "error", error: String(e) });
  }
}

/** Whisper's usual inventions on silence or noise. */
const HALLUCINATIONS = [
  /legendas? pela comunidade/i,
  /amara\.org/i,
  /^obrigad[oa]\.?$/i,
  /inscreva-se/i,
  /^tchau\.?$/i,
  /^\[.*\]$/,
  /^\(.*\)$/,
  /^\.+$/,
];

async function transcribe(id: string, audio: Float32Array) {
  if (!stt) return post({ type: "transcript", id, text: "" });
  const out = await stt(audio, { language: "portuguese", task: "transcribe" });
  const text = (Array.isArray(out) ? out[0]?.text : out.text)?.trim() ?? "";
  const clean = HALLUCINATIONS.some((r) => r.test(text)) ? "" : text;
  post({ type: "transcript", id, text: clean });
}

async function feedback(id: string, context: string) {
  if (!llm) return post({ type: "feedback", id, text: "" });
  const out = await llm(
    [
      { role: "system", content: MEDICAL_SYSTEM_PROMPT },
      { role: "user", content: context },
    ],
    { max_new_tokens: 90, do_sample: false },
  );
  const first = Array.isArray(out) ? out[0] : out;
  const generated = (first as { generated_text: unknown }).generated_text;
  const text = Array.isArray(generated)
    ? String((generated.at(-1) as { content?: string })?.content ?? "")
    : String(generated);
  post({ type: "feedback", id, text: cleanModelText(text) });
}

// ONNX sessions are not re-entrant: run one job at a time, in arrival order.
let queue: Promise<void> = Promise.resolve();

async function handle(msg: AiRequest) {
  try {
    if (msg.type === "loadStt") await loadStt();
    else if (msg.type === "loadLlm") await loadLlm(msg.model);
    else if (msg.type === "transcribe") await transcribe(msg.id, msg.audio);
    else if (msg.type === "feedback") await feedback(msg.id, msg.context);
  } catch (e) {
    post({ type: "error", id: "id" in msg ? msg.id : undefined, error: String(e) });
  }
}

self.addEventListener("message", (event: MessageEvent<AiRequest>) => {
  queue = queue.then(() => handle(event.data));
});

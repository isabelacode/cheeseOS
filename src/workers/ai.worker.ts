/// <reference lib="webworker" />
import {
  env,
  InterruptableStoppingCriteria,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
  type TextGenerationPipeline,
} from "@huggingface/transformers";
import type { AiRequest, AiResponse, ModelKey } from "./protocol";
import { cleanModelText } from "@/lib/health/prompt";
import { SPEECH_LANGUAGE, type Locale } from "@/lib/i18n/locale";
import { messages } from "@/lib/i18n/messages";

/**
 * Everything here runs on the astronaut's own device: no request leaves the
 * habitat once the weights are cached. Weights placed under /public/models/
 * are used first, so a fully offline deployment just ships them there.
 */
env.allowLocalModels = true;
env.localModelPath = "/models/";
env.allowRemoteModels = true;

// whisper-small: base garbled too much Portuguese ("door no braço", "dorno pé").
const STT_MODEL = "onnx-community/whisper-small";

const post = (msg: AiResponse) => self.postMessage(msg);

let device: "webgpu" | "wasm" = "wasm";
/** q4f16/fp16 weights need the `shader-f16` WebGPU feature; many GPUs lack it. */
let gpuFp16 = false;
let deviceReady = false;
let stt: AutomaticSpeechRecognitionPipeline | null = null;
let llm: TextGenerationPipeline | null = null;
let llmId: string | null = null;

type GpuAdapter = { features?: { has(name: string): boolean } } | null;

async function detectDevice() {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<GpuAdapter> } }).gpu;
  if (!gpu) return "wasm" as const;
  try {
    const adapter = await gpu.requestAdapter();
    gpuFp16 = Boolean(adapter?.features?.has("shader-f16"));
    return adapter ? ("webgpu" as const) : ("wasm" as const);
  } catch {
    return "wasm" as const;
  }
}

/**
 * Loads on WebGPU first; an adapter can exist and still fail to build the
 * session (driver bugs, out of GPU memory), so retry once on WASM before
 * reporting the model as unusable on this device.
 */
async function withWasmFallback<T>(load: (d: "webgpu" | "wasm") => Promise<T>): Promise<T> {
  if (device !== "webgpu") return load("wasm");
  try {
    return await load("webgpu");
  } catch (e) {
    console.warn("[ai.worker] WebGPU load failed, retrying on WASM", e);
    return load("wasm");
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
    stt = (await withWasmFallback((d) =>
      pipeline("automatic-speech-recognition", STT_MODEL, {
        device: d,
        // q4 weights noticeably garble Whisper's output. On GPU: fp16 where supported,
        // else an fp32 encoder with an 8-bit decoder (~485 MB instead of ~920 MB).
        dtype:
          d === "webgpu"
            ? gpuFp16
              ? { encoder_model: "fp16", decoder_model_merged: "fp16" }
              : { encoder_model: "fp32", decoder_model_merged: "q8" }
            : "q8",
        progress_callback: progress("stt"),
      }),
    )) as AutomaticSpeechRecognitionPipeline;
    post({ type: "status", model: "stt", state: "ready" });
  } catch (e) {
    post({ type: "status", model: "stt", state: "error", error: String(e) });
  }
}

/** Used when the visitor has no OpenRouter key or picks on-device processing. */
async function loadLlm(model: string) {
  // A newer load/unload is already queued: skip this download entirely.
  if (model !== wantedLlm) return;
  if (llm && llmId === model) return;
  await ensureDevice();
  if (llm) {
    // Free the previous model's GPU/WASM memory before loading another one.
    await llm.dispose().catch(() => {});
    llm = null;
  }
  llmId = model;
  post({ type: "status", model: "llm", state: "loading", id: model });
  try {
    llm = (await withWasmFallback((d) =>
      pipeline("text-generation", model, {
        device: d,
        dtype: d === "webgpu" && gpuFp16 ? "q4f16" : "q4",
        progress_callback: progress("llm"),
      }),
    )) as TextGenerationPipeline;
    post({ type: "status", model: "llm", state: "ready", id: model });
  } catch (e) {
    llmId = null;
    post({ type: "status", model: "llm", state: "error", error: String(e), id: model });
  }
}

/** Frees the model's GPU/WASM memory when the crew turns the browser AI off. */
async function unloadLlm() {
  if (llm) await llm.dispose().catch(() => {});
  llm = null;
  llmId = null;
  // Always report idle: after a failed load the UI would otherwise keep "error".
  post({ type: "status", model: "llm", state: "idle" });
}

/** Whisper's usual inventions on silence or noise. */
const HALLUCINATIONS = [
  /legendas? pela comunidade/i,
  /amara\.org/i,
  /^obrigad[oa]\.?$/i,
  /^thank you\.?$/i,
  /thanks for watching/i,
  /subtitles by/i,
  /^you\.?$/i,
  /^bye\.?$/i,
  /inscreva-se/i,
  /^tchau\.?$/i,
  /^\[.*\]$/,
  /^\(.*\)$/,
  /^\.+$/,
  // A lone letter ("o", "é") is a clipped fragment, not a report.
  /^[\p{P}\s]*[\p{L}]?[\p{P}\s]*$/u,
];

async function transcribe(id: string, audio: Float32Array, locale: Locale) {
  if (!stt) return post({ type: "transcript", id, text: "" });
  const out = await stt(audio, { language: SPEECH_LANGUAGE[locale], task: "transcribe" });
  const text = (Array.isArray(out) ? out[0]?.text : out.text)?.trim() ?? "";
  const clean = HALLUCINATIONS.some((r) => r.test(text)) ? "" : text;
  post({ type: "transcript", id, text: clean });
}

async function feedback(id: string, context: string, locale: Locale) {
  if (!llm || cancelled.delete(id)) return post({ type: "feedback", id, text: "" });
  const stop = new InterruptableStoppingCriteria();
  running = { id, stop };
  let out: Awaited<ReturnType<TextGenerationPipeline>>;
  try {
    out = await llm(
      [
        { role: "system", content: messages[locale].prompt },
        { role: "user", content: context },
      ],
      // Greedy decoding with a repetition penalty: small models otherwise loop or echo the report.
      { max_new_tokens: 120, do_sample: false, repetition_penalty: 1.15, stopping_criteria: stop },
    );
  } finally {
    running = null;
  }
  if (stop.interrupted) return post({ type: "feedback", id, text: "" });
  const first = Array.isArray(out) ? out[0] : out;
  const generated = (first as { generated_text: unknown }).generated_text;
  const text = Array.isArray(generated)
    ? String((generated.at(-1) as { content?: string })?.content ?? "")
    : String(generated);
  post({ type: "feedback", id, text: cleanModelText(text) });
}

// ONNX sessions are not re-entrant: run one job at a time, in arrival order.
let queue: Promise<void> = Promise.resolve();
/** The LLM the page wants right now (set on arrival, before queueing). */
let wantedLlm: string | null = null;
/** The generation in progress, so a cancel can interrupt it. */
let running: { id: string; stop: InterruptableStoppingCriteria } | null = null;
/** Feedback ids cancelled before their turn in the queue came. */
const cancelled = new Set<string>();

async function handle(msg: AiRequest) {
  try {
    if (msg.type === "loadStt") await loadStt();
    else if (msg.type === "loadLlm") await loadLlm(msg.model);
    else if (msg.type === "unloadLlm") await unloadLlm();
    else if (msg.type === "transcribe") await transcribe(msg.id, msg.audio, msg.locale);
    else if (msg.type === "feedback") await feedback(msg.id, msg.context, msg.locale);
  } catch (e) {
    post({ type: "error", id: "id" in msg ? msg.id : undefined, error: String(e) });
  }
}

self.addEventListener("message", (event: MessageEvent<AiRequest>) => {
  const msg = event.data;
  if (msg.type === "cancel") {
    // Out of band: the queue is blocked by the very generation being cancelled.
    if (running?.id === msg.id) running.stop.interrupt();
    else cancelled.add(msg.id);
    return;
  }
  if (msg.type === "loadLlm") wantedLlm = msg.model;
  else if (msg.type === "unloadLlm") wantedLlm = null;
  queue = queue.then(() => handle(msg));
});

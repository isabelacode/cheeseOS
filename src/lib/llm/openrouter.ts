import { useSyncExternalStore } from "react";
import { cleanModelText } from "@/lib/health/prompt";

/**
 * Bring-your-own-key OpenRouter access. The key lives only in this browser's
 * localStorage and requests go straight from the browser to OpenRouter, so the
 * public site never sees or stores anyone's key.
 */
/**
 * The only cloud models offered. Each one is OSI open source (Apache 2.0) and
 * made outside China, and requests are pinned to US or EU hosts with no
 * fallback, so OpenRouter never routes a report to a Chinese-owned provider.
 * Both follow the NASA Space Apps 2026 terms.
 */
export interface OpenRouterModel {
  id: string;
  label: string;
  providers: string[];
}

export const OPENROUTER_MODELS: OpenRouterModel[] = [
  { id: "mistralai/mistral-small-3.2-24b-instruct", label: "Mistral Small 3.2 24B (Mistral AI)", providers: ["mistral"] },
  { id: "openai/gpt-oss-120b", label: "gpt-oss-120b (OpenAI)", providers: ["google-vertex", "amazon-bedrock", "groq", "cerebras"] },
  { id: "openai/gpt-oss-20b", label: "gpt-oss-20b (OpenAI)", providers: ["amazon-bedrock", "groq"] },
  { id: "ibm-granite/granite-4.2-8b", label: "Granite 4.2 8B (IBM)", providers: ["coreweave", "deepinfra"] },
];

export const DEFAULT_OPENROUTER_MODEL = OPENROUTER_MODELS[0].id;

/** A saved model outside the approved list (older settings) falls back to the default. */
export function openRouterModelById(id: string | null | undefined): OpenRouterModel {
  return OPENROUTER_MODELS.find((m) => m.id === id?.trim()) ?? OPENROUTER_MODELS[0];
}

export interface OpenRouterSettings {
  apiKey: string;
  model: string;
}

const KEY = "cheeseos.openrouter.v1";
const EMPTY: OpenRouterSettings = { apiKey: "", model: DEFAULT_OPENROUTER_MODEL };
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: OpenRouterSettings = EMPTY;

function read(): OpenRouterSettings {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    /* storage blocked: behave as unset */
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const v = raw ? (JSON.parse(raw) as Partial<OpenRouterSettings>) : {};
    cached = {
      apiKey: typeof v.apiKey === "string" ? v.apiKey : "",
      model: openRouterModelById(typeof v.model === "string" ? v.model : null).id,
    };
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useOpenRouterSettings(): OpenRouterSettings {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function saveOpenRouterSettings(next: OpenRouterSettings) {
  try {
    if (next.apiKey.trim()) {
      window.localStorage.setItem(KEY, JSON.stringify({ apiKey: next.apiKey.trim(), model: openRouterModelById(next.model).id }));
    } else {
      window.localStorage.removeItem(KEY);
    }
  } catch {
    /* storage blocked */
  }
  listeners.forEach((l) => l());
}

export type OpenRouterErrorCode = "auth" | "credits" | "model" | "rate" | "network" | "other";

export class OpenRouterError extends Error {
  constructor(readonly code: OpenRouterErrorCode) {
    super(`OpenRouter error: ${code}`);
  }
}

function statusCode(s: number): OpenRouterErrorCode {
  return s === 401 ? "auth" : s === 402 ? "credits" : s === 400 || s === 404 ? "model" : s === 429 ? "rate" : "other";
}

export async function openRouterFeedback(settings: OpenRouterSettings, systemPrompt: string, context: string): Promise<string> {
  const apiKey = settings.apiKey.trim();
  // A missing key, or one with characters no HTTP header can carry (fetch would
  // throw a TypeError that looks like a network failure), is an auth problem.
  if (!/^[\x21-\x7e]+$/.test(apiKey)) throw new OpenRouterError("auth");
  const model = openRouterModelById(settings.model);
  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "cheeseOS",
    },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: model.id,
      provider: { only: model.providers, allow_fallbacks: false },
      temperature: 0.2,
      max_tokens: 200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context },
      ],
    }),
  });
  } catch {
    throw new OpenRouterError("network");
  }
  if (!res.ok) throw new OpenRouterError(statusCode(res.status));
  let data: { error?: { code?: unknown }; choices?: { message?: { content?: unknown }; error?: { code?: unknown } }[] };
  try {
    data = await res.json();
  } catch {
    // Truncated body, HTML error page, or the timeout firing mid-read.
    throw new OpenRouterError("other");
  }
  // OpenRouter can answer 200 and report an upstream failure in the body.
  const bodyError = data?.error ?? data?.choices?.[0]?.error;
  if (bodyError) throw new OpenRouterError(typeof bodyError.code === "number" ? statusCode(bodyError.code) : "other");
  const content = data?.choices?.[0]?.message?.content;
  return cleanModelText(typeof content === "string" ? content : "");
}

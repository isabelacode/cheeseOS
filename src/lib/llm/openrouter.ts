import { useSyncExternalStore } from "react";
import { MEDICAL_SYSTEM_PROMPT, cleanModelText } from "@/lib/health/prompt";

/**
 * Bring-your-own-key OpenRouter access. The key lives only in this browser's
 * localStorage and requests go straight from the browser to OpenRouter, so the
 * public site never sees or stores anyone's key.
 */
export const DEFAULT_OPENROUTER_MODEL = "google/gemma-3-27b-it";

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
      model: typeof v.model === "string" && v.model.trim() ? v.model.trim() : DEFAULT_OPENROUTER_MODEL,
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
      window.localStorage.setItem(KEY, JSON.stringify({ apiKey: next.apiKey.trim(), model: next.model.trim() || DEFAULT_OPENROUTER_MODEL }));
    } else {
      window.localStorage.removeItem(KEY);
    }
  } catch {
    /* storage blocked */
  }
  listeners.forEach((l) => l());
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function openRouterFeedback(settings: OpenRouterSettings, context: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "cheeseOS",
    },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      max_tokens: 200,
      messages: [
        { role: "system", content: MEDICAL_SYSTEM_PROMPT },
        { role: "user", content: context },
      ],
    }),
  });
  if (!res.ok) {
    const msg =
      res.status === 401
        ? "Chave do OpenRouter inválida."
        : res.status === 402
          ? "Sem créditos no OpenRouter."
          : res.status === 404 || res.status === 400
            ? "Modelo não encontrado no OpenRouter."
            : res.status === 429
              ? "Limite de uso do OpenRouter atingido."
              : `OpenRouter respondeu ${res.status}.`;
    throw new OpenRouterError(msg, res.status);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return cleanModelText(data.choices?.[0]?.message?.content ?? "");
}

import { MEDICAL_SYSTEM_PROMPT, cleanModelText } from "@/lib/health/prompt";

/**
 * Proxy to an Ollama server on the habitat network. Nothing here talks to
 * Earth: OLLAMA_URL points at a machine inside the station.
 */
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma3:4b";

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(1500), cache: "no-store" });
    if (!res.ok) return Response.json({ available: false, model: OLLAMA_MODEL });
    const data = (await res.json()) as { models?: { name: string }[] };
    const names = data.models?.map((m) => m.name) ?? [];
    const installed = names.some((n) => n === OLLAMA_MODEL || n === `${OLLAMA_MODEL}:latest`);
    return Response.json({ available: installed, model: OLLAMA_MODEL, reason: installed ? undefined : "model-missing" });
  } catch {
    return Response.json({ available: false, model: OLLAMA_MODEL, reason: "offline" });
  }
}

export async function POST(request: Request) {
  const { context } = (await request.json()) as { context?: string };
  if (!context || typeof context !== "string" || context.length > 4000) {
    return Response.json({ error: "Contexto inválido." }, { status: 400 });
  }
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        options: { temperature: 0.2, num_predict: 160 },
        messages: [
          { role: "system", content: MEDICAL_SYSTEM_PROMPT },
          { role: "user", content: context },
        ],
      }),
    });
    if (!res.ok) return Response.json({ error: `Ollama respondeu ${res.status}.` }, { status: 502 });
    const data = (await res.json()) as { message?: { content?: string } };
    return Response.json({ text: cleanModelText(data.message?.content ?? ""), model: OLLAMA_MODEL });
  } catch {
    return Response.json({ error: "Ollama indisponível." }, { status: 503 });
  }
}

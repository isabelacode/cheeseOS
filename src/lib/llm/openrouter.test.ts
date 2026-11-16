import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_OPENROUTER_MODEL, OPENROUTER_MODELS, OpenRouterError, openRouterFeedback, openRouterModelById } from "./openrouter";

const settings = { apiKey: "sk-or-v1-abc", model: "m" };
const call = () => openRouterFeedback(settings, "sys", "ctx");
const code = (p: Promise<unknown>) => p.then(() => null, (e) => (e instanceof OpenRouterError ? e.code : `raw:${e}`));
const mockFetch = (impl: () => Promise<Response>) => vi.stubGlobal("fetch", vi.fn(impl));

afterEach(() => vi.unstubAllGlobals());

describe("openRouterFeedback", () => {
  it("returns the model text", async () => {
    mockFetch(async () => Response.json({ choices: [{ message: { content: "Drink water." } }] }));
    await expect(call()).resolves.toBe("Drink water.");
  });

  it("maps HTTP errors", async () => {
    for (const [status, expected] of [[401, "auth"], [402, "credits"], [404, "model"], [429, "rate"], [503, "other"]] as const) {
      mockFetch(async () => new Response("{}", { status }));
      expect(await code(call())).toBe(expected);
    }
  });

  it("maps network failures", async () => {
    mockFetch(async () => Promise.reject(new TypeError("Failed to fetch")));
    expect(await code(call())).toBe("network");
  });

  it("wraps an unparseable body instead of leaking a SyntaxError", async () => {
    mockFetch(async () => new Response("<html>gateway</html>", { status: 200 }));
    expect(await code(call())).toBe("other");
  });

  it("surfaces errors reported inside a 200 body", async () => {
    mockFetch(async () => Response.json({ error: { code: 429, message: "upstream rate limited" } }));
    expect(await code(call())).toBe("rate");
  });

  it("rejects a missing or non-header-safe key as auth without calling fetch", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await code(openRouterFeedback({ apiKey: "  ", model: "m" }, "s", "c"))).toBe("auth");
    expect(await code(openRouterFeedback({ apiKey: "chavé", model: "m" }, "s", "c"))).toBe("auth");
    expect(f).not.toHaveBeenCalled();
  });

  it("only sends approved models, pinned to their hosts with no fallback", async () => {
    const f = vi.fn(async () => Response.json({ choices: [{ message: { content: "ok" } }] }));
    vi.stubGlobal("fetch", f);
    const body = async (model: string) => {
      await openRouterFeedback({ apiKey: "sk-or-v1-abc", model }, "s", "c");
      return JSON.parse((f.mock.lastCall as unknown as [string, RequestInit])[1].body as string);
    };
    expect(await body("openai/gpt-oss-20b")).toMatchObject({
      model: "openai/gpt-oss-20b",
      provider: { only: ["amazon-bedrock", "groq"], allow_fallbacks: false },
    });
    // A model typed in older settings, outside the approved list, is replaced by the default.
    expect(await body("example/unlisted-model")).toMatchObject({ model: DEFAULT_OPENROUTER_MODEL, provider: { only: ["mistral"] } });
  });

  it("offers only Apache 2.0 models from non-Chinese makers", () => {
    expect(OPENROUTER_MODELS.map((m) => m.id.split("/")[0])).toEqual(["mistralai", "openai", "openai", "ibm-granite"]);
    expect(openRouterModelById("example/unlisted-model").id).toBe(DEFAULT_OPENROUTER_MODEL);
  });
});

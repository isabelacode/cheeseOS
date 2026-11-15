import { describe, expect, it } from "vitest";
import { HANGOVER_MS, MAX_UTTERANCE_MS, PREROLL_MS, createVad } from "./vad";
import { normalize } from "./useVoiceListener";

const RATE = 16000;
const FRAME = 160; // 10 ms
const frame = (amp: number) => new Float32Array(FRAME).fill(amp);
const frames = (ms: number, amp: number) => Array.from({ length: ms / 10 }, () => frame(amp));
const samples = (chunks: Float32Array[]) => chunks.reduce((n, c) => n + c.length, 0);

function run(seq: Float32Array[]) {
  const out: Float32Array[][] = [];
  const vad = createVad(RATE, { onUtterance: (c) => out.push(c) });
  seq.forEach((f) => vad(f));
  return out;
}

describe("voice activity detector", () => {
  it("emits an utterance after the hangover, with pre-roll", () => {
    const out = run([...frames(500, 0), ...frames(600, 0.2), ...frames(HANGOVER_MS + 20, 0)]);
    expect(out).toHaveLength(1);
    const ms = (samples(out[0]) / RATE) * 1000;
    expect(ms).toBeGreaterThanOrEqual(600 + HANGOVER_MS);
    expect(ms).toBeLessThanOrEqual(600 + HANGOVER_MS + PREROLL_MS + 10);
  });

  it("drops short blips even though pre-roll and hangover pad them", () => {
    const out = run([...frames(500, 0), ...frames(50, 0.3), ...frames(HANGOVER_MS + 20, 0)]);
    expect(out).toHaveLength(0);
  });

  it("does not prepend stale pre-roll after a max-length split", () => {
    const marker = Math.fround(0.0005); // quiet but distinguishable pre-roll audio
    const out = run([...frames(300, marker), ...frames(MAX_UTTERANCE_MS + 1000, 0.2), ...frames(HANGOVER_MS + 20, 0)]);
    expect(out).toHaveLength(2);
    expect(out[1].some((c) => c[0] === marker)).toBe(false);
    expect(out[1].every((c) => c[0] === Math.fround(0.2) || c[0] === 0)).toBe(true);
  });

  it("reports speaking transitions", () => {
    const states: boolean[] = [];
    const vad = createVad(RATE, { onUtterance: () => {}, onSpeaking: (s) => states.push(s) });
    [...frames(100, 0), ...frames(500, 0.2), ...frames(HANGOVER_MS + 20, 0)].forEach((f) => vad(f));
    expect(states).toEqual([true, false]);
  });

  it("keeps a sentence with a one-second mid-sentence pause as one utterance", () => {
    const out = run([...frames(500, 0), ...frames(700, 0.2), ...frames(1000, 0), ...frames(400, 0.2), ...frames(HANGOVER_MS + 20, 0)]);
    expect(out).toHaveLength(1);
  });
});

describe("normalize", () => {
  it("boosts quiet speech to near full scale and leaves loud or silent audio alone", () => {
    const quiet = new Float32Array([0.05, -0.1, 0.02]);
    expect(Math.max(...normalize(quiet).map(Math.abs))).toBeCloseTo(0.9);
    const loud = new Float32Array([0.95, -0.2]);
    expect(normalize(loud)).toBe(loud);
    const silent = new Float32Array(4);
    expect(normalize(silent)).toBe(silent);
  });

  it("caps the gain so near-silence isn't blown up into loud noise", () => {
    const hiss = new Float32Array([0.001, -0.001]);
    expect(Math.max(...normalize(hiss).map(Math.abs))).toBeCloseTo(0.02);
  });
});

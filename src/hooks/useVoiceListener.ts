"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TARGET_RATE = 16000;
/** Silence needed to close an utterance. */
const HANGOVER_MS = 900;
const MIN_SPEECH_MS = 450;
const MAX_UTTERANCE_MS = 15000;
/** Audio kept before speech onset so the first syllable isn't clipped. */
const PREROLL_MS = 300;

export type MicState = "off" | "requesting" | "listening" | "denied" | "error";

function downsample(input: Float32Array, from: number): Float32Array {
  if (from === TARGET_RATE) return input;
  const ratio = from / TARGET_RATE;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function concat(chunks: Float32Array[]): Float32Array {
  const len = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Float32Array(len);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Always-on microphone with an energy-based voice activity detector.
 * Each finished utterance is handed to `onUtterance` as 16 kHz mono PCM.
 */
export function useVoiceListener(onUtterance: (audio: Float32Array) => void) {
  const [state, setState] = useState<MicState>("off");
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<AudioWorkletNode | null>(null);
  /** Bumped on every start/stop so late frames and pending starts are ignored. */
  const sessionRef = useRef(0);
  const callbackRef = useRef(onUtterance);
  useEffect(() => {
    callbackRef.current = onUtterance;
  }, [onUtterance]);

  const stop = useCallback(() => {
    sessionRef.current++;
    if (nodeRef.current) {
      nodeRef.current.port.onmessage = null;
      nodeRef.current.disconnect();
      nodeRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();
    streamRef.current = null;
    ctxRef.current = null;
    setState("off");
    setSpeaking(false);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (ctxRef.current) return;
    const session = ++sessionRef.current;
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const ctx = new AudioContext();
      await ctx.audioWorklet.addModule("/capture-worklet.js");
      const source = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, "capture-processor");
      source.connect(node);

      // Stopped while the permission prompt or worklet load was pending.
      if (session !== sessionRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        ctx.close();
        return;
      }
      nodeRef.current = node;
      streamRef.current = stream;
      ctxRef.current = ctx;
      setState("listening");

      const rate = ctx.sampleRate;
      const preroll: Float32Array[] = [];
      let prerollSamples = 0;
      let speech: Float32Array[] = [];
      let speechSamples = 0;
      let inSpeech = false;
      let silenceMs = 0;
      let noiseFloor = 0.01;
      let lastLevelUpdate = 0;

      const flush = () => {
        const ms = (speechSamples / rate) * 1000;
        if (ms >= MIN_SPEECH_MS && session === sessionRef.current) callbackRef.current(downsample(concat(speech), rate));
        speech = [];
        speechSamples = 0;
        inSpeech = false;
        silenceMs = 0;
        setSpeaking(false);
      };

      node.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (session !== sessionRef.current) return;
        const frame = e.data;
        let sum = 0;
        for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
        const rms = Math.sqrt(sum / frame.length);
        const frameMs = (frame.length / rate) * 1000;

        // Track ambient noise only while nobody is talking.
        if (!inSpeech) noiseFloor = noiseFloor * 0.995 + rms * 0.005;
        const threshold = Math.max(0.012, noiseFloor * 3);
        const voiced = rms > threshold;

        const now = performance.now();
        if (now - lastLevelUpdate > 60) {
          lastLevelUpdate = now;
          setLevel(Math.min(1, rms / 0.12));
        }

        if (inSpeech) {
          speech.push(frame);
          speechSamples += frame.length;
          silenceMs = voiced ? 0 : silenceMs + frameMs;
          const durMs = (speechSamples / rate) * 1000;
          if (silenceMs >= HANGOVER_MS || durMs >= MAX_UTTERANCE_MS) flush();
        } else if (voiced) {
          inSpeech = true;
          setSpeaking(true);
          speech = [...preroll, frame];
          speechSamples = prerollSamples + frame.length;
        } else {
          preroll.push(frame);
          prerollSamples += frame.length;
          while (prerollSamples > (PREROLL_MS / 1000) * rate && preroll.length) {
            prerollSamples -= preroll.shift()!.length;
          }
        }
      };
    } catch (err) {
      if (session !== sessionRef.current) return;
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      setState(denied ? "denied" : "error");
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { state, level, speaking, start, stop };
}

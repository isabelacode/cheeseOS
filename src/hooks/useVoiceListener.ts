"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createVad } from "./vad";

const TARGET_RATE = 16000;

export type MicState = "off" | "requesting" | "listening" | "denied" | "error";

function downsample(input: Float32Array, from: number): Float32Array {
  if (from === TARGET_RATE) return input;
  const ratio = from / TARGET_RATE;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    // max(): below 16 kHz (ratio < 1) a window could be empty and yield silence.
    const end = Math.min(input.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

/**
 * Scales the utterance so its peak sits near full scale. Whisper does much
 * worse on quiet input, and the mic gain varies a lot between devices.
 */
export function normalize(audio: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < audio.length; i++) peak = Math.max(peak, Math.abs(audio[i]));
  if (peak < 1e-4 || peak >= 0.9) return audio;
  const gain = Math.min(0.9 / peak, 20);
  const out = new Float32Array(audio.length);
  for (let i = 0; i < audio.length; i++) out[i] = audio[i] * gain;
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
    streamRef.current?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    ctxRef.current?.close().catch(() => {});
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
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    // Release the mic and audio graph of an attempt that won't become the live session.
    const discard = () => {
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
    };
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === "undefined") {
        throw new Error("Microphone capture is not supported in this browser");
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      // Let the browser resample the mic to Whisper's 16 kHz: it low-pass filters
      // properly, unlike averaging samples, which aliases and garbles speech.
      // Firefox can't connect a mic to a context at a different rate, so fall back.
      try {
        ctx = new AudioContext({ sampleRate: TARGET_RATE });
        ctx.createMediaStreamSource(stream).disconnect();
      } catch {
        await ctx?.close().catch(() => {});
        ctx = new AudioContext();
      }
      await ctx.audioWorklet.addModule("/capture-worklet.js");
      // Created after an await, the context may start suspended (autoplay policy): no frames would ever arrive.
      if (ctx.state === "suspended") await ctx.resume().catch(() => {});
      const source = ctx.createMediaStreamSource(stream);
      const node = new AudioWorkletNode(ctx, "capture-processor");
      source.connect(node);

      // Stopped while the permission prompt or worklet load was pending.
      if (session !== sessionRef.current) {
        discard();
        return;
      }
      nodeRef.current = node;
      streamRef.current = stream;
      ctxRef.current = ctx;
      setState("listening");

      // Mic unplugged or permission revoked mid-session: don't sit in "listening" forever.
      for (const track of stream.getAudioTracks()) {
        track.onended = () => {
          if (session !== sessionRef.current) return;
          stop();
          setState("error");
        };
      }

      const rate = ctx.sampleRate;
      let lastLevelUpdate = 0;
      const vad = createVad(rate, {
        onUtterance: (chunks) => {
          if (session === sessionRef.current) callbackRef.current(normalize(downsample(concat(chunks), rate)));
        },
        onSpeaking: setSpeaking,
      });

      node.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (session !== sessionRef.current) return;
        const rms = vad(e.data);
        const now = performance.now();
        if (now - lastLevelUpdate > 60) {
          lastLevelUpdate = now;
          setLevel(Math.min(1, rms / 0.12));
        }
      };
    } catch (err) {
      discard();
      if (session !== sessionRef.current) return;
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      setState(denied ? "denied" : "error");
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { state, level, speaking, start, stop };
}

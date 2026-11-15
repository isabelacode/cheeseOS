/**
 * Silence needed to close an utterance. Long enough that a natural pause
 * mid-sentence ("estou com dor... no pé") doesn't split it in two.
 */
export const HANGOVER_MS = 1300;
/**
 * Voiced span (onset to last voiced frame) an utterance needs; shorter blips
 * (clicks, a cough, a door) are dropped instead of being sent to Whisper.
 */
export const MIN_SPEECH_MS = 350;
export const MAX_UTTERANCE_MS = 15000;
/** Audio kept before speech onset so the first syllable isn't clipped. */
export const PREROLL_MS = 300;

export interface VadHandlers {
  onUtterance: (chunks: Float32Array[]) => void;
  onSpeaking?: (speaking: boolean) => void;
}

/**
 * Energy-based voice activity detector. Feed it raw frames at `rate` Hz; each
 * finished utterance is handed over as the list of frames it is made of.
 * Returns the frame handler plus the frame's RMS for level meters.
 */
export function createVad(rate: number, { onUtterance, onSpeaking }: VadHandlers) {
  const prerollMax = (PREROLL_MS / 1000) * rate;
  let preroll: Float32Array[] = [];
  let prerollSamples = 0;
  let speech: Float32Array[] = [];
  let speechSamples = 0;
  /** Samples from speech onset up to the end of the last voiced frame. */
  let voicedSpan = 0;
  let inSpeech = false;
  let silenceMs = 0;
  let noiseFloor = 0.01;

  const flush = () => {
    if ((voicedSpan / rate) * 1000 >= MIN_SPEECH_MS) onUtterance(speech);
    speech = [];
    speechSamples = 0;
    voicedSpan = 0;
    inSpeech = false;
    silenceMs = 0;
    onSpeaking?.(false);
  };

  return (frame: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
    const rms = frame.length ? Math.sqrt(sum / frame.length) : 0;
    const frameMs = (frame.length / rate) * 1000;

    // Track ambient noise only while nobody is talking.
    if (!inSpeech) noiseFloor = noiseFloor * 0.995 + rms * 0.005;
    const threshold = Math.max(0.012, noiseFloor * 3);
    const voiced = rms > threshold;

    if (inSpeech) {
      speech.push(frame);
      speechSamples += frame.length;
      silenceMs = voiced ? 0 : silenceMs + frameMs;
      if (voiced) voicedSpan = speechSamples - prerollSamples;
      const durMs = (speechSamples / rate) * 1000;
      if (silenceMs >= HANGOVER_MS || durMs >= MAX_UTTERANCE_MS) {
        flush();
        // The pre-roll belonged to this utterance; never prepend it to the next one.
        preroll = [];
        prerollSamples = 0;
      }
    } else if (voiced) {
      inSpeech = true;
      onSpeaking?.(true);
      speech = [...preroll, frame];
      speechSamples = prerollSamples + frame.length;
      voicedSpan = frame.length;
    } else {
      preroll.push(frame);
      prerollSamples += frame.length;
      while (prerollSamples > prerollMax && preroll.length) {
        prerollSamples -= preroll.shift()!.length;
      }
    }
    return rms;
  };
}

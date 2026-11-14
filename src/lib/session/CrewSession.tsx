"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { extractSymptoms, mergeFindings } from "@/lib/health/symptoms";
import { BASELINE, overallSeverity, regionSeverity, statusOf, stepVitals, targetVitals } from "@/lib/health/vitals";
import type { Finding, Region, Severity, Status, SymptomId, TranscriptEntry, Vitals } from "@/lib/health/types";
import { useLocalAi } from "@/hooks/useLocalAi";
import { useVoiceListener } from "@/hooks/useVoiceListener";
import { profileContext, type CrewProfile } from "@/lib/crew/profile";
import { formatNumber, messages, useLocale, type Locale } from "@/lib/i18n";

/** Samples in the live (1 Hz) window. */
export const LIVE_WINDOW = 60;
/** One trend point every TREND_STEP live samples, kept for TREND_POINTS points (1 h). */
export const TREND_STEP = 10;
export const TREND_POINTS = 360;

export type TrendPoint = Vitals & { at: number };

/** text null = the instant rule-based advice, rendered in the current language. */
export interface Feedback {
  text: string | null;
  engine: string | null;
  pending: boolean;
  /** Status computed by the rules when the AI was asked; lets the UI flag escalation. */
  status: Status | null;
}

interface Stream {
  current: Vitals;
  history: Vitals[];
  trend: TrendPoint[];
  tick: number;
}

interface Snapshot {
  findings: Finding[];
  entries: TranscriptEntry[];
}

/** Corrections that can be taken back. Reports themselves are not undoable (delete them in the log). */
export interface UndoAction {
  /** Changes on every correction so the undo bar restarts its timer. */
  key: number;
  kind: "resolve" | "dismiss" | "delete" | "clear";
  symptom: SymptomId | null;
  /** dismiss: reports tagged; delete: entries removed; clear: entries cleared. */
  count: number;
}

interface UndoStep {
  action: UndoAction;
  snapshot: Snapshot;
}

const STORE_KEY = "cheeseos.session.v1";
const MAX_ENTRIES = 200;

function readStore(): Snapshot | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    return { findings: parsed.findings ?? [], entries: parsed.entries ?? [] };
  } catch {
    return null;
  }
}

function writeStore(s: Snapshot) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: the session lives in memory only */
  }
}

function buildContext(locale: Locale, profile: CrewProfile, text: string, findings: Finding[], v: Vitals, status: Status) {
  const t = messages[locale];
  const c = t.context;
  const list = findings.length
    ? findings.map((f) => `- ${t.symptoms[f.id].label} (${t.severity[f.severity].toLowerCase()})`).join("\n")
    : `- ${c.none}`;
  return [
    profileContext(profile, locale),
    c.speech(text),
    `${c.activeSymptoms}\n${list}`,
    c.vitals({
      hr: Math.round(v.heartRate),
      spo2: Math.round(v.spo2),
      temp: formatNumber(v.temperature, 1, locale),
      rr: Math.round(v.respiration),
      sys: Math.round(v.systolic),
      dia: Math.round(v.diastolic),
    }),
    c.overall(t.status[status].label),
    c.instruction,
  ].join("\n");
}

function useCrewSessionState(profile: CrewProfile) {
  const ai = useLocalAi();
  const locale = useLocale();
  const baseline = useMemo<Vitals>(() => ({ ...BASELINE, heartRate: profile.restingHeartRate }), [profile.restingHeartRate]);

  // The provider only mounts on the client (CrewApp waits for the stored profile),
  // so the saved session can be read synchronously on first render.
  const [saved] = useState(readStore);
  const [findings, setFindings] = useState<Finding[]>(() => saved?.findings ?? []);
  const [entries, setEntries] = useState<TranscriptEntry[]>(() => saved?.entries ?? []);
  const [stream, setStream] = useState<Stream>(() => ({
    current: baseline,
    history: [baseline],
    trend: [{ ...baseline, at: Date.now() }],
    tick: 0,
  }));
  const [feedback, setFeedback] = useState<Feedback>({ text: null, engine: null, pending: false, status: null });
  const [transcribing, setTranscribing] = useState(0);
  const [undoStack, setUndoStack] = useState<UndoStep[]>([]);
  const undoRef = useRef<UndoStep[]>([]);
  const vitals = stream.current;

  // Refs let async callbacks (AI, mic) read the latest values without re-subscribing.
  const findingsRef = useRef(findings);
  const entriesRef = useRef(entries);
  const vitalsRef = useRef(vitals);
  const baselineRef = useRef(baseline);
  const profileRef = useRef(profile);
  const localeRef = useRef(locale);
  useEffect(() => {
    findingsRef.current = findings;
    entriesRef.current = entries;
    vitalsRef.current = vitals;
    baselineRef.current = baseline;
    profileRef.current = profile;
    localeRef.current = locale;
  });

  useEffect(() => {
    writeStore({ findings, entries });
  }, [findings, entries]);

  // Biometric simulation: 1 Hz, easing toward what the symptoms imply.
  useEffect(() => {
    const id = setInterval(() => {
      setStream((s) => {
        const next = stepVitals(s.current, targetVitals(findingsRef.current, baselineRef.current));
        const tick = s.tick + 1;
        return {
          current: next,
          history: [...s.history, next].slice(-LIVE_WINDOW),
          trend: tick % TREND_STEP === 0 ? [...s.trend, { ...next, at: Date.now() }].slice(-TREND_POINTS) : s.trend,
          tick,
        };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /** Write findings + log (refs first, so async callbacks see the new state). */
  const apply = useCallback((nextFindings: Finding[], nextEntries: TranscriptEntry[]) => {
    findingsRef.current = nextFindings;
    entriesRef.current = nextEntries;
    setFindings(nextFindings);
    setEntries(nextEntries);
  }, []);

  /** A correction the crew member may want to take back: keep it on the undo stack. */
  const correct = useCallback(
    (action: Omit<UndoAction, "key">, nextFindings: Finding[], nextEntries: TranscriptEntry[]) => {
      const step: UndoStep = {
        action: { ...action, key: Date.now() },
        snapshot: { findings: findingsRef.current, entries: entriesRef.current },
      };
      undoRef.current = [...undoRef.current, step].slice(-10);
      setUndoStack(undoRef.current);
      apply(nextFindings, nextEntries);
    },
    [apply],
  );

  const feedbackFn = ai.feedback;
  const report = useCallback(
    async (raw: string, source: TranscriptEntry["source"]) => {
      const text = raw.trim();
      if (!text) return;
      const lang = localeRef.current;
      const ex = extractSymptoms(text, lang);
      const next = mergeFindings(findingsRef.current, ex);
      const entry: TranscriptEntry = {
        id: crypto.randomUUID(),
        text,
        at: Date.now(),
        source,
        findings: ex.findings.map((f) => f.id),
        resolved: ex.resolved,
      };
      apply(next, [entry, ...entriesRef.current].slice(0, MAX_ENTRIES));
      const status = statusOf(overallSeverity(next, vitalsRef.current));
      setFeedback({ text: null, engine: null, pending: true, status });
      const res = await feedbackFn(buildContext(lang, profileRef.current, text, next, vitalsRef.current, status), lang);
      const engine = `${res.engine === "openrouter" ? "OpenRouter" : messages[lang].engine.browserLabel} · ${res.model}`;
      setFeedback((f) => (res.text ? { text: res.text, engine, pending: false, status } : { ...f, pending: false }));
    },
    [feedbackFn, apply],
  );

  /** The crew member says the symptom is gone: drop it and log the improvement. */
  const resolveFinding = useCallback(
    (id: SymptomId) => {
      const entry: TranscriptEntry = { id: crypto.randomUUID(), text: "", at: Date.now(), source: "action", findings: [], resolved: [id] };
      correct(
        { kind: "resolve", symptom: id, count: 0 },
        findingsRef.current.filter((f) => f.id !== id),
        [entry, ...entriesRef.current].slice(0, MAX_ENTRIES),
      );
    },
    [correct],
  );

  /**
   * Misrecognized symptom: drop it and log the correction. Past reports are
   * never rewritten; only the reports behind the current finding (since the
   * symptom was last closed) are tagged, and the log records the correction.
   */
  const dismissFinding = useCallback(
    (id: SymptomId) => {
      const log = entriesRef.current; // newest first
      const closedAt = log.find((e) => e.resolved.includes(id) || e.dismissed?.includes(id))?.at ?? 0;
      let count = 0;
      const tagged = log.map((e) => {
        if (e.at <= closedAt || e.source === "action" || !e.findings.includes(id) || e.dismissed?.includes(id)) return e;
        count++;
        return { ...e, dismissed: [...(e.dismissed ?? []), id] };
      });
      const entry: TranscriptEntry = { id: crypto.randomUUID(), text: "", at: Date.now(), source: "action", findings: [], resolved: [], dismissed: [id] };
      correct(
        { kind: "dismiss", symptom: id, count },
        findingsRef.current.filter((f) => f.id !== id),
        [entry, ...tagged].slice(0, MAX_ENTRIES),
      );
    },
    [correct],
  );

  /** Remove a log entry and any active symptom that only that entry produced. */
  const deleteEntry = useCallback(
    (entryId: string) => {
      const entry = entriesRef.current.find((e) => e.id === entryId);
      if (!entry) return;
      const rest = entriesRef.current.filter((e) => e.id !== entryId);
      const stillReported = new Set(rest.flatMap((e) => e.findings));
      correct(
        { kind: "delete", symptom: null, count: 1 },
        findingsRef.current.filter((f) => !entry.findings.includes(f.id) || stillReported.has(f.id)),
        rest,
      );
    },
    [correct],
  );

  const undo = useCallback(() => {
    const last = undoRef.current.at(-1);
    if (!last) return;
    undoRef.current = undoRef.current.slice(0, -1);
    setUndoStack(undoRef.current);
    apply(last.snapshot.findings, last.snapshot.entries);
  }, [apply]);

  const clearSession = useCallback(() => {
    correct({ kind: "clear", symptom: null, count: entriesRef.current.length }, [], []);
    setFeedback({ text: null, engine: null, pending: false, status: null });
  }, [correct]);

  const transcribe = ai.transcribe;
  const onUtterance = useCallback(
    async (audio: Float32Array) => {
      setTranscribing((n) => n + 1);
      try {
        const text = await transcribe(audio, localeRef.current);
        // Listening was turned off while this utterance waited in the queue: drop it.
        if (text && liveRef.current) await report(text, "voice");
      } finally {
        setTranscribing((n) => n - 1);
      }
    },
    [transcribe, report],
  );

  const mic = useVoiceListener(onUtterance);
  const live = mic.state === "listening";
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  }, [live]);
  const loadStt = ai.loadStt;
  const toggleMic = useCallback(() => {
    if (live) return mic.stop();
    loadStt();
    mic.start();
  }, [live, mic, loadStt]);

  // Restore the saved AI choices; models load only when they are needed.
  const loadAi = ai.load;
  useEffect(() => {
    loadAi();
  }, [loadAi]);

  const severity: Severity = overallSeverity(findings, vitals);
  const status = statusOf(severity);
  const regions = useMemo<Record<Region, Severity>>(() => regionSeverity(findings), [findings]);

  return {
    profile,
    ai,
    mic,
    live,
    toggleMic,
    transcribing: transcribing > 0,
    vitals,
    /** Last LIVE_WINDOW seconds, oldest first. */
    history: stream.history,
    /** Up to an hour of 10 s samples, oldest first. */
    trend: stream.trend,
    findings,
    entries,
    feedback,
    severity,
    status,
    regions,
    report,
    resolveFinding,
    dismissFinding,
    deleteEntry,
    undo,
    canUndo: undoStack.length > 0,
    /** The correction the next undo() reverts; drives the global undo bar. */
    lastAction: undoStack.at(-1)?.action ?? null,
    clearSession,
  };
}

export type CrewSession = ReturnType<typeof useCrewSessionState>;

const Ctx = createContext<CrewSession | null>(null);

/**
 * Lives in the root layout so the vitals simulation, the microphone and the AI
 * keep running across routes (pages are hidden, not kept running, on navigation).
 */
export function CrewSessionProvider({ profile, children }: { profile: CrewProfile; children: ReactNode }) {
  const session = useCrewSessionState(profile);
  return <Ctx.Provider value={session}>{children}</Ctx.Provider>;
}

export function useCrewSession(): CrewSession {
  const s = useContext(Ctx);
  if (!s) throw new Error("useCrewSession must be used inside CrewSessionProvider");
  return s;
}

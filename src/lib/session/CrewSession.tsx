"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { extractSymptoms, mergeFindings } from "@/lib/health/symptoms";
import { adviceOf } from "@/lib/health/advice";
import { BASELINE, DEMO_SPEED, kickVitals, overallSeverity, RECOVERY_SPAN, regionSeverity, statusOf, stepVitals, targetVitals, type Recovery } from "@/lib/health/vitals";
import { safetyAlerts, type SafetyAlert } from "@/lib/health/safety";
import { reviewAiText, type AiVerdict } from "@/lib/health/prompt";
import { hazardsOf, scienceMessages } from "@/lib/science/nasa";
import { setMission } from "@/lib/routine/routine";
import { readDemoMode, useDemoMode } from "@/lib/demo";
import type { Finding, Region, Severity, Status, SymptomId, TranscriptEntry, Vitals } from "@/lib/health/types";
import { useLocalAi } from "@/hooks/useLocalAi";
import { useVoiceListener } from "@/hooks/useVoiceListener";
import { profileContext, type CrewProfile } from "@/lib/crew/profile";
import { readStore, writeStore, type Snapshot } from "@/lib/session/store";
import { formatNumber, messages, useLocale, type Locale } from "@/lib/i18n";
import { alertCopy } from "@/lib/i18n/pages/safety";

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
  /** Set when an AI answer was dropped for naming an allergen. Echo answers are hidden silently. */
  dropped: Extract<AiVerdict, "allergen"> | null;
}

/** Safety alerts raise the status: a possible severe reaction is critical, a conflict needs attention. */
export function safetySeverity(alerts: SafetyAlert[]): Severity {
  let s: Severity = 0;
  for (const a of alerts) {
    if (a.kind === "reaction") s = Math.max(s, a.level) as Severity;
    else if (a.level === 3) s = Math.max(s, 2) as Severity;
  }
  return s;
}

interface Stream {
  current: Vitals;
  history: Vitals[];
  trend: TrendPoint[];
  tick: number;
  /** Some vitals are still easing back after a symptom was marked "gone". */
  recovering: boolean;
}

/** Corrections that can be taken back. Reports themselves are not undoable (delete them in the log). */
export interface UndoAction {
  /** Changes on every correction so the undo bar restarts its timer. */
  key: number;
  kind: "resolve" | "dismiss" | "delete" | "clear" | "alert";
  symptom: SymptomId | null;
  /** dismiss: reports tagged; delete: entries removed; clear: entries cleared. */
  count: number;
}

interface UndoStep {
  action: UndoAction;
  snapshot: Snapshot;
}

const MAX_ENTRIES = 200;

function buildContext(locale: Locale, profile: CrewProfile, text: string, findings: Finding[], v: Vitals, status: Status, alerts: SafetyAlert[]) {
  const t = messages[locale];
  const c = t.context;
  const sci = scienceMessages[locale];
  const hazards = [...new Set(findings.flatMap((f) => hazardsOf(f)))].map((h) => sci.hazards[h].name);
  const protocol = findings.slice(0, 4).map((f) => `- ${t.symptoms[f.id].label}: ${adviceOf(f, t)}`);
  const safety = alerts.slice(0, 3).map((a) => `- ${alertCopy(a, t, locale).head}`);
  const list = findings.length
    ? findings
        .map((f) => `- ${t.symptoms[f.id].label} (${t.severity[f.severity].toLowerCase()})${f.redFlag ? `: ${adviceOf(f, t)}` : ""}`)
        .join("\n")
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
    ...(protocol.length ? [c.protocol, ...protocol] : []),
    ...(hazards.length ? [c.hazards(hazards.join(", "))] : []),
    ...(safety.length ? [c.safety, ...safety] : []),
    ...(profile.allergies.trim() ? [c.avoid(profile.allergies.trim())] : []),
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
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => saved?.dismissedAlerts ?? []);
  const demo = useDemoMode();
  const [stream, setStream] = useState<Stream>(() => ({
    current: baseline,
    history: [baseline],
    trend: [{ ...baseline, at: Date.now() }],
    tick: 0,
    recovering: false,
  }));
  const [feedback, setFeedback] = useState<Feedback>({ text: null, engine: null, pending: false, status: null, dropped: null });
  const [transcribing, setTranscribing] = useState(0);
  const [undoStack, setUndoStack] = useState<UndoStep[]>([]);
  const undoRef = useRef<UndoStep[]>([]);
  const undoKeyRef = useRef(0);
  /** Bumped per AI request; an answer that arrives after a newer report (or a clear) is ignored. */
  const requestRef = useRef(0);
  const vitals = stream.current;

  // Refs let async callbacks (AI, mic) read the latest values without re-subscribing.
  const findingsRef = useRef(findings);
  const entriesRef = useRef(entries);
  const dismissedRef = useRef(dismissedAlerts);
  const vitalsRef = useRef(vitals);
  const baselineRef = useRef(baseline);
  const profileRef = useRef(profile);
  const localeRef = useRef(locale);
  /** Symptoms marked "gone" whose effect on the simulated vitals is still fading. */
  const recoveringRef = useRef<Recovery[]>([]);
  useEffect(() => {
    findingsRef.current = findings;
    entriesRef.current = entries;
    dismissedRef.current = dismissedAlerts;
    vitalsRef.current = vitals;
    baselineRef.current = baseline;
    profileRef.current = profile;
    localeRef.current = locale;
  });

  useEffect(() => {
    writeStore({ findings, entries, dismissedAlerts });
  }, [findings, entries, dismissedAlerts]);

  // Biometric simulation: 1 Hz, easing toward what the symptoms imply.
  useEffect(() => {
    const id = setInterval(() => {
      setStream((s) => {
        const now = Date.now();
        recoveringRef.current = recoveringRef.current.filter((r) => now - r.resolvedAt < RECOVERY_SPAN);
        // Read on every tick so toggling demo mode applies at once.
        const fast = readDemoMode();
        const scale = fast ? DEMO_SPEED.recoveryScale : 1;
        const next = stepVitals(s.current, targetVitals(findingsRef.current, baselineRef.current, recoveringRef.current, now, scale), fast);
        const tick = s.tick + 1;
        return {
          current: next,
          history: [...s.history, next].slice(-LIVE_WINDOW),
          trend: tick % TREND_STEP === 0 ? [...s.trend, { ...next, at: Date.now() }].slice(-TREND_POINTS) : s.trend,
          tick,
          recovering: recoveringRef.current.some((r) => !findingsRef.current.some((f) => f.id === r.finding.id) && now - r.resolvedAt < 5 * 60_000),
        };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /** Write findings + log (refs first, so async callbacks see the new state). */
  const apply = useCallback((nextFindings: Finding[], nextEntries: TranscriptEntry[], nextDismissed: string[] = dismissedRef.current) => {
    findingsRef.current = nextFindings;
    entriesRef.current = nextEntries;
    dismissedRef.current = nextDismissed;
    setFindings(nextFindings);
    setEntries(nextEntries);
    setDismissedAlerts(nextDismissed);
  }, []);

  /** A correction the crew member may want to take back: keep it on the undo stack. */
  const correct = useCallback(
    (action: Omit<UndoAction, "key">, nextFindings: Finding[], nextEntries: TranscriptEntry[], nextDismissed?: string[]) => {
      const step: UndoStep = {
        // Strictly increasing, even for two corrections in the same millisecond.
        action: { ...action, key: (undoKeyRef.current = Math.max(Date.now(), undoKeyRef.current + 1)) },
        snapshot: { findings: findingsRef.current, entries: entriesRef.current, dismissedAlerts: dismissedRef.current },
      };
      undoRef.current = [...undoRef.current, step].slice(-10);
      setUndoStack(undoRef.current);
      apply(nextFindings, nextEntries, nextDismissed);
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
      const nextEntries = [entry, ...entriesRef.current].slice(0, MAX_ENTRIES);
      // Undo snapshots predate this report: restoring one would silently erase it.
      if (undoRef.current.length) {
        undoRef.current = [];
        setUndoStack([]);
      }
      apply(next, nextEntries);
      if (source !== "action") setMission("checkin", true, entry.at);

      // The twin reacts in the same second: a reported fever shows at once.
      const fast = readDemoMode();
      const kicked = kickVitals(
        vitalsRef.current,
        targetVitals(next, baselineRef.current, recoveringRef.current, Date.now(), fast ? DEMO_SPEED.recoveryScale : 1),
        fast,
      );
      vitalsRef.current = kicked;
      setStream((s) => ({ ...s, current: kicked, history: [...s.history.slice(0, -1), kicked] }));

      const t = messages[lang];
      const alerts = safetyAlerts({
        allergies: profileRef.current.allergies,
        medications: profileRef.current.medications,
        entries: nextEntries,
        findings: next,
        adviceFor: (f) => adviceOf(f, t),
      }).filter((a) => !dismissedRef.current.includes(a.key));
      const status = statusOf(Math.max(overallSeverity(next, kicked), safetySeverity(alerts)) as Severity);
      const request = ++requestRef.current;
      setFeedback({ text: null, engine: null, pending: true, status, dropped: null });
      const res = await feedbackFn(buildContext(lang, profileRef.current, text, next, kicked, status, alerts), lang);
      if (request !== requestRef.current) return;
      const engine = `${res.engine === "openrouter" ? "OpenRouter" : t.engine.browserLabel} · ${res.model}`;
      // Answers that only restate the report are hidden; ones naming an allergen are dropped with a note.
      const review = res.text ? reviewAiText(res.text, text, profileRef.current.allergies) : null;
      setFeedback(
        review?.verdict === "ok"
          ? { text: review.text, engine, pending: false, status, dropped: null }
          : { text: null, engine, pending: false, status, dropped: review?.verdict === "allergen" ? "allergen" : null },
      );
    },
    [feedbackFn, apply],
  );

  /** The crew member says the symptom is gone: drop it and log the improvement. */
  const resolveFinding = useCallback(
    (id: SymptomId) => {
      const entry: TranscriptEntry = { id: crypto.randomUUID(), text: "", at: Date.now(), source: "action", findings: [], resolved: [id] };
      // Its effect on the simulated vitals fades over minutes instead of vanishing.
      const gone = findingsRef.current.find((f) => f.id === id);
      if (gone) recoveringRef.current = [...recoveringRef.current.filter((r) => r.finding.id !== id), { finding: gone, resolvedAt: entry.at }];
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
        // Deleting the log line of a dismissal brings the alert back.
        entry.alertKey ? dismissedRef.current.filter((k) => k !== entry.alertKey) : undefined,
      );
    },
    [correct],
  );

  const undo = useCallback(() => {
    const last = undoRef.current.at(-1);
    if (!last) return;
    undoRef.current = undoRef.current.slice(0, -1);
    setUndoStack(undoRef.current);
    apply(last.snapshot.findings, last.snapshot.entries, last.snapshot.dismissedAlerts);
  }, [apply]);

  /** The crew member acknowledged a safety alert: hide it and log the decision. */
  const dismissAlert = useCallback(
    (key: string, headline: string) => {
      if (dismissedRef.current.includes(key)) return;
      const entry: TranscriptEntry = { id: crypto.randomUUID(), text: "", at: Date.now(), source: "action", findings: [], resolved: [], alertKey: key, alert: headline };
      correct({ kind: "alert", symptom: null, count: 0 }, findingsRef.current, [entry, ...entriesRef.current].slice(0, MAX_ENTRIES), [...dismissedRef.current, key]);
    },
    [correct],
  );

  const clearSession = useCallback(() => {
    correct({ kind: "clear", symptom: null, count: entriesRef.current.length }, [], [], []);
    requestRef.current++;
    setFeedback({ text: null, engine: null, pending: false, status: null, dropped: null });
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

  const safety = useMemo(
    () =>
      safetyAlerts({
        allergies: profile.allergies,
        medications: profile.medications,
        entries,
        findings,
        adviceFor: (f) => adviceOf(f, messages[locale]),
      }).filter((a) => !dismissedAlerts.includes(a.key)),
    [profile.allergies, profile.medications, entries, findings, locale, dismissedAlerts],
  );
  const severity: Severity = Math.max(overallSeverity(findings, vitals), safetySeverity(safety)) as Severity;
  const recovering = stream.recovering;
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
    /** Allergy conflicts found by the local rules, most severe first. */
    safety,
    dismissAlert,
    /** Demo mode: simulated vitals move in seconds (Settings toggle). */
    demo,
    /** True while the simulated vitals ease back after a symptom was marked "gone". */
    recovering,
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

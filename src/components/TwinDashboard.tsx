"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gauge,
  HeartPulse,
  LayoutGrid,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  PersonStanding,
  UserRoundPen,
  RefreshCw,
  Send,
  Server,
  ShieldAlert,
  Thermometer,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { extractSymptoms, mergeFindings } from "@/lib/health/symptoms";
import {
  BASELINE,
  STATUS_COPY,
  VITAL_SPECS,
  overallSeverity,
  regionSeverity,
  statusOf,
  stepVitals,
  targetVitals,
  type VitalSpec,
} from "@/lib/health/vitals";
import type { Finding, Region, Severity, Status, TranscriptEntry, Vitals } from "@/lib/health/types";
import { REGION_LABEL } from "@/lib/health/types";
import { useLocalAi, type ModelInfo, type OllamaInfo } from "@/hooks/useLocalAi";
import { useVoiceListener, type MicState } from "@/hooks/useVoiceListener";
import { firstName, profileContext, type CrewProfile } from "@/lib/crew/profile";

const TwinScene = dynamic(() => import("./twin/TwinScene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-3">Montando o gêmeo digital…</div>,
});

const HISTORY = 60;

const EXAMPLES = [
  "Estou com dor de cabeça e um pouco de enjoo.",
  "Sinto um aperto forte no peito e falta de ar.",
  "Meu braço esquerdo está formigando.",
  "A dor de cabeça passou, estou bem.",
];

const SEVERITY_WORD: Record<Severity, string> = { 0: "Normal", 1: "Leve", 2: "Atenção", 3: "Crítico" };

const SEVERITY_CHIP: Record<Severity, string> = {
  0: "text-ok bg-ok-soft",
  1: "text-mild bg-mild-soft",
  2: "text-warn bg-warn-soft",
  3: "text-crit bg-crit-soft",
};

/** Fill for value blocks and chart marks: blue when in range, like the rest of the UI. */
const SEVERITY_FILL: Record<Severity, string> = { 0: "#1462ff", 1: "#1462ff", 2: "#e07b2e", 3: "#d63b3b" };

const STATUS_STYLE: Record<Status, { tile: string; text: string; Icon: LucideIcon }> = {
  nominal: { tile: "bg-ok-soft text-ok", text: "text-ok", Icon: CheckCircle2 },
  attention: { tile: "bg-warn-soft text-warn", text: "text-warn", Icon: AlertTriangle },
  critical: { tile: "bg-crit-soft text-crit", text: "text-crit", Icon: ShieldAlert },
};

const VITAL_ICON: Record<keyof Vitals, LucideIcon> = {
  heartRate: HeartPulse,
  spo2: Wind,
  temperature: Thermometer,
  respiration: Activity,
  systolic: Gauge,
  diastolic: Gauge,
};

/** Chart scale per vital. */
const CHART_RANGE: Partial<Record<keyof Vitals, [number, number]>> = {
  temperature: [35.5, 39.5],
  systolic: [80, 170],
  respiration: [8, 30],
  spo2: [86, 100],
};

const spec = (key: keyof Vitals) => VITAL_SPECS.find((s) => s.key === key)!;

function formatVital(s: VitalSpec, v: Vitals) {
  return s.format ? s.format(v) : v[s.key].toFixed(s.digits).replace(".", ",");
}

function timeOf(ms: number) {
  return new Date(ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function buildContext(profile: CrewProfile, text: string, findings: Finding[], v: Vitals, status: Status) {
  const list = findings.length
    ? findings.map((f) => `- ${f.label} (${SEVERITY_WORD[f.severity].toLowerCase()})`).join("\n")
    : "- nenhum";
  return [
    profileContext(profile),
    `Fala do tripulante: "${text}"`,
    `Sintomas ativos:\n${list}`,
    `Sinais vitais: FC ${Math.round(v.heartRate)} bpm, SpO₂ ${Math.round(v.spo2)}%, temperatura ${v.temperature.toFixed(1)} °C, respiração ${Math.round(v.respiration)} rpm, PA ${Math.round(v.systolic)}/${Math.round(v.diastolic)} mmHg.`,
    `Estado geral: ${STATUS_COPY[status].label}.`,
    "Dê o feedback imediato ao tripulante.",
  ].join("\n");
}

function quickAdvice(findings: Finding[]): string {
  if (!findings.length) return "Nenhum sintoma ativo. Continue contando como você está se sentindo.";
  return `${findings[0].label}: ${findings[0].advice}`;
}

interface Feedback {
  text: string;
  engine: string;
  pending: boolean;
}

interface Stream {
  current: Vitals;
  history: Vitals[];
}

export function TwinDashboard({ profile, onEditProfile }: { profile: CrewProfile; onEditProfile: () => void }) {
  const ai = useLocalAi();
  const baseline = useMemo<Vitals>(() => ({ ...BASELINE, heartRate: profile.restingHeartRate }), [profile.restingHeartRate]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [stream, setStream] = useState<Stream>(() => ({ current: baseline, history: Array<Vitals>(HISTORY).fill(baseline) }));
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [feedback, setFeedback] = useState<Feedback>({ text: quickAdvice([]), engine: "Regras locais", pending: false });
  const [selected, setSelected] = useState<Region | null>(null);
  const [hovered, setHovered] = useState<Region | null>(null);
  const [transcribing, setTranscribing] = useState(0);
  const [draft, setDraft] = useState("");
  const vitals = stream.current;

  const findingsRef = useRef(findings);
  const baselineRef = useRef(baseline);
  const profileRef = useRef(profile);
  useEffect(() => {
    baselineRef.current = baseline;
    profileRef.current = profile;
  }, [baseline, profile]);
  const vitalsRef = useRef(vitals);
  useEffect(() => {
    findingsRef.current = findings;
  }, [findings]);
  useEffect(() => {
    vitalsRef.current = vitals;
  }, [vitals]);

  // Biometric simulation: 1 Hz, easing toward what the symptoms imply.
  useEffect(() => {
    const id = setInterval(() => {
      setStream((s) => {
        const next = stepVitals(s.current, targetVitals(findingsRef.current, baselineRef.current));
        return { current: next, history: [...s.history, next].slice(-HISTORY) };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const feedbackFn = ai.feedback;
  const handleText = useCallback(
    async (raw: string, source: TranscriptEntry["source"]) => {
      const text = raw.trim();
      if (!text) return;
      const ex = extractSymptoms(text);
      const next = mergeFindings(findingsRef.current, ex);
      findingsRef.current = next;
      setFindings(next);
      setEntries((list) =>
        [
          { id: crypto.randomUUID(), text, at: Date.now(), source, findings: ex.findings.map((f) => f.label), resolved: ex.resolved },
          ...list,
        ].slice(0, 50),
      );
      const status = statusOf(overallSeverity(next, vitalsRef.current));
      setFeedback({ text: quickAdvice(next), engine: "Regras locais", pending: true });
      const res = await feedbackFn(buildContext(profileRef.current, text, next, vitalsRef.current, status));
      setFeedback((f) => (res.text ? { text: res.text, engine: res.engine, pending: false } : { ...f, pending: false }));
    },
    [feedbackFn],
  );

  const transcribe = ai.transcribe;
  const onUtterance = useCallback(
    async (audio: Float32Array) => {
      setTranscribing((n) => n + 1);
      try {
        const text = await transcribe(audio);
        if (text) await handleText(text, "voice");
      } finally {
        setTranscribing((n) => n - 1);
      }
    },
    [transcribe, handleText],
  );

  const mic = useVoiceListener(onUtterance);

  // Warm the on-device models right away so the first report is fast.
  const loadAi = ai.load;
  useEffect(() => {
    loadAi();
  }, [loadAi]);

  const status = statusOf(overallSeverity(findings, vitals));
  const regions = useMemo(() => regionSeverity(findings), [findings]);
  const labels = useMemo(() => {
    const out: Partial<Record<Region, string>> = {};
    for (const f of [...findings].reverse()) for (const r of f.regions) out[r] = f.label;
    // A whole-body symptom would label every limb; keep a single tag on the torso.
    for (const f of findings) {
      if (f.regions.length > 3) for (const r of f.regions) if (r !== "torso" && out[r] === f.label) delete out[r];
    }
    return out;
  }, [findings]);

  const focus = selected ?? hovered;
  const focusFindings = focus ? findings.filter((f) => f.regions.includes(focus)) : [];
  const live = mic.state === "listening";

  return (
    <div className="flex min-h-screen gap-4 p-3 sm:p-4 lg:h-screen lg:gap-6 lg:p-6">
      <Rail onEditProfile={onEditProfile} />

      <div className="flex min-w-0 flex-1 flex-col gap-5 lg:min-h-0">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Olá, {firstName(profile)}</h1>
            <p className="text-sm text-ink-2">
              {[profile.role, profile.mission, `${profile.age} anos`, profile.bloodType].filter(Boolean).join(" · ")}
            </p>
            <EngineStatus device={ai.device} stt={ai.models.stt} llm={ai.models.llm} ollama={ai.ollama} onRetry={ai.checkOllama} />
          </div>
          <button
            type="button"
            onClick={live ? mic.stop : mic.start}
            disabled={mic.state === "requesting"}
            aria-pressed={live}
            className={`flex items-center gap-2.5 rounded-full py-2 pr-5 pl-2 text-sm font-semibold shadow-card transition-colors duration-200 disabled:opacity-60 ${
              live ? "bg-accent text-white hover:bg-accent-ink" : "bg-surface text-ink hover:bg-sunken"
            }`}
          >
            <span className={`grid size-9 place-items-center rounded-full ${live ? "mic-live bg-white/20" : "bg-accent-soft text-accent"}`}>
              {live ? <Mic className="size-[18px]" aria-hidden /> : <MicOff className="size-[18px]" aria-hidden />}
            </span>
            {live ? "Escuta ligada" : "Ligar escuta contínua"}
          </button>
        </header>

        <main className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6">
          {/* Data column */}
          <div className="flex min-w-0 flex-col gap-5 lg:min-h-0 lg:overflow-y-auto lg:px-1 lg:pb-2">
            <StatusCard status={status} feedback={feedback} findings={findings} />

            <section id="sinais" aria-label="Sinais vitais" className="grid gap-4 sm:grid-cols-3">
              {(["temperature", "systolic", "respiration"] as const).map((k) => (
                <VitalCard key={k} spec={spec(k)} vitals={vitals} history={stream.history} />
              ))}
            </section>

            <HeartRateCard history={stream.history} vitals={vitals} />

            <VoiceCard
              micState={mic.state}
              level={mic.level}
              speaking={mic.speaking}
              transcribing={transcribing > 0}
              stt={ai.models.stt}
              entries={entries}
              draft={draft}
              setDraft={setDraft}
              onSubmit={(t) => {
                handleText(t, "typed");
                setDraft("");
              }}
            />
          </div>

          {/* Body column */}
          <section
            id="corpo"
            aria-label="Corpo do tripulante"
            className="relative min-h-[620px] overflow-hidden rounded-[28px] bg-[radial-gradient(120%_80%_at_50%_35%,#f7f8fb_0%,#e3e8f0_70%,#dbe1ea_100%)] shadow-card lg:min-h-0"
          >
            <div className="absolute inset-0">
              <TwinScene
                severity={regions}
                labels={labels}
                selected={selected}
                hovered={hovered}
                onSelect={setSelected}
                onHover={setHovered}
                respiration={vitals.respiration}
              />
            </div>

            <div className="pointer-events-none absolute top-4 left-4 max-w-[260px]">
              <div className="pointer-events-auto rounded-2xl bg-surface/90 px-4 py-3 shadow-card backdrop-blur-sm" aria-live="polite">
                {focus ? (
                  <>
                    <p className="text-sm font-semibold">{REGION_LABEL[focus]}</p>
                    {focusFindings.length ? (
                      <ul className="mt-1.5 space-y-1.5">
                        {focusFindings.map((f) => (
                          <li key={f.id} className="text-xs text-ink-2">
                            <span className={`mr-1.5 rounded-md px-1.5 py-0.5 font-semibold ${SEVERITY_CHIP[f.severity]}`}>{SEVERITY_WORD[f.severity]}</span>
                            {f.label}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-0.5 text-xs text-ink-2">Sem queixas registradas.</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold">Corpo</p>
                    <p className="mt-0.5 text-xs text-ink-2">Toque num ponto para ver a região. Arraste para girar.</p>
                  </>
                )}
              </div>
            </div>

            <OxygenCard vitals={vitals} history={stream.history} />
          </section>
        </main>
      </div>
    </div>
  );
}

/* ---------- Shell ---------- */

function Rail({ onEditProfile }: { onEditProfile: () => void }) {
  const items: [string, string, LucideIcon][] = [
    ["#topo", "Visão geral", LayoutGrid],
    ["#sinais", "Sinais vitais", HeartPulse],
    ["#relatos", "Relatos", MessageCircle],
    ["#corpo", "Corpo", PersonStanding],
  ];
  return (
    <nav id="topo" aria-label="Seções" className="hidden w-14 shrink-0 flex-col items-center sm:flex">
      <span className="grid size-12 place-items-center rounded-2xl bg-surface shadow-card" role="img" aria-label="cheeseOS">
        <span className="flex items-start text-xl leading-none font-bold tracking-tight">
          c<span className="-mt-1 ml-px text-sm text-accent">+</span>
        </span>
      </span>
      <div className="my-auto flex flex-col gap-2.5">
        {items.map(([href, label, Icon], i) => (
          <a
            key={href}
            href={href}
            title={label}
            aria-label={label}
            className={`grid size-11 place-items-center rounded-full shadow-card transition-colors duration-200 ${
              i === 0 ? "bg-accent text-white" : "bg-surface text-ink-2 hover:text-accent"
            }`}
          >
            <Icon className="size-[18px]" aria-hidden />
          </a>
        ))}
      </div>
      <button
        type="button"
        onClick={onEditProfile}
        title="Editar dados do tripulante"
        aria-label="Editar dados do tripulante"
        className="grid size-11 place-items-center rounded-full bg-surface text-ink-2 shadow-card transition-colors duration-200 hover:text-accent"
      >
        <UserRoundPen className="size-[18px]" aria-hidden />
      </button>
    </nav>
  );
}

function EngineStatus({
  device,
  stt,
  llm,
  ollama,
  onRetry,
}: {
  device: "webgpu" | "wasm" | null;
  stt: ModelInfo;
  llm: ModelInfo;
  ollama: OllamaInfo;
  onRetry: () => void;
}) {
  const sttText =
    stt.state === "ready" ? "pronto" : stt.state === "loading" ? `${Math.round(stt.progress * 100)}%` : stt.state === "error" ? "falhou" : "aguardando";
  let llmText: string;
  let LlmIcon: LucideIcon = Server;
  if (ollama.state === "ready") llmText = `Ollama · ${ollama.model}`;
  else if (ollama.state === "checking") llmText = "procurando Ollama…";
  else {
    LlmIcon = Cpu;
    llmText =
      llm.state === "ready"
        ? "Qwen 0.5B no navegador"
        : llm.state === "loading"
          ? `Qwen 0.5B ${Math.round(llm.progress * 100)}%`
          : llm.state === "error"
            ? "IA local indisponível"
            : "Ollama não encontrado";
  }
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2">
      <span className="flex items-center gap-1.5">
        <Mic className="size-3.5" aria-hidden /> Whisper {sttText}
        {device && <span className="text-ink-3">· {device === "webgpu" ? "GPU" : "CPU"}</span>}
      </span>
      <span className="flex items-center gap-1.5">
        <LlmIcon className="size-3.5" aria-hidden /> {llmText}
        {ollama.state === "unavailable" && (
          <button type="button" onClick={onRetry} className="rounded p-0.5 hover:bg-surface" aria-label="Procurar Ollama de novo">
            <RefreshCw className="size-3" aria-hidden />
          </button>
        )}
      </span>
      <span className="font-semibold text-accent">Processamento 100% local</span>
    </p>
  );
}

function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section {...rest} className={`rounded-3xl bg-surface p-4 shadow-card sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <span className="size-1.5 rounded-full bg-accent" aria-hidden />
        {children}
      </h2>
      {aside && <span className="text-xs text-ink-3">{aside}</span>}
    </div>
  );
}

/* ---------- Health ---------- */

function StatusCard({ status, feedback, findings }: { status: Status; feedback: Feedback; findings: Finding[] }) {
  const style = STATUS_STYLE[status];
  const copy = STATUS_COPY[status];
  return (
    <Card aria-label="Estado de saúde">
      <div className="flex items-start gap-4">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl transition-colors duration-500 ${style.tile}`}>
          <style.Icon className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5">
            <span className={`text-xl font-bold ${style.text}`}>{copy.label}</span>
            <span className="text-sm text-ink-2">{copy.summary}</span>
          </div>
          <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-ink" aria-live="polite">
            {feedback.text}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-3">
            {feedback.pending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> Refinando orientação com a IA local…
              </>
            ) : (
              <>Fonte: {feedback.engine}</>
            )}
          </p>
        </div>
      </div>
      {findings.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {findings.map((f) => (
            <li key={f.id} className="rounded-2xl bg-sunken px-3.5 py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{f.label}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${SEVERITY_CHIP[f.severity]}`}>{SEVERITY_WORD[f.severity]}</span>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-ink-2">{f.advice}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Thin vertical bars, one per sample; the latest ones carry the status colour. */
function Bars({ values, min, max, color, height = 56 }: { values: number[]; min: number; max: number; color: string; height?: number }) {
  const w = 100 / HISTORY;
  const offset = HISTORY - values.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      {values.map((v, i) => {
        const t = Math.min(1, Math.max(0, (v - min) / (max - min)));
        const h = 6 + t * (height - 10);
        const recent = i >= values.length - 8;
        return (
          <rect key={i} x={(offset + i) * w + w * 0.3} y={height - h} width={w * 0.4} height={h} rx={w * 0.2} fill={recent ? color : "#cfd4dc"} />
        );
      })}
    </svg>
  );
}

function VitalCard({ spec: s, vitals, history }: { spec: VitalSpec; vitals: Vitals; history: Vitals[] }) {
  const sev = s.assess(vitals);
  const Icon = VITAL_ICON[s.key];
  const [min, max] = CHART_RANGE[s.key] ?? [0, 100];
  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-surface p-3 shadow-card" aria-label={s.label}>
      <div className="flex items-center gap-3 px-1 pt-1">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${sev >= 2 ? "bg-warn-soft text-warn" : "bg-sunken text-ink-2"}`}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{s.label}</p>
          <p className="tabular text-xs text-ink-3">Faixa {s.range}</p>
        </div>
      </div>
      <div className="flex h-[76px] items-stretch gap-2 rounded-2xl bg-sunken p-2">
        <div className="min-w-0 flex-1 py-1">
          <Bars values={history.map((h) => h[s.key])} min={min} max={max} color={SEVERITY_FILL[sev]} />
        </div>
        <div
          className="tabular flex min-w-[66px] flex-col items-center justify-center rounded-xl px-2 text-white transition-colors duration-500"
          style={{ background: SEVERITY_FILL[sev] }}
        >
          <span className="text-base leading-none font-bold">{formatVital(s, vitals)}</span>
          <span className="mt-1 text-[11px] opacity-90">{s.unit}</span>
        </div>
      </div>
    </section>
  );
}

function HeartRateCard({ history, vitals }: { history: Vitals[]; vitals: Vitals }) {
  const s = spec("heartRate");
  const sev = s.assess(vitals);
  const values = history.map((h) => h.heartRate);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const ticks = [140, 110, 80, 50];
  const height = 150;
  const toY = (v: number) => height - ((v - 40) / (150 - 40)) * height;
  const w = 100 / HISTORY;
  const offset = HISTORY - values.length;
  return (
    <Card aria-label="Frequência cardíaca">
      <SectionTitle aside="últimos 60 s">Frequência cardíaca</SectionTitle>
      <div className="flex items-end justify-center gap-8">
        <div className="text-center">
          <p className="tabular text-4xl font-bold tracking-tight" style={{ color: sev >= 2 ? SEVERITY_FILL[sev] : undefined }}>
            {Math.round(vitals.heartRate)}
          </p>
          <p className="text-xs text-ink-3">bpm agora</p>
        </div>
        <div className="text-center">
          <p className="tabular text-xl font-semibold text-ink-2">{Math.round(avg)}</p>
          <p className="text-xs text-ink-3">média</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[28px_minmax(0,1fr)] gap-2">
        <div className="tabular relative text-[11px] text-ink-3" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: toY(t) }}>
              {t}
            </span>
          ))}
        </div>
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ height }} className="w-full" aria-hidden>
          {ticks.map((t) => (
            <line key={t} x1="0" x2="100" y1={toY(t)} y2={toY(t)} stroke="#eef0f3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {values.map((v, i) => {
            const vs = s.assess({ ...vitals, heartRate: v });
            const span = 14 + (i % 3) * 4;
            const fill = vs >= 2 ? SEVERITY_FILL[vs] : i % 2 ? "#1462ff" : "#c9cfd8";
            return <rect key={i} x={(offset + i) * w + w * 0.32} y={toY(v) - span / 2} width={w * 0.36} height={span} rx={w * 0.18} fill={fill} />;
          })}
        </svg>
      </div>
      <div className="tabular mt-1 grid grid-cols-[28px_minmax(0,1fr)] gap-2 text-[11px] text-ink-3">
        <span />
        <div className="flex justify-between">
          <span>−60 s</span>
          <span>−30 s</span>
          <span>agora</span>
        </div>
      </div>
    </Card>
  );
}

function OxygenCard({ vitals, history }: { vitals: Vitals; history: Vitals[] }) {
  const s = spec("spo2");
  const sev = s.assess(vitals);
  const [min, max] = CHART_RANGE.spo2!;
  return (
    <div className="absolute right-4 bottom-4 w-[200px] rounded-2xl bg-surface/95 p-3.5 shadow-card backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent">
          <Wind className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-xs text-ink-3">Saturação O₂</p>
          <p className="tabular text-sm font-bold" style={{ color: sev >= 2 ? SEVERITY_FILL[sev] : undefined }}>
            {formatVital(s, vitals)}%
          </p>
        </div>
      </div>
      <div className="mt-2 h-12">
        <Bars values={history.map((h) => h.spo2)} min={min} max={max} color={SEVERITY_FILL[sev]} height={48} />
      </div>
    </div>
  );
}

/* ---------- Voice ---------- */

function VoiceCard(props: {
  micState: MicState;
  level: number;
  speaking: boolean;
  transcribing: boolean;
  stt: ModelInfo;
  entries: TranscriptEntry[];
  draft: string;
  setDraft: (v: string) => void;
  onSubmit: (t: string) => void;
}) {
  const { micState, level, speaking, transcribing, stt, entries, draft, setDraft } = props;
  const live = micState === "listening";

  let stateText = "Escuta desligada. Ligue no botão acima ou digite abaixo.";
  if (micState === "requesting") stateText = "Pedindo acesso ao microfone…";
  else if (micState === "denied") stateText = "Microfone bloqueado. Libere o acesso nas permissões do navegador.";
  else if (micState === "error") stateText = "Não foi possível abrir o microfone.";
  else if (live && stt.state === "loading") stateText = `Carregando reconhecimento de voz… ${Math.round(stt.progress * 100)}%`;
  else if (live && stt.state === "error") stateText = "O reconhecimento de voz falhou ao carregar. Use o campo de texto.";
  else if (live && transcribing) stateText = "Transcrevendo…";
  else if (live && speaking) stateText = "Ouvindo você…";
  else if (live) stateText = "Escutando. Fale como está se sentindo.";

  return (
    <Card id="relatos" aria-label="Relatos">
      <SectionTitle>Relatos</SectionTitle>
      <div className="flex items-center gap-3 rounded-2xl bg-sunken px-3.5 py-2.5">
        <span className={`size-2 shrink-0 rounded-full ${live ? (speaking ? "bg-accent" : "bg-ok") : "bg-ink-3/40"}`} aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm text-ink-2" aria-live="polite">
          {stateText}
        </p>
        <div className="flex h-5 items-end gap-0.5" aria-hidden>
          {[0.55, 0.85, 1, 0.75, 0.5].map((k, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-accent transition-[height] duration-75"
              style={{ height: `${live ? Math.max(15, Math.min(100, level * 140 * k)) : 15}%` }}
            />
          ))}
        </div>
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) props.onSubmit(draft);
        }}
      >
        <label htmlFor="report" className="sr-only">
          Descreva o que está sentindo
        </label>
        <input
          id="report"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ou digite: estou com tontura…"
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-ink disabled:opacity-40"
        >
          <Send className="size-4" aria-hidden /> Enviar
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => props.onSubmit(ex)}
            className="rounded-full bg-sunken px-3 py-1.5 text-xs text-ink-2 transition-colors hover:bg-accent-soft hover:text-accent-ink"
          >
            {ex}
          </button>
        ))}
      </div>

      <ol className="mt-4 space-y-2" aria-label="Histórico de relatos">
        {entries.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-ink-3">
            Os relatos aparecem aqui, com os sintomas reconhecidos em cada fala.
          </li>
        ) : (
          entries.map((e) => (
            <li key={e.id} className="entry-in rounded-2xl bg-sunken px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-ink">“{e.text}”</p>
                <span className="tabular shrink-0 text-xs text-ink-3">
                  {e.source === "voice" ? "voz" : "texto"} · {timeOf(e.at)}
                </span>
              </div>
              {(e.findings.length > 0 || e.resolved.length > 0) && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {e.findings.map((f) => (
                    <span key={f} className="rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent-ink">
                      {f}
                    </span>
                  ))}
                  {e.resolved.length > 0 && <span className="rounded-md bg-ok-soft px-1.5 py-0.5 text-xs font-medium text-ok">melhora relatada</span>}
                </div>
              )}
            </li>
          ))
        )}
      </ol>
    </Card>
  );
}

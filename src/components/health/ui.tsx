"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Activity, AlertTriangle, CheckCircle2, Gauge, HeartPulse, ShieldAlert, Thermometer, Wind, type LucideIcon } from "lucide-react";
import { VITAL_SPECS, type VitalSpec } from "@/lib/health/vitals";
import { adviceOf } from "@/lib/health/advice";
import type { Finding, Severity, Status, Vitals } from "@/lib/health/types";
import { formatNumber, INTL_LOCALE, useLocale, useT, type Locale, type Messages } from "@/lib/i18n";

import { LIVE_WINDOW as HISTORY } from "@/lib/session/CrewSession";

export const SEVERITY_CHIP: Record<Severity, string> = {
  0: "text-ok bg-ok-soft",
  1: "text-mild bg-mild-soft",
  2: "text-warn bg-warn-soft",
  3: "text-crit bg-crit-soft",
};

/** Fill for value blocks and chart marks: navy when in range, like the rest of the UI. */
export const SEVERITY_FILL: Record<Severity, string> = { 0: "#16294a", 1: "#16294a", 2: "#e07b2e", 3: "#d63b3b" };

export const STATUS_STYLE: Record<Status, { tile: string; text: string; Icon: LucideIcon }> = {
  nominal: { tile: "bg-ok-soft text-ok", text: "text-ok", Icon: CheckCircle2 },
  attention: { tile: "bg-warn-soft text-warn", text: "text-warn", Icon: AlertTriangle },
  critical: { tile: "bg-crit-soft text-crit", text: "text-crit", Icon: ShieldAlert },
};

export const VITAL_ICON: Record<keyof Vitals, LucideIcon> = {
  heartRate: HeartPulse,
  spo2: Wind,
  temperature: Thermometer,
  respiration: Activity,
  systolic: Gauge,
  diastolic: Gauge,
};

/** Chart scale per vital. */
export const CHART_RANGE: Partial<Record<keyof Vitals, [number, number]>> = {
  temperature: [35.5, 39.5],
  systolic: [80, 170],
  respiration: [8, 30],
  spo2: [86, 100],
};

export const spec = (key: keyof Vitals) => VITAL_SPECS.find((s) => s.key === key)!;

export function formatVital(s: VitalSpec, v: Vitals, locale: Locale) {
  return s.format ? s.format(v) : formatNumber(v[s.key], s.digits, locale);
}

export function timeOf(ms: number, locale: Locale) {
  return new Date(ms).toLocaleTimeString(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export { adviceOf };

export function quickAdvice(findings: Finding[], t: Messages): string {
  if (!findings.length) return t.dashboard.noSymptoms;
  return `${t.symptoms[findings[0].id].label}: ${adviceOf(findings[0], t)}`;
}


export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLElement>) {
  return (
    <section {...rest} className={`rounded-3xl bg-surface p-4 shadow-card sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-base font-bold">{children}</h2>
      {aside && <span className="text-xs text-ink-3">{aside}</span>}
    </div>
  );
}

/** Thin vertical bars, one per sample; the latest ones carry the status colour. */
export function Bars({ values, min, max, color, height = 56 }: { values: number[]; min: number; max: number; color: string; height?: number }) {
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

export function VitalCard({ spec: s, vitals, history }: { spec: VitalSpec; vitals: Vitals; history: Vitals[] }) {
  const sev = s.assess(vitals);
  const Icon = VITAL_ICON[s.key];
  const [min, max] = CHART_RANGE[s.key] ?? [0, 100];
  const t = useT();
  const locale = useLocale();
  const copy = t.vitals[s.key];
  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-surface p-3 shadow-card" aria-label={copy.label}>
      <div className="flex items-center gap-3 px-1 pt-1">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${sev >= 2 ? "bg-warn-soft text-warn" : "bg-sunken text-ink-2"}`}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] leading-tight font-semibold">{copy.label}</p>
          <p className="tabular text-xs text-ink-3">{t.dashboard.range(copy.range)}</p>
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
          <span className="text-base leading-none font-bold">{formatVital(s, vitals, locale)}</span>
          <span className="mt-1 text-[11px] font-semibold">{s.unit}</span>
        </div>
      </div>
    </section>
  );
}

export function HeartRateCard({ history, vitals }: { history: Vitals[]; vitals: Vitals }) {
  const s = spec("heartRate");
  const sev = s.assess(vitals);
  const values = history.map((h) => h.heartRate);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : vitals.heartRate;
  const ticks = [140, 110, 80, 50];
  const height = 150;
  const toY = (v: number) => height - ((v - 40) / (150 - 40)) * height;
  const w = 100 / HISTORY;
  const offset = HISTORY - values.length;
  const d = useT().dashboard;
  return (
    <Card aria-label={d.heartRate}>
      <SectionTitle aside={d.last60}>{d.heartRate}</SectionTitle>
      <div className="flex items-end justify-center gap-8">
        <div className="text-center">
          <p className="tabular text-4xl font-bold tracking-tight" style={{ color: sev >= 2 ? SEVERITY_FILL[sev] : undefined }}>
            {Math.round(vitals.heartRate)}
          </p>
          <p className="text-xs text-ink-3">{d.bpmNow}</p>
        </div>
        <div className="text-center">
          <p className="tabular text-xl font-semibold text-ink-2">{Math.round(avg)}</p>
          <p className="text-xs text-ink-3">{d.average}</p>
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
            const span = 14;
            const fill = SEVERITY_FILL[vs];
            return <rect key={i} x={(offset + i) * w + w * 0.32} y={toY(v) - span / 2} width={w * 0.36} height={span} rx={w * 0.18} fill={fill} />;
          })}
        </svg>
      </div>
      <div className="tabular mt-1 grid grid-cols-[28px_minmax(0,1fr)] gap-2 text-[11px] text-ink-3">
        <span />
        <div className="flex justify-between">
          <span>−60 s</span>
          <span>−30 s</span>
          <span>{d.now}</span>
        </div>
      </div>
    </Card>
  );
}

export function OxygenCard({ vitals, history }: { vitals: Vitals; history: Vitals[] }) {
  const s = spec("spo2");
  const sev = s.assess(vitals);
  const [min, max] = CHART_RANGE.spo2!;
  const t = useT();
  const locale = useLocale();
  return (
    <div className="absolute right-4 bottom-4 w-[200px] rounded-2xl bg-surface/95 p-3.5 shadow-card backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent">
          <Wind className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-xs text-ink-3">{t.vitals.spo2.label}</p>
          <p className="tabular text-sm font-bold" style={{ color: sev >= 2 ? SEVERITY_FILL[sev] : undefined }}>
            {formatVital(s, vitals, locale)}%
          </p>
        </div>
      </div>
      <div className="mt-2 h-12">
        <Bars values={history.map((h) => h.spo2)} min={min} max={max} color={SEVERITY_FILL[sev]} height={48} />
      </div>
    </div>
  );
}


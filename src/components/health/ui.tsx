"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Activity, AlertTriangle, Check, CheckCircle2, Gauge, HeartPulse, Loader2, ShieldAlert, Sparkles, Thermometer, Undo2, Wind, X, type LucideIcon } from "lucide-react";
import { VITAL_SPECS, type VitalSpec } from "@/lib/health/vitals";
import { adviceOf } from "@/lib/health/advice";
import type { Finding, Severity, Status, SymptomId, Vitals } from "@/lib/health/types";
import { formatNumber, INTL_LOCALE, useLocale, useT, type Locale, type Messages } from "@/lib/i18n";

import { nowMessages } from "@/lib/i18n/pages/now";
import { soundsMoreUrgent } from "@/lib/text/urgency";
import { SafeMarkdown } from "@/components/now/SafeMarkdown";
import type { Feedback } from "@/lib/session/CrewSession";
import { LIVE_WINDOW as HISTORY } from "@/lib/session/CrewSession";

export const SEVERITY_CHIP: Record<Severity, string> = {
  0: "text-ok bg-ok-soft",
  1: "text-mild bg-mild-soft",
  2: "text-warn bg-warn-soft",
  3: "text-crit bg-crit-soft",
};

/** Fill for value blocks and chart marks: blue when in range, like the rest of the UI. */
export const SEVERITY_FILL: Record<Severity, string> = { 0: "#1462ff", 1: "#1462ff", 2: "#e07b2e", 3: "#d63b3b" };

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
      <h2 className="flex items-center gap-2 text-[15px] font-semibold">
        <span className="size-1.5 rounded-full bg-accent" aria-hidden />
        {children}
      </h2>
      {aside && <span className="text-xs text-ink-3">{aside}</span>}
    </div>
  );
}

/* ---------- Health ---------- */

export function StatusCard({
  status,
  feedback,
  findings,
  onResolve,
  onDismiss,
  onUndo,
  canUndo = false,
  vitals,
}: {
  status: Status;
  feedback: Feedback;
  findings: Finding[];
  /** The symptom is gone (logged as an improvement). */
  onResolve?: (id: SymptomId) => void;
  /** The symptom was misrecognized. */
  onDismiss?: (id: SymptomId) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  /** Current vitals; lets the card name a vital that holds the status up. */
  vitals?: Vitals;
}) {
  const style = STATUS_STYLE[status];
  const t = useT();
  const n = nowMessages[useLocale()];
  const copy = t.status[status];
  const locale = useLocale();
  // Vitals that hold the status at or above every reported symptom: say so, or the
  // status looks stuck (simulated vitals ease back over a few minutes).
  const findingMax = findings.reduce((m, f) => Math.max(m, f.severity), 0);
  const drivers = vitals
    ? VITAL_SPECS.filter((sp) => {
        const sev = sp.assess(vitals);
        return sev >= 2 && sev > findingMax;
      })
    : [];

  const primary = findings.length === 0 && status !== "nominal" && !drivers.length ? n.vitalsOnly : quickAdvice(findings, t);
  const aiText = feedback.text;
  const escalates = aiText ? soundsMoreUrgent(aiText, feedback.status ?? status) : false;
  const hasActions = Boolean(onResolve || onDismiss);

  return (
    <Card aria-label={t.dashboard.healthState}>
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
            {primary}
          </p>
          {drivers.length > 0 && vitals && (
            <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-ink-2">
              {n.heldBy(
                drivers.map((sp) => `${t.vitals[sp.key].label} ${formatVital(sp, vitals, locale)} ${sp.unit}`).join(", "),
                copy.label,
                findings.length > 0,
              )}
            </p>
          )}
          <p className="mt-1.5 text-xs text-ink-3">{t.dashboard.source(t.dashboard.rulesEngine)}</p>
        </div>
      </div>

      {(feedback.pending || aiText) && (
        <div className="mt-4 rounded-2xl bg-sunken px-3.5 py-3" aria-live="polite">
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-semibold text-ink-2">
            <Sparkles className="size-3.5 text-accent-ink" aria-hidden />
            {n.aiSuggestion}
            {feedback.engine && !feedback.pending && <span className="font-normal text-ink-3">· {feedback.engine}</span>}
          </p>
          {feedback.pending ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-3">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> {t.dashboard.refining}
            </p>
          ) : (
            aiText && (
              <>
                <SafeMarkdown text={aiText} className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-ink-2" />
                {escalates && (
                  <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-warn-soft px-3 py-2 text-[13px] font-medium text-warn">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {n.aiEscalates(copy.label.toLowerCase())}
                  </p>
                )}
              </>
            )
          )}
        </div>
      )}

      {findings.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {findings.map((f) => {
            const label = t.symptoms[f.id].label;
            return (
              <li key={f.id} className="flex flex-col rounded-2xl bg-sunken px-3.5 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{label}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${SEVERITY_CHIP[f.severity]}`}>{t.severity[f.severity]}</span>
                </div>
                <p className="mt-1 text-[13px] leading-snug text-ink-2">{adviceOf(f, t)}</p>
                {hasActions && (
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2.5">
                    {onResolve && (
                      <button
                        type="button"
                        onClick={() => onResolve(f.id)}
                        aria-label={n.resolveLabel(label)}
                        className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:bg-ok-soft hover:text-ok sm:min-h-8"
                      >
                        <Check className="size-3.5" aria-hidden /> {n.resolve}
                      </button>
                    )}
                    {onDismiss && (
                      <button
                        type="button"
                        onClick={() => onDismiss(f.id)}
                        aria-label={n.dismissLabel(label)}
                        className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface hover:text-ink sm:min-h-8"
                      >
                        <X className="size-3.5" aria-hidden /> {n.dismiss}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {onUndo && canUndo && (
        <button
          type="button"
          onClick={onUndo}
          title={t.nav.undoHint}
          className="mt-3 flex min-h-11 items-center gap-1.5 rounded-full px-1 text-[13px] font-semibold text-accent-ink hover:underline sm:min-h-8"
        >
          <Undo2 className="size-3.5" aria-hidden /> {t.nav.undoLast}
        </button>
      )}
    </Card>
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
          <p className="truncate text-[13px] font-semibold">{copy.label}</p>
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
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
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


"use client";

import { setMission } from "@/lib/routine/routine";
import { Suspense, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Info } from "lucide-react";
import { useCrewSession } from "@/lib/session/CrewSession";
import { formatNumber, INTL_LOCALE, useLocale, useT } from "@/lib/i18n";
import { vitalsMessages, type VitalKey } from "@/lib/i18n/pages/vitals";
import type { Severity, Vitals } from "@/lib/health/types";
import { Card, SEVERITY_CHIP, SEVERITY_FILL, SectionTitle, VITAL_ICON, formatVital, spec, timeOf } from "@/components/health/ui";
import { VitalChart, type ChartMarker, type ChartSeries } from "@/components/vitals/VitalChart";
import { DEFAULT_VITAL, VITAL_BANDS, VITAL_ORDER, directionOf, isVitalKey } from "@/components/vitals/thresholds";

type Window = "minute" | "hour";

/** Primary series uses the accent token; diastolic is a dashed teal reference line (no token for a second series). */
const SERIES_COLOR = { primary: "var(--accent)", diastolic: "#0f766e" };

export function VitalsView() {
  // Opening this screen completes today's "review vital signs" mission.
  useEffect(() => setMission("vitals", true), []);
  return (
    <Suspense fallback={<VitalsSkeleton />}>
      <VitalsContent />
    </Suspense>
  );
}

function VitalsSkeleton() {
  const m = vitalsMessages[useLocale()];
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{m.title}</h1>
        <p className="text-sm text-ink-2">{m.loading}</p>
      </header>
      <div className="h-[420px] rounded-3xl bg-surface shadow-card motion-safe:animate-pulse" />
    </div>
  );
}

/** Wall clock that ticks once a second, so time axes keep moving without impure renders. */
function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

function useStatusText(key: VitalKey, vitals: Vitals) {
  const m = vitalsMessages[useLocale()];
  const t = useT();
  const sev = spec(key).assess(vitals) as Severity;
  const dir = directionOf(key, vitals, sev);
  const text = dir === "in" ? m.status.inRange : `${m.status[dir]} · ${t.severity[sev]}`;
  return { sev, text };
}

function VitalsContent() {
  const s = useCrewSession();
  const t = useT();
  const locale = useLocale();
  const m = vitalsMessages[locale];
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("v");
  const selected: VitalKey = isVitalKey(raw) ? raw : DEFAULT_VITAL;
  const [win, setWin] = useState<Window>("minute");
  const now = useNow();
  const tabRefs = useRef<Partial<Record<VitalKey, HTMLButtonElement | null>>>({});

  const select = (key: VitalKey) => router.replace(`${pathname}?v=${key}`, { scroll: false });

  // On phones the tab strip scrolls: keep the selected tab in view (the default, heart rate, is 4th).
  useEffect(() => {
    tabRefs.current[selected]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selected]);

  function onTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    const i = VITAL_ORDER.indexOf(selected);
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % VITAL_ORDER.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + VITAL_ORDER.length) % VITAL_ORDER.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = VITAL_ORDER.length - 1;
    if (next === null) return;
    e.preventDefault();
    const key = VITAL_ORDER[next];
    select(key);
    tabRefs.current[key]?.focus();
  }

  const vs = spec(selected);
  const label = t.vitals[selected].label;
  const status = useStatusText(selected, s.vitals);
  const fmt = (v: number) => formatNumber(v, vs.digits, locale);
  const band = VITAL_BANDS[selected];
  const n = (v: number | null) => (v === null ? "" : fmt(v));
  const explanation = m.explain[selected]({
    lo: n(band.normal[0]),
    hi: n(band.normal[1]),
    critLo: n(band.critical[0]),
    critHi: n(band.critical[1]),
  });

  /* ---- Time window data ---- */
  const isBp = selected === "systolic";
  let xDomain: [number, number];
  let xTicks: { t: number; label: string }[];
  let samples: { t: number; v: Vitals }[];
  if (win === "minute") {
    const len = s.history.length;
    samples = s.history.map((v, i) => ({ t: now - (len - 1 - i) * 1000, v }));
    xDomain = [now - 60_000, now];
    xTicks = [60, 45, 30, 15, 0].map((sec) => ({ t: now - sec * 1000, label: sec ? m.secondsAgo(sec) : m.now }));
  } else {
    samples = [...s.trend.filter((p) => p.at < now).map((p) => ({ t: p.at, v: p as Vitals })), { t: now, v: s.vitals }];
    const first = s.trend[0]?.at ?? now;
    const start = Math.max(now - 3_600_000, Math.min(first, now - 5 * 60_000));
    xDomain = [start, now];
    const spanMin = (now - start) / 60_000;
    const stepMin = [1, 2, 5, 10, 15, 30].find((st) => spanMin / st <= 5) ?? 30;
    const stepMs = stepMin * 60_000;
    const clock = (ms: number) => new Date(ms).toLocaleTimeString(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" });
    xTicks = [];
    for (let tk = Math.ceil(start / stepMs) * stepMs; tk <= now; tk += stepMs) {
      if (now - tk > stepMs * 0.4) xTicks.push({ t: tk, label: clock(tk) });
    }
    xTicks.push({ t: now, label: m.now });
  }
  const windowLabel = win === "minute" ? m.lastMinute : m.lastHour;

  const series: ChartSeries[] = [
    { id: selected, label: isBp ? m.legend.systolic : label, color: SERIES_COLOR.primary, points: samples.map((p) => ({ t: p.t, v: p.v[selected] })) },
  ];
  if (isBp) {
    series.push({ id: "diastolic", label: m.legend.diastolic, color: SERIES_COLOR.diastolic, points: samples.map((p) => ({ t: p.t, v: p.v.diastolic })) });
  }

  const markers: ChartMarker[] = s.entries
    .filter((e) => e.source !== "action" && e.findings.length > 0 && e.at >= xDomain[0] && e.at <= xDomain[1])
    .map((e) => ({ id: e.id, at: e.at, label: m.reportAt(timeOf(e.at, locale), e.findings.map((f) => t.symptoms[f].label).join(", ")) }));

  const range = (vals: number[]) => (vals.length ? [fmt(Math.min(...vals)), fmt(Math.max(...vals))] : ["–", "–"]);
  const [pMin, pMax] = range(series[0].points.map((p) => p.v));
  const summary = isBp
    ? (() => {
        const [dMin, dMax] = range(series[1].points.map((p) => p.v));
        return m.chartSummaryBp({ window: windowLabel, sysMin: pMin, sysMax: pMax, diaMin: dMin, diaMax: dMax, current: formatVital(vs, s.vitals, locale), reports: markers.length });
      })()
    : m.chartSummary({ label, window: windowLabel, min: pMin, max: pMax, current: formatVital(vs, s.vitals, locale), unit: vs.unit, reports: markers.length });

  const SelIcon = VITAL_ICON[selected];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{m.title}</h1>
        <p className="text-sm text-ink-2">{m.subtitle}</p>
      </header>

      <div
        role="tablist"
        aria-label={m.selectorLabel}
        className="-mx-3 flex [scrollbar-width:none] gap-2 overflow-x-auto px-3 pb-1 [mask-image:linear-gradient(to_right,#000_85%,transparent)] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]"
      >
        {VITAL_ORDER.map((key) => {
          const Icon = VITAL_ICON[key];
          const active = key === selected;
          const sev = spec(key).assess(s.vitals) as Severity;
          return (
            <button
              key={key}
              ref={(el) => {
                tabRefs.current[key] = el;
              }}
              type="button"
              role="tab"
              id={`vital-tab-${key}`}
              aria-selected={active}
              aria-controls="vital-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => select(key)}
              onKeyDown={onTabKey}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold motion-safe:transition-colors ${
                active ? "bg-accent text-white shadow-card" : "bg-surface text-ink-2 shadow-card hover:text-ink"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {m.short[key]}
              {sev > 0 && (
                <>
                  <span
                    className={`size-2 rounded-full ring-2 ${sev === 3 ? "bg-crit" : sev === 2 ? "bg-warn" : "bg-mild"} ${active ? "ring-white/80" : "ring-surface"}`}
                    aria-hidden
                  />
                  <span className="sr-only">, {t.severity[sev]}</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <Card id="vital-panel" role="tabpanel" aria-labelledby={`vital-tab-${selected}`} className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sunken text-ink-2">
                <SelIcon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold">{label}</h2>
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="tabular text-4xl font-bold tracking-tight">{formatVital(vs, s.vitals, locale)}</span>
                  <span className="text-sm font-semibold text-ink-2">{vs.unit}</span>
                  <span className="sr-only">, </span>
                  <span className={`self-center rounded-md px-2 py-0.5 text-xs font-semibold ${SEVERITY_CHIP[status.sev]}`}>{status.text}</span>
                </p>
              </div>
            </div>
            <div role="group" aria-label={m.windowLabel} className="flex rounded-full bg-sunken p-1">
              {(["minute", "hour"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  aria-pressed={win === w}
                  onClick={() => setWin(w)}
                  className={`min-h-11 rounded-full px-3.5 text-[13px] font-semibold sm:min-h-9 ${
                    win === w ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {w === "minute" ? m.lastMinute : m.lastHour}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-3 text-sm font-semibold text-ink">
            {t.dashboard.range(t.vitals[selected].range)} {vs.unit}.
          </p>
          <details className="group mt-1">
            <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-[13px] font-semibold text-accent-ink [&::-webkit-details-marker]:hidden">
              {m.howToRead}
              <ChevronDown className="size-3.5 motion-safe:transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="max-w-[68ch] text-sm leading-relaxed text-ink-2">{explanation}</p>
          </details>

          <div className="mt-4">
            <VitalChart
              vital={selected}
              series={series}
              xDomain={xDomain}
              xTicks={xTicks}
              markers={markers}
              format={fmt}
              formatTime={(ms) => timeOf(ms, locale)}
              summary={summary}
              tableCaption={m.tableCaption(label, windowLabel)}
              colTime={m.colTime}
              colValue={`${m.colValue} (${vs.unit})`}
              tags={
                isBp
                  ? { attention: `${m.legend.systolic} · ${m.thresholdTag.attention}`, critical: `${m.legend.systolic} · ${m.thresholdTag.critical}` }
                  : m.thresholdTag
              }
              emptyText={m.noData}
              lastFill={status.sev >= 2 ? SEVERITY_FILL[status.sev] : undefined}
            />
            <p className="mt-1 hidden text-xs text-ink-3 sm:block">{m.chartKeys}</p>
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-2" aria-hidden>
            {series.map((se) => (
              <li key={se.id} className="flex items-center gap-1.5">
                <svg width="18" height="8">
                  <line
                    x1="1"
                    x2="17"
                    y1="4"
                    y2="4"
                    stroke={se.color}
                    strokeWidth={se.id === "diastolic" ? 2 : 2.5}
                    strokeDasharray={se.id === "diastolic" ? "4 3" : undefined}
                    strokeLinecap="round"
                  />
                </svg>
                {se.label}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span className="h-2.5 w-[18px] rounded-sm bg-accent-soft ring-1 ring-accent/20" />
              {isBp ? m.legend.normalSystolic : m.legend.normal}
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="18" height="8">
                <line x1="0" x2="18" y1="4" y2="4" stroke="var(--warn)" strokeWidth="1.5" strokeDasharray="6 4" />
              </svg>
              {m.legend.attention}
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="18" height="8">
                <line x1="0" x2="18" y1="4" y2="4" stroke="var(--crit)" strokeWidth="1.5" strokeDasharray="2 3" />
              </svg>
              {m.legend.critical}
            </li>
            <li className="flex items-center gap-1.5">
              <svg width="12" height="12">
                <line x1="6" x2="6" y1="0" y2="12" stroke="var(--ink-3)" strokeDasharray="1 3" />
              </svg>
              {m.legend.report}
            </li>
          </ul>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card aria-labelledby="all-vitals-title">
            <SectionTitle>
              <span id="all-vitals-title">{m.allVitals}</span>
            </SectionTitle>
            <ul className="flex flex-col gap-1.5">
              {VITAL_ORDER.map((key) => (
                <VitalRow key={key} vital={key} vitals={s.vitals} active={key === selected} onSelect={() => select(key)} />
              ))}
            </ul>
          </Card>

          <aside className="flex gap-3 rounded-3xl border border-line bg-surface/60 p-4 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
            <div>
              <p className="font-semibold">{m.simulatedTitle}</p>
              <p className="mt-1 leading-relaxed text-ink-2">{m.simulatedBody}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function VitalRow({ vital, vitals, active, onSelect }: { vital: VitalKey; vitals: Vitals; active: boolean; onSelect: () => void }) {
  const t = useT();
  const locale = useLocale();
  const vs = spec(vital);
  const status = useStatusText(vital, vitals);
  const Icon = VITAL_ICON[vital];
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={`flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left motion-safe:transition-colors ${
          active ? "bg-accent-soft" : "hover:bg-sunken"
        }`}
      >
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${active ? "bg-surface text-accent-ink" : "bg-sunken text-ink-2"}`}>
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] leading-tight font-semibold">{t.vitals[vital].label}</span>
          <span className={`mt-0.5 inline-block rounded-md px-1.5 py-px text-[11px] font-semibold ${SEVERITY_CHIP[status.sev]}`}>{status.text}</span>
        </span>
        <span className="tabular shrink-0 text-right">
          <span className="text-base font-bold">{formatVital(vs, vitals, locale)}</span>
          <span className="ml-1 text-xs text-ink-3">{vs.unit}</span>
        </span>
      </button>
    </li>
  );
}

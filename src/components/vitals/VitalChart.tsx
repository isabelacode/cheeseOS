"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { MessageSquareText } from "lucide-react";
import type { VitalKey } from "@/lib/i18n/pages/vitals";
import { VITAL_BANDS, thresholdLines } from "./thresholds";

export interface ChartPoint {
  t: number;
  v: number;
}

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  points: ChartPoint[];
}

export interface ChartMarker {
  id: string;
  at: number;
  label: string;
}

interface Props {
  vital: VitalKey;
  series: ChartSeries[];
  xDomain: [number, number];
  xTicks: { t: number; label: string }[];
  markers: ChartMarker[];
  format: (v: number) => string;
  formatTime: (t: number) => string;
  summary: string;
  tableCaption: string;
  colTime: string;
  colValue: string;
  tags: { attention: string; critical: string };
  emptyText: string;
}

const PAD = { top: 26, right: 12, bottom: 26, left: 40 };
const ATTENTION = "#b45309";
const CRITICAL = "#c81e1e";

function niceStep(span: number, target = 5) {
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= raw) return m * mag;
  return 10 * mag;
}

/** Keeps the SVG in real pixels so text and strokes never stretch. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 640, h: 260 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) => (Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function VitalChart(props: Props) {
  // Drop non-finite samples: one NaN would poison Math.min/max and blank the whole chart.
  const p = { ...props, series: props.series.map((s) => ({ ...s, points: s.points.filter((pt) => Number.isFinite(pt.t) && Number.isFinite(pt.v)) })) };
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const clipId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);

  const band = VITAL_BANDS[p.vital];
  const lines = thresholdLines(p.vital);
  const all = p.series.flatMap((s) => s.points.map((pt) => pt.v));
  const hasData = all.length > 0;

  let [yMin, yMax] = band.domain;
  if (hasData) {
    const pad = (yMax - yMin) * 0.04;
    yMin = Math.min(yMin, Math.min(...all) - pad);
    yMax = Math.max(yMax, Math.max(...all) + pad);
  }

  const plotW = Math.max(40, w - PAD.left - PAD.right);
  const plotH = Math.max(40, h - PAD.top - PAD.bottom);
  const [t0, t1] = p.xDomain;
  const x = (t: number) => PAD.left + ((t - t0) / Math.max(1, t1 - t0)) * plotW;
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const step = niceStep(Math.max(yMax - yMin, 1e-6));
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / step) * step; v <= yMax + 1e-9; v += step) yTicks.push(Number(v.toFixed(4)));

  const bandTop = y(Math.min(yMax, band.normal[1] ?? yMax));
  const bandBottom = y(Math.max(yMin, band.normal[0] ?? yMin));

  const primary = p.series[0]?.points ?? [];
  const visibleMarkers = p.markers.filter((m) => m.at >= t0 && m.at <= t1);

  function onMove(e: PointerEvent<SVGSVGElement>) {
    if (!primary.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = t0 + ((e.clientX - rect.left - PAD.left) / plotW) * (t1 - t0);
    let best = 0;
    for (let i = 1; i < primary.length; i++) if (Math.abs(primary[i].t - t) < Math.abs(primary[best].t - t)) best = i;
    setHover(best);
  }

  const hoverPt = hover !== null ? primary[hover] : undefined;
  const hoverValues = hoverPt
    ? p.series.map((s) => ({ s, pt: s.points.find((q) => q.t === hoverPt.t) ?? s.points[hover!] })).filter((r) => r.pt)
    : [];

  /* Screen-reader table: down-sample to at most ~12 rows. */
  const stride = Math.max(1, Math.ceil(primary.length / 12));
  const rows = primary.filter((_, i) => i % stride === 0 || i === primary.length - 1);

  return (
    <div>
      <div ref={ref} className="relative h-[220px] w-full sm:h-[300px]">
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label={p.summary}
          className="block touch-pan-y select-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Normal band */}
          <rect x={PAD.left} y={bandTop} width={plotW} height={Math.max(0, bandBottom - bandTop)} fill="#e8efff" />

          {/* Grid + y ticks */}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={PAD.left + plotW} y1={y(v)} y2={y(v)} stroke="#e4e6eb" strokeWidth={1} />
              <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="tabular fill-ink-3 text-[11px]">
                {p.format(v)}
              </text>
            </g>
          ))}

          {/* X ticks */}
          {p.xTicks.map((tk, i) => {
            const anchor = i === 0 ? "start" : i === p.xTicks.length - 1 ? "end" : "middle";
            return (
              <g key={tk.t}>
                <line x1={x(tk.t)} x2={x(tk.t)} y1={PAD.top + plotH} y2={PAD.top + plotH + 4} stroke="#c9cfd8" />
                <text x={x(tk.t)} y={h - 6} textAnchor={anchor} className="tabular fill-ink-3 text-[11px]">
                  {tk.label}
                </text>
              </g>
            );
          })}
          <line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="#c9cfd8" />

          {/* Thresholds: dash pattern and text label distinguish attention from critical, not only colour */}
          {lines
            .filter((l) => l.value >= yMin && l.value <= yMax)
            .map((l) => {
              const color = l.kind === "critical" ? CRITICAL : ATTENTION;
              return (
                <g key={`${l.kind}-${l.value}`}>
                  <line
                    x1={PAD.left}
                    x2={PAD.left + plotW}
                    y1={y(l.value)}
                    y2={y(l.value)}
                    stroke={color}
                    strokeWidth={1.25}
                    strokeDasharray={l.kind === "critical" ? "2 3" : "6 4"}
                  />
                  <text x={PAD.left + plotW - 4} y={y(l.value) - 4} textAnchor="end" fill={color} className="tabular text-[10px] font-semibold">
                    {p.tags[l.kind]} {p.format(l.value)}
                  </text>
                </g>
              );
            })}

          {/* Report markers */}
          {visibleMarkers.map((m) => (
            <line
              key={m.id}
              x1={x(m.at)}
              x2={x(m.at)}
              y1={PAD.top - 2}
              y2={PAD.top + plotH}
              stroke={activeMarker === m.id ? "#111827" : "#5c6370"}
              strokeWidth={1}
              strokeDasharray="1 3"
            />
          ))}

          {/* Series */}
          <g clipPath={`url(#${clipId})`}>
            {p.series.map((s) =>
              s.points.length > 1 ? (
                <path
                  key={s.id}
                  d={s.points.map((pt, i) => `${i ? "L" : "M"}${x(pt.t).toFixed(1)},${y(pt.v).toFixed(1)}`).join("")}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null,
            )}
          </g>
          {p.series.map((s) => {
            const last = s.points.at(-1);
            return last ? <circle key={s.id} cx={x(last.t)} cy={y(last.v)} r={4} fill={s.color} stroke="#fff" strokeWidth={2} /> : null;
          })}

          {/* Hover crosshair */}
          {hoverPt && (
            <g pointerEvents="none">
              <line x1={x(hoverPt.t)} x2={x(hoverPt.t)} y1={PAD.top} y2={PAD.top + plotH} stroke="#111827" strokeOpacity={0.35} />
              {hoverValues.map(({ s, pt }) => (
                <circle key={s.id} cx={x(pt.t)} cy={y(pt.v)} r={3.5} fill="#fff" stroke={s.color} strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>

        {!hasData && (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-ink-2">{p.emptyText}</p>
        )}

        {hoverPt && (
          <div
            className="pointer-events-none absolute z-10 rounded-xl bg-ink px-2.5 py-1.5 text-xs text-white shadow-card"
            style={{
              left: Math.min(Math.max(x(hoverPt.t), PAD.left + 50), w - 60),
              top: PAD.top + 4,
              transform: "translateX(-50%)",
            }}
          >
            <p className="tabular text-white/75">{p.formatTime(hoverPt.t)}</p>
            {hoverValues.map(({ s, pt }) => (
              <p key={s.id} className="tabular font-semibold">
                {p.series.length > 1 ? `${s.label}: ` : ""}
                {p.format(pt.v)}
              </p>
            ))}
          </div>
        )}

        {visibleMarkers.map((m) => {
          const left = x(m.at);
          const open = activeMarker === m.id;
          return (
            <div key={m.id} className="absolute" style={{ left, top: PAD.top - 14 }}>
              <button
                type="button"
                aria-label={m.label}
                className="relative -ml-3 grid size-6 place-items-center rounded-full border border-ink-3 bg-surface text-ink-2 after:absolute after:-inset-2.5 after:content-[''] hover:text-ink"
                onMouseEnter={() => setActiveMarker(m.id)}
                onMouseLeave={() => setActiveMarker((a) => (a === m.id ? null : a))}
                onFocus={() => setActiveMarker(m.id)}
                onBlur={() => setActiveMarker((a) => (a === m.id ? null : a))}
                onClick={() => setActiveMarker(m.id)}
              >
                <MessageSquareText className="size-3.5" aria-hidden />
              </button>
              {open && (
                <div
                  role="tooltip"
                  className="absolute top-8 z-20 w-max max-w-[220px] rounded-xl bg-ink px-2.5 py-1.5 text-xs leading-snug text-white shadow-card"
                  style={left > w / 2 ? { right: 0 } : { left: -12 }}
                >
                  {m.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <table className="sr-only">
        <caption>{p.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{p.colTime}</th>
            {p.series.map((s) => (
              <th key={s.id} scope="col">
                {p.series.length > 1 ? s.label : p.colValue}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.t}>
              <th scope="row">{p.formatTime(r.t)}</th>
              {p.series.map((s) => {
                const pt = s.points.find((q) => q.t === r.t);
                return <td key={s.id}>{pt ? p.format(pt.v) : ""}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

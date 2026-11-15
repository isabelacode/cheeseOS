import type { Finding, Status, SymptomId, TranscriptEntry, Vitals } from "@/lib/health/types";
import type { CrewProfile } from "@/lib/crew/profile";
import { formatNumber, INTL_LOCALE, type Locale, type Messages } from "@/lib/i18n";
import type { SafetyAlert } from "@/lib/health/safety";
import { adviceOf } from "@/lib/health/advice";
import { VITAL_SPECS } from "@/lib/health/vitals";
import { hazardsOf, scienceMessages } from "@/lib/science/nasa";
import { alertCopy } from "@/lib/i18n/pages/safety";
import type { TrendPoint } from "@/lib/session/CrewSession";
import type { LogMessages } from "@/lib/i18n/pages/log";

export type SourceFilter = "all" | TranscriptEntry["source"];

/** Local calendar day, e.g. "2026-11-14". */
export function dayKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayLabel(ms: number, now: number, locale: Locale, l: LogMessages) {
  const key = dayKey(ms);
  if (key === dayKey(now)) return l.today;
  // Calendar arithmetic, not "now - 24 h": DST days are 23 or 25 hours long.
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (key === dayKey(y.getTime())) return l.yesterday;
  return new Date(ms).toLocaleDateString(INTL_LOCALE[locale], { weekday: "long", day: "numeric", month: "long" });
}

/** Time only for today, date + time otherwise. */
export function shortWhen(ms: number, now: number, locale: Locale) {
  const time = new Date(ms).toLocaleTimeString(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" });
  if (dayKey(ms) === dayKey(now)) return time;
  return `${new Date(ms).toLocaleDateString(INTL_LOCALE[locale], { day: "2-digit", month: "2-digit" })} ${time}`;
}

export function groupByDay(entries: TranscriptEntry[]) {
  const groups: { key: string; at: number; entries: TranscriptEntry[] }[] = [];
  for (const e of [...entries].sort((a, b) => b.at - a.at)) {
    const key = dayKey(e.at);
    const last = groups.at(-1);
    if (last?.key === key) last.entries.push(e);
    else groups.push({ key, at: e.at, entries: [e] });
  }
  return groups;
}

/** Every symptom mentioned in the log (recognized or resolved), in first-seen order. */
export function symptomsInLog(entries: TranscriptEntry[]): SymptomId[] {
  const seen = new Set<SymptomId>();
  for (const e of [...entries].sort((a, b) => a.at - b.at)) {
    e.findings.forEach((f) => seen.add(f));
    e.resolved.forEach((f) => seen.add(f));
  }
  return [...seen];
}

export type SpanState = "active" | "resolved" | "dismissed" | "inactive";

export interface SymptomSpan {
  id: SymptomId;
  start: number;
  end: number;
  state: SpanState;
  finding?: Finding;
}

/** First report → resolution, dismissal, or still active, for each recognized symptom. */
export function symptomSpans(entries: TranscriptEntry[], findings: Finding[], now: number): SymptomSpan[] {
  const sorted = [...entries].sort((a, b) => a.at - b.at);
  const spans: SymptomSpan[] = [];
  const ids = new Set(sorted.flatMap((e) => e.findings));
  for (const id of ids) {
    const reports = sorted.filter((e) => e.findings.includes(id));
    const start = reports[0].at;
    const lastReport = reports.at(-1)!.at;
    const finding = findings.find((f) => f.id === id);
    const resolvedAt = sorted.find((e) => e.at >= lastReport && e.resolved.includes(id))?.at;
    // Only the latest episode counts: a symptom dismissed once, then genuinely re-reported, is not "dismissed".
    const dismissed = Boolean(reports.at(-1)!.dismissed?.includes(id));
    if (finding) spans.push({ id, start, end: now, state: "active", finding });
    else if (dismissed) spans.push({ id, start, end: lastReport, state: "dismissed" });
    else if (resolvedAt) spans.push({ id, start, end: resolvedAt, state: "resolved" });
    else spans.push({ id, start, end: lastReport, state: "inactive" });
  }
  // Active first, then most recent.
  return spans.sort((a, b) => Number(b.state === "active") - Number(a.state === "active") || b.start - a.start);
}

export interface ReportArgs {
  profile: CrewProfile;
  findings: Finding[];
  entries: TranscriptEntry[];
  locale: Locale;
  t: Messages;
  l: LogMessages;
  now: number;
  status: Status;
  safety: SafetyAlert[];
  vitals: Vitals;
  trend: TrendPoint[];
  streak: number;
  missionsDone: number;
  missionsTotal: number;
}

type Row = string[];
interface Section {
  title: string;
  lines?: string[];
  table?: { head: Row; rows: Row[] };
  note?: string;
  tone?: "crit" | "warn";
}

function duration(ms: number, f: LogMessages["file"]) {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  if (h < 48) return rest ? `${h} h ${rest} min` : `${h} h`;
  return f.days(Math.round(h / 24));
}

/** The report as sections, rendered to text or HTML. */
export function buildReport(a: ReportArgs): { heading: string; generated: string; sections: Section[]; footer: string } {
  const { profile: p, findings, entries, locale, t, l, now } = a;
  const f = l.file;
  const sci = scienceMessages[locale];
  const when = (ms: number) => new Date(ms).toLocaleString(INTL_LOCALE[locale], { dateStyle: "short", timeStyle: "short" });
  const orNone = (s: string) => s.trim() || f.none;
  const label = (id: SymptomId) => t.symptoms[id].label;
  const sections: Section[] = [];

  sections.push({
    title: f.summary,
    tone: a.status === "critical" ? "crit" : a.status === "attention" ? "warn" : undefined,
    lines: [
      f.status(t.status[a.status].label, t.status[a.status].summary),
      `${f.activeFindings}: ${findings.length ? findings.map((x) => `${label(x.id)} (${t.severity[x.severity]})`).join(", ") : f.noActive}`,
    ],
  });

  sections.push({
    title: f.crew,
    lines: [
      `${f.name}: ${p.name}`,
      `${f.role}: ${p.role || f.unknown}`,
      ...(p.mission ? [`${f.mission}: ${p.mission}`] : []),
      `${f.age}: ${f.years(p.age)} · ${f.sex}: ${t.sex[p.sex] ?? f.unknown} · ${f.bloodType}: ${p.bloodType || f.unknown}`,
      `${f.allergies}: ${orNone(p.allergies)}`,
      `${f.medications}: ${orNone(p.medications)}`,
      `${f.conditions}: ${orNone(p.conditions)}`,
    ],
  });

  sections.push({
    title: f.safety,
    tone: a.safety.some((x) => x.level === 3) ? "crit" : a.safety.length ? "warn" : undefined,
    lines: a.safety.length
      ? a.safety.map((x) => {
          const c = alertCopy(x, t, locale);
          return `${x.level === 3 ? "[!] " : ""}${c.head}. ${c.body}`;
        })
      : [f.noSafety],
  });

  sections.push({
    title: f.activeFindings,
    lines: findings.length
      ? findings.flatMap((x) => [
          `${label(x.id)} — ${t.severity[x.severity]}${x.redFlag ? ` [${f.redFlag}]` : ""} (${f.reportedAt(when(x.reportedAt))})`,
          `  ${f.protocol}: ${adviceOf(x, t)}`,
          ...(hazardsOf(x).length ? [`  ${f.hazards}: ${hazardsOf(x).map((h) => sci.hazards[h].name).join(", ")}`] : []),
        ])
      : [f.noActive],
  });

  const spans = symptomSpans(entries, findings, now);
  sections.push({
    title: f.evolution,
    lines: spans.length
      ? spans.map((sp) => `${label(sp.id)}: ${f.state[sp.state]} · ${when(sp.start)} → ${sp.state === "active" ? l.timelineNow : when(sp.end)} · ${f.duration(duration(sp.end - sp.start, f))}`)
      : [f.noEvolution],
  });

  const hour = a.trend.filter((x) => now - x.at <= 3_600_000);
  // Trend points are 10 s apart; the current reading belongs in min/max too.
  const pts = [...hour, { ...a.vitals, at: now }];
  const keys: (keyof Vitals)[] = ["heartRate", "spo2", "temperature", "respiration", "systolic"];
  const fmt = (k: keyof Vitals, v: number) => formatNumber(v, k === "temperature" ? 1 : 0, locale);
  sections.push({
    title: f.vitals,
    note: f.vitalsNote,
    table: {
      head: [f.vitalsCols.vital, f.vitalsCols.now, f.vitalsCols.min, f.vitalsCols.max, f.vitalsCols.avg],
      rows: keys.map((k) => {
        const vals = pts.map((x) => x[k]);
        const sp = VITAL_SPECS.find((x) => x.key === k)!;
        return [
          `${t.vitals[k as keyof Messages["vitals"]].label} (${sp.unit})`,
          k === "systolic" ? `${Math.round(a.vitals.systolic)}/${Math.round(a.vitals.diastolic)}` : fmt(k, a.vitals[k]),
          fmt(k, Math.min(...vals)),
          fmt(k, Math.max(...vals)),
          fmt(k, vals.reduce((s, v) => s + v, 0) / vals.length),
        ];
      }),
    },
  });

  sections.push({ title: f.routine, lines: [f.streak(a.streak), f.missions(a.missionsDone, a.missionsTotal)] });

  const log: string[] = [];
  for (const e of [...entries].sort((x, y) => y.at - x.at)) {
    const src = e.source === "voice" ? l.sourceVoice : e.source === "typed" ? l.sourceTyped : l.sourceAction;
    if (e.source === "action") {
      log.push(
        `[${when(e.at)}] (${src}) ${[
          ...e.resolved.map((id) => l.markedResolved(label(id))),
          ...(e.dismissed ?? []).map((id) => l.markedDismissed(label(id))),
          ...(e.alert ? [l.markedAlert(e.alert)] : []),
        ].join("; ")}`,
      );
      continue;
    }
    log.push(`[${when(e.at)}] (${src}) "${e.text}"`);
    const kept = e.findings.filter((id) => !e.dismissed?.includes(id));
    if (kept.length) log.push(`  ${f.recognized}: ${kept.map(label).join(", ")}`);
    if (e.dismissed?.length) log.push(`  ${f.dismissed}: ${e.dismissed.map(label).join(", ")}`);
    if (e.resolved.length) log.push(`  ${f.resolved}: ${e.resolved.map(label).join(", ")}`);
  }
  sections.push({ title: f.log, lines: log.length ? log : [f.noEntries] });

  return { heading: f.heading, generated: f.generated(when(now)), sections, footer: f.footer };
}

export function buildExport(a: ReportArgs): string {
  const r = buildReport(a);
  const rule = "-".repeat(48);
  const out = [r.heading, r.generated, ""];
  for (const s of r.sections) {
    out.push(s.title, rule);
    if (s.note) out.push(s.note);
    if (s.lines) out.push(...s.lines);
    if (s.table) {
      const all = [s.table.head, ...s.table.rows];
      const w = s.table.head.map((_, i) => Math.max(...all.map((row) => row[i].length)));
      for (const row of all) out.push(row.map((c, i) => c.padEnd(w[i])).join("  "));
    }
    out.push("");
  }
  out.push(r.footer, "");
  return out.join("\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Self-contained, printable HTML version of the report (no external resources). */
export function buildHtml(a: ReportArgs): string {
  const r = buildReport(a);
  const body = r.sections
    .map((s) => {
      const lines = (s.lines ?? []).map((x) => `<li${x.startsWith("  ") ? ' class="sub"' : ""}>${esc(x.trim())}</li>`).join("");
      const table = s.table
        ? `<table><thead><tr>${s.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.table.rows
            .map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        : "";
      return `<section class="${s.tone ?? ""}"><h2>${esc(s.title)}</h2>${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}${lines ? `<ul>${lines}</ul>` : ""}${table}</section>`;
    })
    .join("");
  return `<!doctype html><html lang="${a.locale === "pt" ? "pt-BR" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(r.heading)}</title><style>
body{font:14px/1.5 system-ui,sans-serif;color:#111827;background:#eceef2;margin:0;padding:24px}
main{max-width:820px;margin:0 auto;background:#fff;border-radius:20px;padding:28px}
h1{font-size:22px;margin:0}h2{font-size:12px;letter-spacing:.06em;color:#4b5563;margin:0 0 8px}
.gen{color:#5c6370;margin:4px 0 20px}section{border-top:1px solid #e4e6eb;padding:14px 0}
section.crit{border-left:4px solid #c81e1e;padding-left:12px}section.warn{border-left:4px solid #a84d08;padding-left:12px}
ul{margin:0;padding-left:18px}li.sub{list-style:none;color:#4b5563;margin-left:-4px}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:4px 8px;border-bottom:1px solid #eef0f3}
.note{background:#fdf5d8;color:#8a6a00;border-radius:8px;padding:6px 10px;margin:0 0 8px;font-size:13px}
footer{color:#5c6370;font-size:12px;margin-top:12px}button{font:inherit;background:#1462ff;color:#fff;border:0;border-radius:999px;padding:8px 16px;cursor:pointer;float:right}
@media print{body{background:#fff;padding:0}main{padding:0}button{display:none}}
</style></head><body><main><button onclick="print()">${esc(a.l.file.print)}</button><h1>${esc(r.heading)}</h1><p class="gen">${esc(r.generated)}</p>${body}<footer>${esc(r.footer)}</footer></main></body></html>`;
}

export function downloadText(text: string, fileName: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

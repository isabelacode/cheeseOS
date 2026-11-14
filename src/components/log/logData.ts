import type { Finding, SymptomId, TranscriptEntry } from "@/lib/health/types";
import type { CrewProfile } from "@/lib/crew/profile";
import { INTL_LOCALE, type Locale, type Messages } from "@/lib/i18n";
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
  if (key === dayKey(now - 86_400_000)) return l.yesterday;
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
    const dismissed = reports.some((e) => e.dismissed?.includes(id));
    if (finding) spans.push({ id, start, end: now, state: "active", finding });
    else if (dismissed) spans.push({ id, start, end: lastReport, state: "dismissed" });
    else if (resolvedAt) spans.push({ id, start, end: resolvedAt, state: "resolved" });
    else spans.push({ id, start, end: lastReport, state: "inactive" });
  }
  // Active first, then most recent.
  return spans.sort((a, b) => Number(b.state === "active") - Number(a.state === "active") || b.start - a.start);
}

export function buildExport(args: {
  profile: CrewProfile;
  findings: Finding[];
  entries: TranscriptEntry[];
  locale: Locale;
  t: Messages;
  l: LogMessages;
  now: number;
}) {
  const { profile: p, findings, entries, locale, t, l, now } = args;
  const f = l.file;
  const when = (ms: number) =>
    new Date(ms).toLocaleString(INTL_LOCALE[locale], { dateStyle: "short", timeStyle: "medium" });
  const orNone = (s: string) => s.trim() || f.none;
  const rule = "-".repeat(48);

  const lines: string[] = [f.heading, f.generated(when(now)), "", f.crew, rule];
  lines.push(
    `${f.name}: ${p.name}`,
    `${f.role}: ${p.role || f.unknown}`,
    ...(p.mission ? [`${f.mission}: ${p.mission}`] : []),
    `${f.age}: ${f.years(p.age)}`,
    `${f.sex}: ${t.sex[p.sex] ?? f.unknown}`,
    `${f.bloodType}: ${p.bloodType || f.unknown}`,
    `${f.allergies}: ${orNone(p.allergies)}`,
    `${f.medications}: ${orNone(p.medications)}`,
    `${f.conditions}: ${orNone(p.conditions)}`,
    "",
    f.activeFindings,
    rule,
  );
  if (!findings.length) lines.push(f.noActive);
  for (const x of findings) {
    const flag = x.redFlag ? ` [${f.redFlag}]` : "";
    lines.push(`- ${t.symptoms[x.id].label}: ${t.severity[x.severity]}${flag} (${f.reportedAt(when(x.reportedAt))})`);
  }

  lines.push("", f.log, rule);
  if (!entries.length) lines.push(f.noEntries);
  for (const e of [...entries].sort((a, b) => b.at - a.at)) {
    const src = e.source === "voice" ? l.sourceVoice : e.source === "typed" ? l.sourceTyped : l.sourceAction;
    const label = (id: SymptomId) => t.symptoms[id].label;
    if (e.source === "action") {
      lines.push(
        `[${when(e.at)}] (${src}) ${[...e.resolved.map((id) => l.markedResolved(label(id))), ...(e.dismissed ?? []).map((id) => l.markedDismissed(label(id)))].join("; ")}`,
      );
      continue;
    }
    lines.push(`[${when(e.at)}] (${src}) "${e.text}"`);
    const kept = e.findings.filter((id) => !e.dismissed?.includes(id));
    if (kept.length) lines.push(`  ${f.recognized}: ${kept.map(label).join(", ")}`);
    if (e.dismissed?.length) lines.push(`  ${f.dismissed}: ${e.dismissed.map(label).join(", ")}`);
    if (e.resolved.length) lines.push(`  ${f.resolved}: ${e.resolved.map(label).join(", ")}`);
  }
  lines.push("", f.footer, "");
  return lines.join("\n");
}

export function downloadText(text: string, fileName: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

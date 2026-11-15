"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, MessageSquareText, Mic, Search, Send, X } from "lucide-react";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useLocale, useT } from "@/lib/i18n";
import { logMessages } from "@/lib/i18n/pages/log";
import { Card, SectionTitle } from "@/components/health/ui";
import { LogEntryItem } from "@/components/log/LogEntryItem";
import { SymptomTimeline } from "@/components/log/SymptomTimeline";
import {
  buildExport,
  buildHtml,
  dayKey,
  dayLabel,
  downloadText,
  groupByDay,
  shownResolved,
  symptomSpans,
  symptomsInLog,
  type SourceFilter,
} from "@/components/log/logData";
import type { SymptomId } from "@/lib/health/types";
import { MISSIONS, checkinStreak, missionsToday, useRoutine } from "@/lib/routine/routine";

export function LogView() {
  const s = useCrewSession();
  const t = useT();
  const locale = useLocale();
  const l = logMessages[locale];

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const [draft, setDraft] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [symptom, setSymptom] = useState<SymptomId | "all">("all");
  const [query, setQuery] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [exported, setExported] = useState(false);

  const { entries, findings } = s;
  const reportCount = entries.filter((e) => e.source !== "action").length;
  const logSymptoms = useMemo(() => symptomsInLog(entries), [entries]);
  const resolvedById = useMemo(() => shownResolved(entries), [entries]);
  const spans = useMemo(() => symptomSpans(entries, findings, now), [entries, findings, now]);
  // A symptom filter pointing at a symptom no longer in the log falls back to "all".
  const symptomFilter = symptom !== "all" && logSymptoms.includes(symptom) ? symptom : "all";

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase(locale);
    return entries.filter((e) => {
      if (source !== "all" && e.source !== source) return false;
      const resolved = resolvedById.get(e.id) ?? [];
      const mentioned = [...e.findings, ...resolved, ...(e.cleared ?? []), ...(e.dismissed ?? [])];
      if (symptomFilter !== "all" && !mentioned.includes(symptomFilter)) return false;
      if (!q) return true;
      const labels = [...e.findings, ...resolved, ...(e.cleared ?? [])].map((id) => t.symptoms[id].label).join(" ");
      return `${e.text} ${labels}`.toLocaleLowerCase(locale).includes(q);
    });
  }, [entries, source, symptomFilter, query, locale, t, resolvedById]);
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const filtering = source !== "all" || symptomFilter !== "all" || query.trim() !== "";

  function submit() {
    const text = draft.trim();
    if (!text) return;
    s.report(text, "typed");
    setDraft("");
  }

  function remove(id: string) {
    s.deleteEntry(id);
    setConfirmId(null);
  }

  const routine = useRoutine();
  function reportArgs() {
    const at = Date.now();
    const done = missionsToday(routine, at);
    return {
      profile: s.profile, findings, entries, locale, t, l, now: at,
      status: s.status, safety: s.safety, vitals: s.vitals, trend: s.trend,
      streak: checkinStreak(routine, at), missionsDone: MISSIONS.filter((m) => done[m]).length, missionsTotal: MISSIONS.length,
    };
  }
  function exportReport() {
    const a = reportArgs();
    downloadText(buildExport(a), `${l.file.fileName}-${dayKey(a.now)}.txt`);
    setExported(true);
  }
  function exportHtml() {
    const a = reportArgs();
    downloadText(buildHtml(a), `${l.file.fileName}-${dayKey(a.now)}.html`, "text/html;charset=utf-8");
    setExported(true);
  }

  const sourceOptions: SourceFilter[] = ["all", "voice", "typed", "action"];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{l.title}</h1>
        <p className="tabular text-sm text-ink-2">{l.counts(reportCount, findings.length)}</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-5">
          <Card aria-label={l.composerLabel}>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label htmlFor="log-report" className="sr-only">
                {l.composerLabel}
              </label>
              <input
                id="log-report"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={l.placeholder}
                autoComplete="off"
                className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-sm outline-none transition-colors focus:border-accent"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="flex h-11 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-ink disabled:opacity-40"
              >
                <Send className="size-4" aria-hidden /> {l.send}
              </button>
            </form>
            <p className="mt-2.5 flex items-center gap-1.5 px-1 text-xs text-ink-3">
              <Mic className="size-3.5 shrink-0" aria-hidden /> {l.micHint}
            </p>
          </Card>

          <Card>
            {entries.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
                  <MessageSquareText className="size-6" aria-hidden />
                </span>
                <h2 className="mt-4 text-base font-semibold">{l.emptyTitle}</h2>
                <p className="mt-1.5 max-w-[52ch] text-sm leading-relaxed text-ink-2">{l.emptyBody}</p>
                <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-ink-2">{l.emptyHow}</p>
              </div>
            ) : (
              <>
                <div role="search" aria-label={l.filtersLabel} className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={l.sourceLabel}>
                    {sourceOptions.map((o) => (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={source === o}
                        tabIndex={source === o ? 0 : -1}
                        onClick={() => setSource(o)}
                        onKeyDown={(e) => {
                          // Radio group keyboard model: arrows move and select, one tab stop.
                          const i = sourceOptions.indexOf(source);
                          const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                          if (!step) return;
                          e.preventDefault();
                          const next = sourceOptions[(i + step + sourceOptions.length) % sourceOptions.length];
                          setSource(next);
                          (e.currentTarget.parentElement?.querySelector(`[data-source="${next}"]`) as HTMLElement | null)?.focus();
                        }}
                        data-source={o}
                        className={`h-11 rounded-full px-4 text-sm font-medium transition-colors sm:h-9 ${
                          source === o ? "bg-ink text-white" : "bg-sunken text-ink-2 hover:bg-accent-soft hover:text-accent-ink"
                        }`}
                      >
                        {l.sources[o]}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="sr-only" htmlFor="log-symptom">
                      {l.symptomLabel}
                    </label>
                    <select
                      id="log-symptom"
                      value={symptomFilter}
                      onChange={(e) => setSymptom(e.target.value as SymptomId | "all")}
                      className="h-11 rounded-full border border-line bg-surface px-4 text-sm outline-none transition-colors focus:border-accent sm:h-10 sm:w-56"
                    >
                      <option value="all">{l.allSymptoms}</option>
                      {logSymptoms.map((id) => (
                        <option key={id} value={id}>
                          {t.symptoms[id].label}
                        </option>
                      ))}
                    </select>
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
                      <label className="sr-only" htmlFor="log-search">
                        {l.searchLabel}
                      </label>
                      <input
                        id="log-search"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={l.searchPlaceholder}
                        className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm outline-none transition-colors focus:border-accent sm:h-10"
                      />
                    </div>
                  </div>
                  {filtering && (
                    <div className="flex items-center justify-between gap-2 text-xs text-ink-3">
                      <span className="tabular" aria-live="polite">
                        {l.shown(filtered.length, entries.length)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSource("all");
                          setSymptom("all");
                          setQuery("");
                        }}
                        className="flex h-9 items-center gap-1 rounded-full px-3 font-medium text-accent-ink hover:bg-accent-soft"
                      >
                        <X className="size-3.5" aria-hidden /> {l.clearFilters}
                      </button>
                    </div>
                  )}
                </div>

                {groups.length === 0 ? (
                  <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-3">{l.noMatches}</p>
                ) : (
                  <div className="mt-5 flex flex-col gap-5">
                    {groups.map((g) => (
                      <section key={g.key} aria-labelledby={`day-${g.key}`}>
                        <h2
                          id={`day-${g.key}`}
                          className="sticky top-0 z-10 -mx-1 mb-2 flex items-baseline gap-1.5 bg-surface/95 px-1 py-1.5 text-[13px] font-bold tracking-wide text-ink uppercase backdrop-blur-sm"
                        >
                          {dayLabel(g.at, now, locale, l)}
                          <span className="tabular text-xs font-medium tracking-normal text-ink-3 normal-case">· {l.dayCount(g.entries.length)}</span>
                        </h2>
                        <ol className="space-y-2">
                          {g.entries.map((e) => (
                            <LogEntryItem
                              key={e.id}
                              entry={e}
                              resolved={resolvedById.get(e.id) ?? []}
                              findings={findings}
                              confirming={confirmId === e.id}
                              onAskDelete={() => setConfirmId(e.id)}
                              onCancelDelete={() => setConfirmId(null)}
                              onDelete={() => remove(e.id)}
                              t={t}
                              l={l}
                              locale={locale}
                            />
                          ))}
                        </ol>
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <SectionTitle>{l.timelineTitle}</SectionTitle>
            <SymptomTimeline spans={spans} now={now} t={t} l={l} locale={locale} />
          </Card>
          <Card>
            <SectionTitle>{l.exportTitle}</SectionTitle>
            <p className="text-sm leading-relaxed text-ink-2">{entries.length ? l.exportBody : l.exportEmpty}</p>
            <button
              type="button"
              onClick={exportReport}
              disabled={!entries.length}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent"
            >
              <Download className="size-4" aria-hidden /> {l.exportButton}
            </button>
            <button
              type="button"
              onClick={exportHtml}
              disabled={!entries.length}
              aria-describedby="export-html-hint"
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent-soft px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent-soft disabled:hover:text-accent-ink"
            >
              <FileText className="size-4" aria-hidden /> {l.exportHtml}
            </button>
            <p id="export-html-hint" className="mt-1.5 text-center text-xs text-ink-3">
              {l.exportHtmlHint}
            </p>
            <p className="mt-2 min-h-4 text-center text-xs text-ink-3" aria-live="polite">
              {exported ? l.exportDone : ""}
            </p>
          </Card>
        </aside>
      </div>

    </div>
  );
}

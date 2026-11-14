"use client";

import { ExternalLink, FlaskConical, Info, Radiation, Users, Satellite, Orbit, Wind, type LucideIcon } from "lucide-react";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useLocale, useT } from "@/lib/i18n";
import { HAZARDS, SOURCES, hazardLoad, hazardsOf, scienceMessages, type Hazard, type SourceId } from "@/lib/science/nasa";
import { Card, SEVERITY_CHIP, SectionTitle } from "@/components/health/ui";

const HAZARD_ICON: Record<Hazard, LucideIcon> = {
  radiation: Radiation,
  isolation: Users,
  distance: Satellite,
  gravity: Orbit,
  environment: Wind,
};

function SourceLink({ id }: { id: SourceId }) {
  const s = SOURCES[id];
  return (
    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-accent-ink underline-offset-2 hover:underline">
      {s.org} · {s.title}
      <ExternalLink className="size-3 shrink-0" aria-hidden />
    </a>
  );
}

/** The five NASA HRP hazards, how today's symptoms map to them, and where every limit comes from. */
export function ScienceView() {
  const { findings } = useCrewSession();
  const t = useT();
  const c = scienceMessages[useLocale()];
  const load = hazardLoad(findings);
  const used = [...new Set([...HAZARDS.flatMap((h) => c.hazards[h].sources), ...c.limits.map((l) => l.source)])];

  return (
    <div className="flex w-full max-w-[960px] flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{c.title}</h1>
        <p className="max-w-[72ch] text-sm text-ink-2">{c.subtitle}</p>
      </header>

      <ul className="grid gap-3 md:grid-cols-2">
        {HAZARDS.map((h) => {
          const hz = c.hazards[h];
          const Icon = HAZARD_ICON[h];
          const linked = findings.filter((f) => hazardsOf(f).includes(h));
          const active = load[h] > 0;
          return (
            <li key={h} id={h} className="scroll-mt-6">
              <Card className={`h-full ${active ? "ring-2 ring-accent/30" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${active ? "bg-accent text-white" : "bg-accent-soft text-accent-ink"}`}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold">{hz.name}</h2>
                    <p className="text-xs text-ink-3">{hz.short}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink">{hz.body}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                  <FlaskConical className="mr-1 inline size-3.5 align-[-2px] text-accent-ink" aria-hidden />
                  {hz.countermeasure}
                </p>
                <div className="mt-3 rounded-2xl bg-sunken px-3 py-2.5">
                  <p className="text-xs font-semibold text-ink-2">{active ? c.activeNow(linked.length) : c.noneNow}</p>
                  {linked.length > 0 && (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {linked.map((f) => (
                        <li key={f.id} className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${SEVERITY_CHIP[f.severity]}`}>
                          {t.symptoms[f.id].label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mt-3 flex flex-col items-start gap-1">
                  {hz.sources.map((id) => (
                    <SourceLink key={id} id={id} />
                  ))}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <Card aria-labelledby="limits-title">
        <SectionTitle>
          <span id="limits-title">{c.limitsTitle}</span>
        </SectionTitle>
        <p className="-mt-1 mb-3 max-w-[72ch] text-[13px] text-ink-2">{c.limitsIntro}</p>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-x-1 border-spacing-y-1 text-left text-sm">
            <thead className="text-xs text-ink-3">
              <tr>
                <th className="px-2 font-semibold">{c.cols.item}</th>
                <th className="px-2 font-semibold">{c.cols.value}</th>
                <th className="px-2 font-semibold">{c.cols.kind}</th>
                <th className="px-2 font-semibold">{c.cols.source}</th>
              </tr>
            </thead>
            <tbody>
              {c.limits.map((l) => (
                <tr key={l.label} className="align-top">
                  <td className="rounded-l-xl bg-sunken px-2 py-2 font-semibold">{l.label}</td>
                  <td className="bg-sunken px-2 py-2">
                    <span className="tabular">{l.value}</span>
                    <span className="block text-xs text-ink-3">{l.note}</span>
                  </td>
                  <td className="bg-sunken px-2 py-2">
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                        l.provenance === "real" ? "bg-ok-soft text-ok" : "bg-mild-soft text-mild"
                      }`}
                    >
                      {c.provenance[l.provenance]}
                    </span>
                  </td>
                  <td className="rounded-r-xl bg-sunken px-2 py-2">
                    <SourceLink id={l.source} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card aria-labelledby="sim-title" className="bg-sunken shadow-none">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
          <div>
            <h2 id="sim-title" className="font-semibold">
              {c.simTitle}
            </h2>
            <p className="mt-1 max-w-[72ch] text-sm leading-relaxed text-ink-2">{c.simBody}</p>
            <p className="mt-2 text-xs text-ink-3">{c.disclaimer}</p>
          </div>
        </div>
      </Card>

      <Card aria-labelledby="sources-title">
        <SectionTitle>
          <span id="sources-title">{c.sourcesLabel}</span>
        </SectionTitle>
        <ol className="grid gap-1.5">
          {used.map((id) => (
            <li key={id}>
              <SourceLink id={id} />
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

"use client";

import { Check, Keyboard, Mic, X } from "lucide-react";
import type { Finding, Region, SymptomId, TranscriptEntry } from "@/lib/health/types";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useLocale, useT } from "@/lib/i18n";
import { bodyMessages } from "@/lib/i18n/pages/body";
import { Card, SEVERITY_CHIP, SectionTitle, adviceOf, timeOf } from "@/components/health/ui";
import { relativeTime, useNow } from "./useNow";

/**
 * Regions of symptoms whose location never depends on the phrase (mirrors the
 * rules in lib/health/symptoms.ts). Limb symptoms (arm/leg pain, numbness) are
 * left out: their side is only known while the finding is active.
 */
const FIXED_REGIONS: Partial<Record<SymptomId, Region[]>> = {
  chest_pain: ["torso"],
  dyspnea: ["torso"],
  fainting: ["head"],
  bleeding: ["head"],
  palpitations: ["torso"],
  dizziness: ["head"],
  vision: ["head"],
  fever: ["head", "torso"],
  nausea: ["abdomen"],
  abdominal_pain: ["abdomen"],
  headache: ["head"],
  congestion: ["head"],
  cough: ["torso"],
  back_pain: ["torso"],
  muscle_pain: ["leftArm", "rightArm", "leftLeg", "rightLeg"],
  fatigue: ["head", "torso", "abdomen", "leftArm", "rightArm", "leftLeg", "rightLeg"],
  anxiety: ["head"],
};

function regionsOf(id: SymptomId, findings: Finding[]): Region[] {
  return findings.find((f) => f.id === id)?.regions ?? FIXED_REGIONS[id] ?? [];
}

/** Reports (not button actions) whose recognised, non-dismissed symptoms touch the region. */
function pastReports(region: Region, entries: TranscriptEntry[], findings: Finding[]) {
  const out: { entry: TranscriptEntry; ids: SymptomId[] }[] = [];
  for (const entry of entries) {
    if (entry.source === "action" || !entry.text) continue;
    const ids = entry.findings.filter((id) => !entry.dismissed?.includes(id) && regionsOf(id, findings).includes(region));
    if (ids.length) out.push({ entry, ids });
  }
  return out;
}

export function RegionDetail({ region }: { region: Region }) {
  const s = useCrewSession();
  const t = useT();
  const locale = useLocale();
  const b = bodyMessages[locale];
  const now = useNow();

  const active = s.findings.filter((f) => f.regions.includes(region));
  const past = pastReports(region, s.entries, s.findings);
  const sev = s.regions[region];

  const act = (f: Finding, kind: "resolve" | "dismiss") => {
    if (kind === "resolve") s.resolveFinding(f.id);
    else s.dismissFinding(f.id);
  };

  return (
    <Card aria-labelledby="region-detail-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="region-detail-title" className="text-lg font-bold tracking-tight">
          {t.regions[region]}
        </h2>
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${SEVERITY_CHIP[sev]}`}>{t.severity[sev]}</span>
      </div>

      <SectionTitle>{b.activeTitle}</SectionTitle>
      {active.length ? (
        <ul className="space-y-2.5">
          {active.map((f) => (
            <li key={f.id} className="rounded-2xl bg-sunken px-3.5 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{t.symptoms[f.id].label}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${SEVERITY_CHIP[f.severity]}`}>{t.severity[f.severity]}</span>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-ink">{adviceOf(f, t)}</p>
              <p className="mt-2 text-xs text-ink-2">
                <time dateTime={new Date(f.reportedAt).toISOString()} title={timeOf(f.reportedAt, locale)}>
                  {b.reported(now ? relativeTime(f.reportedAt, now, locale) : timeOf(f.reportedAt, locale))}
                </time>
                {f.evidence && (
                  <>
                    {" · "}
                    <span className="sr-only">{b.evidence}: </span>
                    <q className="italic">{f.evidence}</q>
                  </>
                )}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => act(f, "resolve")}
                  className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-ok-soft sm:min-h-9"
                >
                  <Check className="size-4 text-ok" aria-hidden />
                  {b.resolve}
                  <span className="sr-only">: {t.symptoms[f.id].label}</span>
                </button>
                <button
                  type="button"
                  onClick={() => act(f, "dismiss")}
                  className="flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-ink-2 transition-colors hover:bg-surface sm:min-h-9"
                >
                  <X className="size-4" aria-hidden />
                  {b.dismiss}
                  <span className="sr-only">: {t.symptoms[f.id].label}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-2">{b.noActive}</p>
      )}

      <div className="mt-6">
        <SectionTitle aside={past.length ? String(past.length) : undefined}>{b.pastTitle}</SectionTitle>
        {past.length ? (
          <ul className="divide-y divide-line">
            {past.map(({ entry, ids }) => {
              const SourceIcon = entry.source === "voice" ? Mic : Keyboard;
              return (
                <li key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="flex items-center gap-1.5 text-xs text-ink-2">
                    <SourceIcon className="size-3.5" aria-hidden />
                    <span className="sr-only">{entry.source === "voice" ? b.voice : b.typed} · </span>
                    <time dateTime={new Date(entry.at).toISOString()} title={timeOf(entry.at, locale)}>
                      {now ? relativeTime(entry.at, now, locale) : timeOf(entry.at, locale)}
                    </time>
                  </p>
                  <p className="mt-1 text-sm leading-snug text-ink">
                    <q>{entry.text}</q>
                  </p>
                  <p className="mt-1 text-xs text-ink-2">{ids.map((id) => t.symptoms[id].label).join(", ")}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">{b.noPast}</p>
        )}
      </div>
    </Card>
  );
}

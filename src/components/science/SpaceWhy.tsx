"use client";

import Link from "next/link";
import { ChevronDown, Orbit } from "lucide-react";
import type { Finding } from "@/lib/health/types";
import { useLocale } from "@/lib/i18n";
import { hazardsOf, scienceMessages, SOURCES, whyInSpace } from "@/lib/science/nasa";

/** "Why in space?": the NASA hazards behind a symptom, a plain explanation and its source. */
export function SpaceWhy({ finding, className = "" }: { finding: Finding; className?: string }) {
  const c = scienceMessages[useLocale()];
  const hazards = hazardsOf(finding);
  const why = whyInSpace(finding, c);
  if (!why || !hazards.length) return null;
  const source = SOURCES[c.hazards[hazards[0]].sources[0]];

  return (
    <details className={`group ${className}`}>
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-accent-ink [&::-webkit-details-marker]:hidden">
        <Orbit className="size-3.5 shrink-0" aria-hidden />
        {c.whyTitle}
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-1 space-y-1.5 text-[13px] leading-snug text-ink-2">
        <p>{why}</p>
        <ul className="flex flex-wrap gap-1" aria-label={c.hazardsLabel}>
          {hazards.map((h) => (
            <li key={h}>
              <Link href={`/ciencia#${h}`} className="inline-block rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent-ink hover:underline">
                {c.hazards[h].name}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-3">
          {c.sourcesLabel}:{" "}
          <a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink-2">
            {source.org} · {source.title}
          </a>
        </p>
      </div>
    </details>
  );
}

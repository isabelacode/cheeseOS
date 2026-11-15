"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { REGIONS, type Region, type Severity } from "@/lib/health/types";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useLocale, useT } from "@/lib/i18n";
import { bodyMessages } from "@/lib/i18n/pages/body";
import { Card, SEVERITY_CHIP, SectionTitle } from "@/components/health/ui";
import { HEAT_COLORS } from "@/components/twin/heat";

/**
 * Accessible twin of the 3D view: every region as a button with its severity in words.
 * With complaints on the body, only those regions show until the crew asks for all of them.
 */
export function RegionList({ selected, onSelect }: { selected: Region | null; onSelect: (r: Region | null) => void }) {
  const { findings, regions } = useCrewSession();
  const t = useT();
  const b = bodyMessages[useLocale()];
  const [showAll, setShowAll] = useState(false);

  const withComplaint = REGIONS.filter((r) => regions[r] > 0);
  const collapsible = withComplaint.length > 0 && withComplaint.length < REGIONS.length;
  const visible = collapsible && !showAll ? REGIONS.filter((r) => regions[r] > 0 || r === selected) : REGIONS;

  return (
    <Card aria-labelledby="regions-title">
      <SectionTitle aside={b.regionsHint(withComplaint.length, REGIONS.length)}>
        <span id="regions-title">{b.regionsTitle}</span>
      </SectionTitle>
      <ul id="region-list" className="-mx-1.5 space-y-1">
        {visible.map((r) => {
          const sev: Severity = regions[r];
          const count = findings.filter((f) => f.regions.includes(r)).length;
          const on = selected === r;
          return (
            <li key={r}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(on ? null : r)}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors duration-200 ${
                  on ? "bg-accent-soft" : "hover:bg-sunken"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${on ? "text-accent-ink" : ""}`}>{t.regions[r]}</span>
                  <span className="sr-only">, </span>
                  <span className="block text-xs text-ink-2">{count ? b.activeCount(count) : b.noFindings}</span>
                </span>
                {sev > 0 && (
                  <>
                    <span className="sr-only">, </span>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold ${SEVERITY_CHIP[sev]}`}>{t.severity[sev]}</span>
                  </>
                )}
                <ChevronRight className={`size-4 shrink-0 transition-transform duration-200 ${on ? "text-accent-ink" : "text-ink-3"}`} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {collapsible && (
        <button
          type="button"
          aria-expanded={showAll}
          aria-controls="region-list"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 flex min-h-11 items-center gap-1.5 rounded-full px-1.5 text-[13px] font-semibold text-accent-ink hover:underline sm:min-h-9"
        >
          <ChevronDown className={`size-4 transition-transform duration-200 ${showAll ? "rotate-180" : ""}`} aria-hidden />
          {showAll ? b.showActive : b.showAll(REGIONS.length)}
        </button>
      )}
      <p className="mt-3 text-xs text-ink-3">{b.sideHint}</p>
    </Card>
  );
}

/** Heat colours in words; the same tints as the shader in twin/CrewModel. */
export function HeatLegend() {
  const t = useT();
  const b = bodyMessages[useLocale()];
  const items: Severity[] = [1, 2, 3];
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 max-w-[calc(100%-2rem)]">
      <div className="pointer-events-auto rounded-2xl bg-surface/90 px-3.5 py-2.5 shadow-card backdrop-blur-sm">
        <p className="text-xs font-semibold text-ink">{b.legendTitle}</p>
        <ul className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-2">
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full ring-1 ring-line" style={{ background: HEAT_COLORS[0] }} aria-hidden />
            {b.legendNone}
          </li>
          {items.map((sev) => (
            <li key={sev} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: HEAT_COLORS[sev] }} aria-hidden />
              {t.severity[sev]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import type { Severity, Vitals } from "@/lib/health/types";
import { BASELINE } from "@/lib/health/vitals";
import { useLocale, useT } from "@/lib/i18n";
import { nowMessages } from "@/lib/i18n/pages/now";
import { Card, SectionTitle, SEVERITY_CHIP, VITAL_ICON, formatVital, spec } from "@/components/health/ui";

type Position = "in" | "above" | "below";

/** In range exactly when the rules say so (severity 0); otherwise which side of the baseline. */
function position(key: (typeof KEYS)[number], v: Vitals): Position {
  if (spec(key).assess(v) === 0) return "in";
  return v[key] > BASELINE[key] ? "above" : "below";
}

const KEYS = ["temperature", "systolic", "respiration", "heartRate", "spo2"] as const;

/** How many of the vitals shown here are outside their range. */
export function vitalsOutOfRange(v: Vitals): number {
  return KEYS.filter((key) => spec(key).assess(v) >= 2).length;
}

/** All vitals at a glance; each tile opens its detail on /sinais. `plain` drops the card frame. */
export function VitalsStrip({ vitals, plain = false }: { vitals: Vitals; plain?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const n = nowMessages[locale];

  const list = (
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-5">
        {KEYS.map((key) => {
          const s = spec(key);
          const sev = s.assess(vitals);
          const Icon = VITAL_ICON[key];
          const copy = t.vitals[key];
          const pos = position(key, vitals);
          const tone: Severity = sev >= 2 ? sev : 0;
          return (
            <li key={key}>
              <Link
                href={`/vitals?v=${key}`}
                // The label replaces the tile's text for assistive tech, so it must carry the reading too.
                aria-label={`${n.openVital(copy.label)} (${formatVital(s, vitals, locale)} ${s.unit}, ${n.vitalState[pos]})`}
                className="flex h-full flex-col gap-1.5 rounded-2xl bg-sunken px-3 py-2.5 transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="flex items-center gap-1.5 text-sm text-ink-2">
                  <Icon className={`size-3.5 shrink-0 ${sev >= 3 ? "text-crit" : sev >= 2 ? "text-warn" : "text-ink-3"}`} aria-hidden />
                  <span className="leading-tight">{copy.label}</span>
                </span>
                <span className="flex items-baseline gap-1">
                  <span className={`tabular text-lg leading-none font-bold ${sev >= 3 ? "text-crit" : sev >= 2 ? "text-warn" : ""}`}>
                    {formatVital(s, vitals, locale)}
                  </span>
                  <span className="text-xs font-semibold text-ink-3">{s.unit}</span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${
                      pos === "in" ? SEVERITY_CHIP[0] : tone ? SEVERITY_CHIP[tone] : "bg-surface text-ink-2"
                    }`}
                  >
                    {n.vitalState[pos]}
                  </span>
                  <span className="tabular text-xs text-ink-3">{copy.range}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
  );
  if (plain) return list;
  return (
    <Card aria-label={n.vitalsTitle}>
      <SectionTitle aside={n.vitalsAside}>{n.vitalsTitle}</SectionTitle>
      {list}
    </Card>
  );
}

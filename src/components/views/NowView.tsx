"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useLocale, useT } from "@/lib/i18n";
import { nowMessages } from "@/lib/i18n/pages/now";
import { TOUCH_OPTIONS } from "@/lib/health/touch";
import type { Region } from "@/lib/health/types";
import { ActionPlan } from "@/components/now/ActionPlan";
import { LastReport, ReportComposer } from "@/components/health/ReportComposer";
import { BodyPanel } from "@/components/health/BodyPanel";
import { VitalsStrip, vitalsOutOfRange } from "@/components/now/VitalsStrip";
import { SafetyAlerts } from "@/components/health/SafetyAlerts";
import { MissionsCard } from "@/components/routine/MissionsCard";
import { SleepCard } from "@/components/routine/SleepCard";

/** A quiet row that opens on demand: on a good day the detail stays out of the way. */
function Line({ title, aside, tone = "", open = false, children }: { title: string; aside: string; tone?: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="group border-t border-line last:border-b" open={open}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-1 py-3 text-[17px] [&::-webkit-details-marker]:hidden">
        <span className={`flex-1 font-bold ${tone}`}>{title}</span>
        <span className="text-base text-ink-2">{aside}</span>
        <ChevronDown className="size-5 text-ink-2 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-1 pb-5">{children}</div>
    </details>
  );
}

/** "How are you": one question and one action; with a symptom, what to do about it. */
export function NowView() {
  const s = useCrewSession();
  const t = useT();
  const locale = useLocale();
  const n = nowMessages[locale];
  const [draft, setDraft] = useState("");
  const [region, setRegion] = useState<Region | null>(null);

  const out = vitalsOutOfRange(s.vitals);

  const active = new Set(s.findings.map((f) => f.id));
  const options = region ? TOUCH_OPTIONS[region].filter((o) => !active.has(o.id)) : [];
  const calm = s.status === "nominal";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:items-start lg:gap-12 lg:pt-4">
      <div className="flex min-w-0 flex-col gap-7">
        <SafetyAlerts />
        <ActionPlan />
        <ReportComposer
          draft={draft}
          setDraft={setDraft}
          compact={!calm}
          onSubmit={(text) => {
            s.report(text, "typed");
            setDraft("");
          }}
        />
        <LastReport logHref="/relatos" />
        {/* Exercise and streaks contradict "stop the activity". */}
        {s.status !== "critical" && <MissionsCard plain />}
        {s.status !== "critical" && <SleepCard />}
        <div>
          <Line
            title={out ? n.vitalsOut(out) : n.vitalsIn(5)}
            aside={n.vitalsAside}
            tone={out ? "text-warn" : ""}
            // Re-mounting on the edge opens the row when a vital leaves its range and lets the crew member close it again.
            key={out ? "out" : "in"}
            open={out > 0}
          >
            <VitalsStrip vitals={s.vitals} plain />
          </Line>
        </div>
      </div>

      <BodyPanel
        selected={region}
        onSelect={setRegion}
        title={calm ? n.orTouch : n.whereTitle}
        hint={calm ? n.touchHint : n.whereHint}
        className="h-[520px] lg:sticky lg:top-6 lg:h-[calc(100dvh-120px)] lg:min-h-[560px]"
      >
        {region && options.length > 0 && (
          <div className="relative z-10 m-3 rounded-2xl bg-surface/95 p-4 shadow-card lg:absolute lg:inset-x-4 lg:bottom-4 lg:m-0">
            <p className="text-base font-bold">{n.touchAsk(t.regions[region])}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    s.report(o.phrase[locale], "typed");
                    setRegion(null);
                  }}
                  className="min-h-11 rounded-full border-[1.5px] border-line bg-surface px-4 text-sm font-bold transition-colors hover:border-ink hover:bg-sunken"
                >
                  {t.symptoms[o.id].label}
                </button>
              ))}
            </div>
          </div>
        )}
      </BodyPanel>
    </div>
  );
}

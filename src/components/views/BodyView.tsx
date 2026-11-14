"use client";

import { useState } from "react";
import { MousePointerClick } from "lucide-react";
import type { Region } from "@/lib/health/types";
import { useLocale } from "@/lib/i18n";
import { bodyMessages } from "@/lib/i18n/pages/body";
import { BodyPanel } from "@/components/health/BodyPanel";
import { Card } from "@/components/health/ui";
import { HeatLegend, RegionList } from "@/components/body/RegionList";
import { RegionDetail } from "@/components/body/RegionDetail";

export function BodyView() {
  const b = bodyMessages[useLocale()];
  const [selected, setSelected] = useState<Region | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{b.title}</h1>
        <p className="text-sm text-ink-2">{b.subtitle}</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:gap-6">
        <BodyPanel
          selected={selected}
          onSelect={setSelected}
          className="h-[460px] lg:sticky lg:top-6 lg:h-[calc(100dvh-170px)] lg:min-h-[560px]"
        >
          <HeatLegend />
        </BodyPanel>
        <div className="flex min-w-0 flex-col gap-5">
          <RegionList selected={selected} onSelect={setSelected} />
          {selected ? (
            <RegionDetail key={selected} region={selected} />
          ) : (
            <Card>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
                  <MousePointerClick className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">{b.pickRegion}</p>
                  <p className="mt-0.5 text-sm text-ink-2">{b.pickRegionHint}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

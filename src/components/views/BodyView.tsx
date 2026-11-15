"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MousePointerClick } from "lucide-react";
import type { Region } from "@/lib/health/types";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useLocale, useT } from "@/lib/i18n";
import { bodyMessages } from "@/lib/i18n/pages/body";
import { BodyPanel } from "@/components/health/BodyPanel";
import { Card } from "@/components/health/ui";
import { HeatLegend, RegionList } from "@/components/body/RegionList";
import { RegionDetail } from "@/components/body/RegionDetail";

export function BodyView() {
  const b = bodyMessages[useLocale()];
  const t = useT();
  const { findings } = useCrewSession();
  const [selected, setSelected] = useState<Region | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const select = useCallback((r: Region | null) => {
    setSelected(r);
    if (!r || window.matchMedia("(min-width: 1024px)").matches) return;
    // Phones stack the twin above the detail: bring the detail into view and move focus to it.
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      detailRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      headingRef.current?.focus({ preventScroll: true });
    });
  }, []);

  // Esc clears the selection unless focus is in a field or a dialog is handling it.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, dialog, details[open]")) return;
      setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const selectedCount = selected ? findings.filter((f) => f.regions.includes(selected)).length : 0;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{b.title}</h1>
        <p className="text-sm text-ink-2">{b.subtitle}</p>
      </header>
      <p className="sr-only" role="status">
        {selected ? b.selectedLive(t.regions[selected], selectedCount) : ""}
      </p>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:gap-6">
        <BodyPanel
          selected={selected}
          onSelect={select}
          className="h-[460px] lg:sticky lg:top-6 lg:h-[calc(100dvh-170px)] lg:min-h-[560px]"
        >
          <HeatLegend />
        </BodyPanel>
        <div className="flex min-w-0 flex-col gap-5">
          <div ref={detailRef} className="scroll-mt-4">
            {selected ? (
              <RegionDetail key={selected} region={selected} onClear={() => setSelected(null)} headingRef={headingRef} />
            ) : findings.length === 0 ? (
              <Card>
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-ok-soft text-ok">
                    <CheckCircle2 className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold">{b.allClearTitle}</p>
                    <p className="mt-0.5 text-sm text-ink-2">{b.allClearHint}</p>
                    <Link href="/#relatos" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent-ink hover:underline sm:min-h-9">
                      {b.allClearCta}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              </Card>
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
          <RegionList selected={selected} onSelect={select} />
        </div>
      </div>
    </div>
  );
}

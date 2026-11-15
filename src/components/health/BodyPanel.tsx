"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import type { Region } from "@/lib/health/types";
import { regionLabels } from "@/lib/health/regions";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useLocale, useT } from "@/lib/i18n";
import { bodyMessages } from "@/lib/i18n/pages/body";
import { SEVERITY_CHIP } from "./ui";

function SceneLoading() {
  const t = useT();
  return <div className="grid h-full place-items-center text-sm text-ink-3">{t.dashboard.loadingScene}</div>;
}

const TwinScene = dynamic(() => import("@/components/twin/TwinScene"), { ssr: false, loading: () => <SceneLoading /> });

export function useRegionLabels() {
  const { findings } = useCrewSession();
  const t = useT();
  return useMemo(() => regionLabels(findings, (f) => t.symptoms[f.id].label), [findings, t]);
}

/**
 * The 3D twin with its region tooltip. `selected`/`onSelect` may be controlled
 * by the page (the Body route lists regions beside it).
 */
export function BodyPanel({
  className = "",
  selected: controlled,
  onSelect,
  title,
  hint,
  children,
}: {
  className?: string;
  /** Caption shown while no region is in focus; defaults to the generic body hint. */
  title?: string;
  hint?: string;
  selected?: Region | null;
  onSelect?: (r: Region | null) => void;
  children?: ReactNode;
}) {
  const { findings, regions, vitals, profile } = useCrewSession();
  const t = useT();
  const d = t.dashboard;
  const b = bodyMessages[useLocale()];
  const labels = useRegionLabels();
  const [own, setOwn] = useState<Region | null>(null);
  const [hovered, setHovered] = useState<Region | null>(null);
  const selected = controlled !== undefined ? controlled : own;
  const select = onSelect ?? setOwn;
  const focus = selected ?? hovered;
  const focusFindings = focus ? findings.filter((f) => f.regions.includes(focus)) : [];

  return (
    <section
      aria-label={d.bodyRegion}
      className={`relative flex flex-col overflow-hidden rounded-[28px] bg-[radial-gradient(120%_80%_at_50%_35%,#fbfbf9_0%,#e6e8e2_70%,#dcdfd8_100%)] shadow-card ${className}`}
    >
      {/* Below lg the caption sits above the canvas so it never covers the head hotspot. */}
      <div className="relative z-10 mx-3 mt-3 lg:pointer-events-none lg:absolute lg:top-4 lg:left-4 lg:m-0 lg:max-w-[min(260px,calc(100%-10rem))]">
        <div className="rounded-2xl bg-surface/90 px-4 py-2.5 shadow-card backdrop-blur-sm lg:pointer-events-auto lg:py-3">
          {focus ? (
            <>
              <p className="text-sm font-semibold">{t.regions[focus]}</p>
              {focusFindings.length ? (
                <ul className="mt-1.5 space-y-1.5">
                  {focusFindings.map((f) => (
                    <li key={f.id} className="text-xs text-ink-2">
                      <span className={`mr-1.5 rounded-md px-1.5 py-0.5 font-semibold ${SEVERITY_CHIP[f.severity]}`}>{t.severity[f.severity]}</span>
                      {t.symptoms[f.id].label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5 text-xs text-ink-2">{b.noFindings}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-base font-bold">{title ?? d.body}</p>
              <p className="mt-0.5 text-sm text-ink-2">{hint ?? d.bodyHint}</p>
            </>
          )}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 lg:absolute lg:inset-0">
        <TwinScene
          severity={regions}
          labels={labels}
          selected={selected}
          hovered={hovered}
          onSelect={select}
          onHover={setHovered}
          respiration={vitals.respiration}
          femininity={profile.sex === "feminino" ? 1 : profile.sex === "masculino" ? 0 : 0.5}
        />
      </div>
      {children}
    </section>
  );
}

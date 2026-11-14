"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import type { Region } from "@/lib/health/types";
import { useCrewSession } from "@/lib/session/CrewSession";
import { useT } from "@/lib/i18n";
import { SEVERITY_CHIP } from "./ui";

function SceneLoading() {
  const t = useT();
  return <div className="grid h-full place-items-center text-sm text-ink-3">{t.dashboard.loadingScene}</div>;
}

const TwinScene = dynamic(() => import("@/components/twin/TwinScene"), { ssr: false, loading: () => <SceneLoading /> });

/** Region labels: one per region; whole-body symptoms keep a single tag on the torso. */
export function useRegionLabels() {
  const { findings } = useCrewSession();
  const t = useT();
  return useMemo(() => {
    const out: Partial<Record<Region, string>> = {};
    const count: Partial<Record<Region, number>> = {};
    for (const f of findings) {
      if (f.regions.length > 3) {
        count.torso = (count.torso ?? 0) + 1;
        out.torso ??= t.symptoms[f.id].label;
        continue;
      }
      for (const r of f.regions) {
        count[r] = (count[r] ?? 0) + 1;
        out[r] ??= t.symptoms[f.id].label; // findings are sorted most severe first
      }
    }
    for (const r of Object.keys(out) as Region[]) if ((count[r] ?? 0) > 1) out[r] = `${out[r]} +${count[r]! - 1}`;
    return out;
  }, [findings, t]);
}

/**
 * The 3D twin with its region tooltip. `selected`/`onSelect` may be controlled
 * by the page (the Body route lists regions beside it).
 */
export function BodyPanel({
  className = "",
  selected: controlled,
  onSelect,
  children,
}: {
  className?: string;
  selected?: Region | null;
  onSelect?: (r: Region | null) => void;
  children?: ReactNode;
}) {
  const { findings, regions, vitals, profile } = useCrewSession();
  const t = useT();
  const d = t.dashboard;
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
      className={`relative overflow-hidden rounded-[28px] bg-[radial-gradient(120%_80%_at_50%_35%,#f7f8fb_0%,#e3e8f0_70%,#dbe1ea_100%)] shadow-card ${className}`}
    >
      <div className="absolute inset-0">
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
      <div className="pointer-events-none absolute top-4 left-4 max-w-[260px]">
        <div className="pointer-events-auto rounded-2xl bg-surface/90 px-4 py-3 shadow-card backdrop-blur-sm" aria-live="polite">
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
                <p className="mt-0.5 text-xs text-ink-2">{d.noComplaints}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">{d.body}</p>
              <p className="mt-0.5 text-xs text-ink-2">{d.bodyHint}</p>
            </>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

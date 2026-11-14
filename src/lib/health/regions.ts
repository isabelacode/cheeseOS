import type { Finding, Region } from "./types";

/**
 * The region that carries a finding's tag: its first region, or the torso for
 * whole-body symptoms. Other regions it touches are tinted but not tagged, so
 * one symptom never shows as two tags (e.g. fever on head and torso).
 */
export function primaryRegion(f: Finding): Region {
  return f.regions.length > 3 ? "torso" : (f.regions[0] ?? "torso");
}

/** Region labels: each finding tagged once, at its primary region; "+N" counts distinct findings. */
export function regionLabels(findings: Finding[], label: (f: Finding) => string): Partial<Record<Region, string>> {
  const byRegion = new Map<Region, Finding[]>();
  for (const f of findings) {
    const r = primaryRegion(f);
    if (!byRegion.get(r)?.some((x) => x.id === f.id)) byRegion.set(r, [...(byRegion.get(r) ?? []), f]);
  }
  const out: Partial<Record<Region, string>> = {};
  for (const [r, list] of byRegion) out[r] = list.length > 1 ? `${label(list[0])} +${list.length - 1}` : label(list[0]); // most severe first
  return out;
}

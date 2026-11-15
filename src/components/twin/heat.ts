import type { Severity } from "@/lib/health/types";

/** Heat tints per severity: one source for the shader, the legend and the hotspots (globals.css mirrors these). */
export const HEAT_COLORS: Record<Severity, string> = {
  0: "#e3e6eb",
  1: "#e8b54a",
  2: "#e07b2e",
  3: "#d63b3b",
};

import { formatNumber, type Locale } from "@/lib/i18n/locale";

/**
 * Small instruction models that run in the browser through transformers.js.
 * Sizes are the q4f16 (WebGPU) and q4 (CPU) downloads; weights are cached by
 * the browser after the first load, so later sessions work offline.
 */
export interface BrowserModel {
  id: string;
  label: string;
  gpuMb: number;
  cpuMb: number;
}

export const BROWSER_MODELS: BrowserModel[] = [
  // Both are Apache 2.0 (OSI open source), as Space Apps requires for third-party materials.
  // Default: follows instructions better and writes better Portuguese than the 350M model.
  { id: "onnx-community/granite-4.0-1b-ONNX-web", label: "Granite 4.0 1B", gpuMb: 1190, cpuMb: 1700 },
  { id: "onnx-community/granite-4.0-350m-ONNX-web", label: "Granite 4.0 350M", gpuMb: 330, cpuMb: 550 },
];

export const DEFAULT_BROWSER_MODEL = BROWSER_MODELS[0];

/** The chosen model, then every smaller one, largest first: the order tried when a load fails. */
export function fallbackChain(chosen: BrowserModel): BrowserModel[] {
  const smaller = BROWSER_MODELS.filter((m) => m.id !== chosen.id && m.gpuMb < chosen.gpuMb).sort((a, b) => b.gpuMb - a.gpuMb);
  return [chosen, ...smaller];
}

const KEY = "cheeseos.browser-model.v1";

export function browserModelById(id: string | null | undefined): BrowserModel {
  return BROWSER_MODELS.find((m) => m.id === id) ?? DEFAULT_BROWSER_MODEL;
}

export function readBrowserModel(): BrowserModel {
  try {
    return browserModelById(window.localStorage.getItem(KEY));
  } catch {
    return DEFAULT_BROWSER_MODEL;
  }
}

export function saveBrowserModel(id: string) {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* per-session only */
  }
}

export function formatSize(mb: number, locale: Locale) {
  return mb >= 1000 ? `${formatNumber(mb / 1000, 1, locale)} GB` : `${mb} MB`;
}

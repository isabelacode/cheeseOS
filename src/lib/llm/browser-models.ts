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
  { id: "onnx-community/Qwen2.5-0.5B-Instruct", label: "Qwen 2.5 0.5B", gpuMb: 460, cpuMb: 750 },
  { id: "onnx-community/gemma-3-1b-it-ONNX", label: "Gemma 3 1B", gpuMb: 730, cpuMb: 820 },
  { id: "onnx-community/Qwen2.5-1.5B-Instruct", label: "Qwen 2.5 1.5B", gpuMb: 1170, cpuMb: 1700 },
];

export const DEFAULT_BROWSER_MODEL = BROWSER_MODELS[0];

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

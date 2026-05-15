/**
 * Performance mode — lets the kiosk URL opt into a stripped-down visual
 * profile so the app stays smooth on low-power displays (e.g. LG One:Flex).
 *
 * Resolution order (first wins):
 *   1. ?perf=low or ?perf=high in the URL (also persisted to localStorage)
 *   2. localStorage value from a previous visit
 *   3. "high" (the default — preserves the rich design for desktop/preview)
 *
 * Sets `<html data-perf="low">` so CSS rules in `globals.css` can short-
 * circuit expensive effects (backdrop-filter blurs, rotating conic-gradient
 * light-rays, looping breathing/pulse animations, etc.). Components can
 * also call `isLowPerf()` to skip rendering particles / orbit sparkles /
 * heavy confetti bursts at the source.
 *
 * Setup is run **at module load** (top-level) so the `<html>` attribute is
 * set before the first React render — no flash of high-perf-then-strip.
 */

export type PerfMode = "low" | "high";

const STORAGE_KEY = "kiosk_perf";
let currentMode: PerfMode = "high";

function readFromQuery(): PerfMode | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("perf");
  if (v === "low" || v === "high") return v;
  return null;
}

function readFromStorage(): PerfMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "low" || v === "high") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function persist(mode: PerfMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function init(): void {
  if (typeof window === "undefined") return;
  const fromQuery = readFromQuery();
  if (fromQuery) {
    currentMode = fromQuery;
    persist(currentMode);
  } else {
    currentMode = readFromStorage() ?? "high";
  }
  document.documentElement.dataset.perf = currentMode;
}

export function getPerfMode(): PerfMode {
  return currentMode;
}

export function isLowPerf(): boolean {
  return currentMode === "low";
}

// Run once when this module first loads in the browser (before React renders).
if (typeof window !== "undefined") {
  init();
}

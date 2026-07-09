import { useEffect } from "react";

/**
 * Kiosk hardening shared by the standalone presentation pages: portrait
 * orientation lock + multi-touch touchmove prevention (anti pull-to-refresh).
 * Same effects as KioskApp / LuckyDraw.
 */
export function useKioskGuards(): void {
  useEffect(() => {
    const anyScreen = window.screen as unknown as {
      orientation?: { lock?: (o: string) => Promise<void> };
    };
    anyScreen.orientation?.lock?.("portrait").catch(() => {});
  }, []);

  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);
}

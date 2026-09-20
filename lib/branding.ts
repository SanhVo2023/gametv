/**
 * Event-agnostic branding. The kiosk is reused across Mắt Việt events, so
 * nothing in the UI hardcodes an event name, date or venue — set these at
 * build time in `.env.local` (or the host's env vars) and rebuild:
 *
 *   NEXT_PUBLIC_EVENT_TITLE="Mini Game Mắt Việt"
 *   NEXT_PUBLIC_EVENT_TAGLINE="Chơi mini game — nhận quà liền tay"
 *
 * Both are optional; the defaults below are generic.
 */

const clean = (v: string | undefined, fallback: string): string => {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : fallback;
};

/** Brand name — shown on the standby screen and in fixed copy. */
export const BRAND_NAME = "Mắt Việt";

/** Headline of the landing page, phone screen eyebrow and browser tab title. */
export const EVENT_TITLE = clean(process.env.NEXT_PUBLIC_EVENT_TITLE, "Mini Game Mắt Việt");

/** One-line hook under the headline (landing) and on the standby screen. */
export const EVENT_TAGLINE = clean(
  process.env.NEXT_PUBLIC_EVENT_TAGLINE,
  "Chơi mini game — nhận quà liền tay",
);

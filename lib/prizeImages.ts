/**
 * Maps a prize id (the operator's mã hàng, also the GAS Prizes.id) to a local
 * product photo under /public/present/. Vouchers have no photo — they render as
 * a designed gold voucher card instead.
 *
 * To add a gift for a new event: drop a transparent PNG (square, ≤1000 px)
 * into /public/present/, add a row here keyed by the sheet's `id`, and add
 * the same id to the FALLBACK list in components/PrizeMarquee.tsx.
 * `node scripts/validate-prizes.mjs` checks the three stay in sync.
 */

const PRIZE_IMAGES: Record<string, string> = {
  NONMOLSION: "/present/NONMOLSION.png",
  PENBL00001: "/present/PENBL00001.png",
  VICARDBOLON: "/present/VICARDBOLON.png",
  "HK-2204-1": "/present/HK-2204-1.png",
  "HK-BD117": "/present/HK-BD117.png",
  BONUOCRUA3C: "/present/BONUOCRUA3C.png",
};

/**
 * Ids used by earlier sheets for the same physical products. Kept so a sheet
 * that hasn't been re-keyed yet still shows the right photo.
 */
const LEGACY_IDS: Record<string, string> = {
  BUTBOLON: "PENBL00001",
  VIBOLON: "VICARDBOLON",
  HOPKINH: "HK-2204-1",
  BONUOCRUAKINH: "BONUOCRUA3C",
};

export function prizeImage(id: string): string | null {
  return PRIZE_IMAGES[id] ?? PRIZE_IMAGES[LEGACY_IDS[id] ?? ""] ?? null;
}

/**
 * Warm the browser cache with every prize photo. Called once at app start so
 * the wheel's SVG <image> badges render instantly instead of fetching the
 * (large) product photos at spin time.
 */
export function preloadPrizeImages(): void {
  if (typeof window === "undefined") return;
  Object.values(PRIZE_IMAGES).forEach((src) => {
    const img = new window.Image();
    img.src = src;
  });
}

export function isVoucher(id: string): boolean {
  return /voucher/i.test(id);
}

/** A short amount label for voucher prizes, e.g. "100.000đ". */
export function voucherAmount(name: string): string {
  const m = name.match(/(\d[\d.]*)\s*(?:đ|k)?/i);
  return m ? m[1] : name;
}

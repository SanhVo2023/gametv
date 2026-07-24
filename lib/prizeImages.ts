/**
 * Maps a prize id (the operator's mã hàng, also the GAS Prizes.id) to a local
 * product photo under /public/present/. Vouchers have no photo — they render as
 * a designed gold voucher card instead.
 */

const PRIZE_IMAGES: Record<string, string> = {
  "HK-BD117": "/present/HK-BD117.png",
  VIBOLON: "/present/VIBOLON.png",
  BUTBOLON: "/present/BUTBOLON.png",
  NONMOLSION: "/present/NONMOLSION.png",
  HOPKINH: "/present/hop-kinh.png",
  BONUOCRUAKINH: "/present/bo-nuoc-rua-kinh.png",
  TUIBLING: "/present/tui-bling.png",
  VONGDEO: "/present/vong-deo.png",
};

export function prizeImage(id: string): string | null {
  return PRIZE_IMAGES[id] ?? null;
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

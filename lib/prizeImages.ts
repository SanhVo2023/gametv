/**
 * Maps a prize id (the operator's mã hàng, also the GAS Prizes.id) to a local
 * product photo under /public/present/. Vouchers have no photo — they render as
 * a designed gold voucher card instead.
 */

const PRIZE_IMAGES: Record<string, string> = {
  // --- Current event (ids are the operator's mã hàng) ---
  NONMOLSION: "/present/NONMOLSION.png", // Nón kết Molsion
  PENBL00001: "/present/BUTBOLON.png", // Bút bi BOLON
  VICARDBOLON: "/present/VIBOLON.png", // Ví đựng card BOLON
  "HK-2204-1": "/present/hop-kinh.png", // Hộp đựng kính 2204-1 (loại lông vũ)
  "HK-BD117": "/present/HK-BD117.png", // Hộp đựng kính BD117
  BONUOCRUA3C: "/present/BONUOCRUA3C.png", // Bộ nước rửa kính 3 màu
  // --- Legacy ids (previous events) — kept so an older Prizes sheet still renders ---
  VIBOLON: "/present/VIBOLON.png",
  BUTBOLON: "/present/BUTBOLON.png",
  HOPKINH: "/present/hop-kinh.png",
  BONUOCRUAKINH: "/present/bo-nuoc-rua-kinh.png",
  TUIBLING: "/present/tui-bling.png",
  VONGDEO: "/present/vong-deo.png",
};

/**
 * Photo for a prize id. Any id without a photo renders as a voucher card, so
 * the lookup is forgiving about stray whitespace / casing typed into the sheet.
 */
export function prizeImage(id: string): string | null {
  return PRIZE_IMAGES[id] ?? PRIZE_IMAGES[id.trim().toUpperCase()] ?? null;
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

/**
 * Maps a prize id (the operator's mã hàng, also the GAS Prizes.id) to a local
 * product photo under /public/present/. Vouchers have no photo — they render as
 * a designed gold voucher card instead.
 */

const PRIZE_IMAGES: Record<string, string> = {
  "HK-BD117": "/present/HK-BD117.png",
  "HK-BD054": "/present/HK-BD054.png",
  BOOKTRAY2: "/present/BOOKTRAY2.png",
  VIBOLON: "/present/VIBOLON.png",
  BUTBOLON: "/present/BUTBOLON.png",
  NONMOLSION: "/present/NONMOLSION.png",
};

export function prizeImage(id: string): string | null {
  return PRIZE_IMAGES[id] ?? null;
}

export function isVoucher(id: string): boolean {
  return /voucher/i.test(id);
}

/** A short amount label for voucher prizes, e.g. "100.000đ". */
export function voucherAmount(name: string): string {
  const m = name.match(/(\d[\d.]*)\s*(?:đ|k)?/i);
  return m ? m[1] : name;
}

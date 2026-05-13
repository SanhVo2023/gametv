export function normalizePhone(input: string): string {
  return (input ?? "").replace(/\D+/g, "");
}

export function isValidVietnamesePhone(input: string): boolean {
  const normalized = normalizePhone(input);
  if (normalized.length < 9 || normalized.length > 11) return false;
  // Common VN mobile starts: 03, 05, 07, 08, 09 (10 digits) or +84-prefixed (11 digits starting with 84)
  if (normalized.length === 10 && /^0[3-9]\d{8}$/.test(normalized)) return true;
  if (normalized.length === 11 && /^84[3-9]\d{8}$/.test(normalized)) return true;
  return false;
}

export function formatPhoneDisplay(digits: string): string {
  const d = normalizePhone(digits);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 10)}`;
}

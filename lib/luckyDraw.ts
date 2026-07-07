/**
 * Lucky-draw ("rút thăm trúng thưởng") state — pure module, no React.
 *
 * The draw runs entirely on the TV; localStorage is the source of truth so a
 * page reload mid-event restores everything (including a drawn-but-unconfirmed
 * number via `pending`). The GAS backend is only the admin force channel plus
 * a best-effort audit log.
 */

export const TOTAL_NUMBERS = 50;

export interface PrizeSlot {
  /** Tier label shown on screen — never the actual gift. */
  tier: string;
  /** 1-based position within the tier, e.g. Khuyến khích 2/5. */
  nth: number;
  tierTotal: number;
}

/** Draw order: least → most prestigious. Slot index === winners.length. */
export const PRIZE_SLOTS: PrizeSlot[] = [
  { tier: "Giải Khuyến Khích", nth: 1, tierTotal: 5 },
  { tier: "Giải Khuyến Khích", nth: 2, tierTotal: 5 },
  { tier: "Giải Khuyến Khích", nth: 3, tierTotal: 5 },
  { tier: "Giải Khuyến Khích", nth: 4, tierTotal: 5 },
  { tier: "Giải Khuyến Khích", nth: 5, tierTotal: 5 },
  { tier: "Giải Ba", nth: 1, tierTotal: 2 },
  { tier: "Giải Ba", nth: 2, tierTotal: 2 },
  { tier: "Giải Nhì", nth: 1, tierTotal: 1 },
  { tier: "Giải Nhất", nth: 1, tierTotal: 1 },
  { tier: "Giải Đặc Biệt", nth: 1, tierTotal: 1 },
];

export interface DrawWinner {
  number: number;
  slotIndex: number;
  tier: string;
  at: number;
}

export interface DrawState {
  version: 1;
  winners: DrawWinner[];
  /** Permanently excluded (person absent when drawn). */
  absent: number[];
  /** Drawn, congrats overlay showing, not yet confirmed/rejected. */
  pending: { number: number; slotIndex: number } | null;
  updatedAt: number;
}

const STORAGE_KEY = "lucky_draw_state_v1";

export function freshDrawState(): DrawState {
  return { version: 1, winners: [], absent: [], pending: null, updatedAt: Date.now() };
}

export function loadDrawState(): DrawState {
  if (typeof window === "undefined") return freshDrawState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshDrawState();
    const parsed = JSON.parse(raw) as DrawState;
    if (parsed?.version !== 1 || !Array.isArray(parsed.winners) || !Array.isArray(parsed.absent)) {
      return freshDrawState();
    }
    return parsed;
  } catch {
    return freshDrawState();
  }
}

export function saveDrawState(state: DrawState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
  } catch {
    // localStorage full/blocked — the draw still works for this session.
  }
}

export function resetDrawState(): DrawState {
  const state = freshDrawState();
  saveDrawState(state);
  return state;
}

/** Numbers still eligible to be drawn. */
export function getPool(state: DrawState): number[] {
  const taken = new Set<number>(state.absent);
  state.winners.forEach((w) => taken.add(w.number));
  if (state.pending) taken.add(state.pending.number);
  const pool: number[] = [];
  for (let n = 1; n <= TOTAL_NUMBERS; n++) if (!taken.has(n)) pool.push(n);
  return pool;
}

export function randomFromPool(pool: number[]): number {
  return pool[Math.floor(Math.random() * pool.length)];
}

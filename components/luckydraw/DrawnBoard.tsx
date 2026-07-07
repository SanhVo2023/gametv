"use client";

import {
  PRIZE_SLOTS,
  TOTAL_NUMBERS,
  type DrawState,
} from "../../lib/luckyDraw";

/** Short tag for the prize strip chips. */
function tierTag(tier: string): string {
  if (tier.includes("Đặc Biệt")) return "ĐB";
  if (tier.includes("Nhất")) return "Nhất";
  if (tier.includes("Nhì")) return "Nhì";
  if (tier.includes("Ba")) return "Ba";
  return "KK";
}

interface DrawnBoardProps {
  state: DrawState;
}

/**
 * Audience-trust board: the 10 prize slots plus the full 1–50 grid, so
 * everyone can see numbers never repeat and absents are skipped.
 */
export default function DrawnBoard({ state }: DrawnBoardProps) {
  const wonBy = new Map<number, string>();
  state.winners.forEach((w) => wonBy.set(w.number, tierTag(w.tier)));
  const absent = new Set(state.absent);
  const currentSlot = state.winners.length;
  const remaining =
    TOTAL_NUMBERS - state.winners.length - state.absent.length - (state.pending ? 1 : 0);

  return (
    <div className="zone gap-[1.6vh] w-full max-w-[min(94vw,1120px)]">
      {/* Prize strip — 10 slots, ascending prestige */}
      <div className="flex flex-wrap justify-center gap-2.5">
        {PRIZE_SLOTS.map((slot, i) => {
          const winner = state.winners[i];
          const isCurrent = i === currentSlot && !winner;
          return (
            <div
              key={i}
              className={`flex flex-col items-center rounded-2xl border px-3 py-2 min-w-[74px] ${
                winner
                  ? "bg-gold text-navy-deep border-gold"
                  : isCurrent
                    ? "border-gold/70 text-gold-light"
                    : "border-white/15 text-white/40"
              }`}
            >
              <span className="text-caption font-bold uppercase tracking-wider">
                {tierTag(slot.tier)}
                {slot.tierTotal > 1 ? ` ${slot.nth}` : ""}
              </span>
              <span className="font-black" style={{ fontSize: "clamp(1.1rem, 1.8vw, 2rem)" }}>
                {winner ? winner.number : isCurrent ? "•" : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* 1–50 grid */}
      <div className="glass-panel w-full px-[1.6vw] py-[1.8vh]">
        <div className="grid grid-cols-10 gap-[0.6vw]">
          {Array.from({ length: TOTAL_NUMBERS }, (_, idx) => {
            const n = idx + 1;
            const tag = wonBy.get(n);
            const cls = tag ? "draw-chip won" : absent.has(n) ? "draw-chip absent" : "draw-chip";
            return (
              <div key={n} className={cls}>
                <span>{n}</span>
                {tag && <span className="draw-chip-tag">{tag}</span>}
              </div>
            );
          })}
        </div>
        <p className="text-caption uppercase tracking-[0.25em] text-white/50 text-center mt-[1.2vh]">
          Còn lại {remaining} số · Vắng mặt {state.absent.length}
        </p>
      </div>
    </div>
  );
}

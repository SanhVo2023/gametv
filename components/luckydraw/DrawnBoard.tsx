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
      {/* Prize progress track — one row, gold fills as the draw advances */}
      <div className="flex items-start w-full px-[1vw]">
        {PRIZE_SLOTS.map((slot, i) => {
          const winner = state.winners[i];
          const isCurrent = i === currentSlot && !winner;
          const stepState = winner ? "done" : isCurrent ? "current" : "";
          return (
            <div key={i} className="contents">
              {i > 0 && (
                <div className={`pq-connector ${state.winners[i - 1] ? "done" : ""}`} />
              )}
              <div className={`pq-step flex flex-col items-center ${stepState}`}>
                <div className={`pq-node ${stepState}`}>
                  {winner ? winner.number : isCurrent ? <i className="fa-solid fa-dice" /> : ""}
                </div>
                <span className="pq-label">
                  {tierTag(slot.tier)}
                  {slot.tierTotal > 1 ? ` ${slot.nth}` : ""}
                </span>
              </div>
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

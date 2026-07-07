"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { isLowPerf } from "../../lib/perf";
import type { PrizeSlot } from "../../lib/luckyDraw";

interface CongratsOverlayProps {
  number: number;
  slot: PrizeSlot;
  onReceive: () => void;
  onAbsent: () => void;
}

/**
 * Shown after every landing. Fully opaque backdrop (the slot machine must not
 * bleed through) with the winning number on a golden raffle-ticket card.
 * Tier name only — never the actual gift.
 */
export default function CongratsOverlay({ number, slot, onReceive, onAbsent }: CongratsOverlayProps) {
  useEffect(() => {
    confetti({
      particleCount: isLowPerf() ? 60 : 180,
      spread: 100,
      startVelocity: 55,
      origin: { y: 0.45 },
      colors: ["#f5c842", "#fde98a", "#ffffff", "#2156e8"],
    });
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-[3vh] px-8"
      style={{
        background:
          "radial-gradient(circle at 50% 30%, rgba(245,200,66,0.26) 0%, rgba(0,26,92,0) 55%), linear-gradient(180deg, #001033 0%, #001a5c 55%, #0d2680 100%)",
      }}
    >
      <p className="text-eyebrow text-gold-light spring-in">Chúc mừng số phiếu may mắn</p>

      {/* Golden raffle ticket */}
      <div className="relative spring-in" style={{ animationDelay: "0.08s" }}>
        <div
          className="relative flex flex-col items-center justify-center overflow-hidden"
          style={{
            width: "min(64vw, 640px)",
            padding: "clamp(22px, 3.4vh, 52px) clamp(30px, 4vw, 70px)",
            borderRadius: "34px",
            background: "linear-gradient(150deg, #f5c842 0%, #fde98a 48%, #c9962a 100%)",
            boxShadow:
              "0 34px 90px -22px rgba(245, 200, 66, 0.55), 0 0 0 1px rgba(255,255,255,0.35)",
          }}
        >
          {/* inner dashed frame, like a tear-off ticket */}
          <div
            className="absolute inset-[10px] pointer-events-none"
            style={{ border: "3px dashed rgba(0, 16, 51, 0.28)", borderRadius: "26px" }}
          />
          <span
            className="font-bold uppercase tracking-[0.3em] text-navy-deep/70"
            style={{ fontSize: "clamp(0.8rem, 1.3vw, 1.4rem)" }}
          >
            Số phiếu
          </span>
          <span
            className="numeric-display font-black leading-none text-navy-deep"
            style={{ fontSize: "clamp(7.5rem, 20vw, 17rem)" }}
          >
            {number}
          </span>
        </div>
        {/* ticket punch notches */}
        <span
          className="absolute top-1/2 -translate-y-1/2 rounded-full"
          style={{ left: "-18px", width: "36px", height: "36px", background: "#001a5c" }}
        />
        <span
          className="absolute top-1/2 -translate-y-1/2 rounded-full"
          style={{ right: "-18px", width: "36px", height: "36px", background: "#001a5c" }}
        />
      </div>

      <div className="flex flex-col items-center gap-1 slide-up-in" style={{ animationDelay: "0.18s" }}>
        <h2
          className="font-black uppercase tracking-[0.06em] text-gold-light text-center"
          style={{ fontSize: "clamp(2.6rem, 6vw, 6.5rem)" }}
        >
          {slot.tier}
        </h2>
        {slot.tierTotal > 1 && (
          <p className="text-h2 text-white/70">
            lượt {slot.nth} / {slot.tierTotal}
          </p>
        )}
      </div>

      <div className="flex items-center gap-[3vw] mt-[1vh] slide-up-in" style={{ animationDelay: "0.3s" }}>
        <button
          type="button"
          onClick={onReceive}
          className="cta-gold"
          style={{ fontSize: "clamp(1.6rem, 3.2vw, 3.2rem)" }}
        >
          <i className="fa-solid fa-gift mr-3" />
          <span>Nhận giải</span>
        </button>
        <button
          type="button"
          onClick={onAbsent}
          className="cta-ghost"
          style={{ fontSize: "clamp(1.3rem, 2.6vw, 2.6rem)" }}
        >
          <i className="fa-solid fa-rotate-left mr-3" />
          <span>Quay lại</span>
        </button>
      </div>
      <p className="text-caption uppercase tracking-[0.25em] text-white/45">
        Quay lại: người trúng vắng mặt — số này sẽ bị bỏ qua
      </p>
    </div>
  );
}

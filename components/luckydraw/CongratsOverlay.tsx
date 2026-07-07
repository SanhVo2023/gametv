"use client";

import type { PrizeSlot } from "../../lib/luckyDraw";

interface CongratsOverlayProps {
  number: number;
  slot: PrizeSlot;
  onReceive: () => void;
  onAbsent: () => void;
}

/** Shown after every landing. Tier name only — never the actual gift. */
export default function CongratsOverlay({ number, slot, onReceive, onAbsent }: CongratsOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-[3vh] px-8"
      style={{
        background:
          "radial-gradient(circle at 50% 38%, rgba(245,200,66,0.5) 0%, rgba(0,26,92,0.94) 45%, rgba(0,16,51,0.97) 100%)",
      }}
    >
      <p className="text-eyebrow text-gold-light spring-in">Chúc mừng số phiếu may mắn</p>

      <span
        className="numeric-display font-black leading-none text-white spring-in"
        style={{
          fontSize: "clamp(10rem, 30vw, 26rem)",
          textShadow: "0 0 90px rgba(245,200,66,0.65)",
        }}
      >
        {number}
      </span>

      <div className="flex flex-col items-center gap-1 slide-up-in" style={{ animationDelay: "0.15s" }}>
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

      <div className="flex items-center gap-[3vw] mt-[2vh] slide-up-in" style={{ animationDelay: "0.3s" }}>
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

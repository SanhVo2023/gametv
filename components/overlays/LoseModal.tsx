"use client";

import { useEffect } from "react";
import { recordLoss } from "../../lib/gas";

interface LoseModalProps {
  phone: string;
  onRetry: () => void;
  onHome: () => void;
}

export default function LoseModal({ phone, onRetry, onHome }: LoseModalProps) {
  useEffect(() => {
    if (phone) {
      recordLoss(phone).catch(() => {
        /* non-blocking — already logged inside recordLoss */
      });
    }
  }, [phone]);

  return (
    <div className="fullscreen-portrait relative">
      <div className="aurora-layer" />
      <div className="ambient-light" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 py-14">
        <div className="w-full max-w-[760px] glass-panel-strong px-14 py-16 flex flex-col items-center gap-10 slide-up-in text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-white/15 blur-3xl scale-150 rounded-full" />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-white/10 border-2 border-white/25">
              <i className="fa-solid fa-clock text-6xl text-white/80" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-eyebrow text-white/60">Đáng tiếc</p>
            <h2 className="text-display font-black text-white leading-none">
              Hết giờ rồi!
            </h2>
            <p className="text-h2 text-white/80 max-w-[600px] text-balance">
              Đừng buồn nhé — bạn có thể thử lại ngay bây giờ.
            </p>
          </div>

          <div className="w-full flex flex-col gap-5 mt-4">
            <button type="button" onClick={onRetry} className="cta-gold text-h1">
              <i className="fa-solid fa-rotate-right" />
              <span>Chơi lại</span>
            </button>
            <button type="button" onClick={onHome} className="cta-ghost text-h2">
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

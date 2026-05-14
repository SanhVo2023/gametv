"use client";

import { useEffect, useState } from "react";
import { recordLoss } from "../../lib/gas";
import { playfulCopy } from "../../lib/playfulCopy";
import Ambient from "../Ambient";

interface LoseModalProps {
  phone: string;
  onRetry: () => void;
  onHome: () => void;
}

export default function LoseModal({ phone, onRetry, onHome }: LoseModalProps) {
  const [headline] = useState(() => playfulCopy.lose());

  useEffect(() => {
    if (phone) {
      recordLoss(phone).catch(() => {
        /* non-blocking — already logged inside recordLoss */
      });
    }
  }, [phone]);

  return (
    <div className="fullscreen-portrait relative">
      <Ambient particles={10} />

      <div className="screen-stack justify-center">
        <div className="zone gap-12 spring-in">
          <div className="relative">
            <div className="absolute inset-0 bg-white/15 blur-3xl scale-150 rounded-full" />
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-white/10 border-2 border-white/25 wiggle-soft">
              <i className="fa-solid fa-hourglass-end text-7xl text-white/80" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-5 text-center">
            <p className="text-eyebrow text-white/55">Hết giờ rồi</p>
            <h2 className="text-display-xl font-black text-white leading-none">{headline}</h2>
            <p className="text-h2 text-white/80 max-w-[760px] text-balance">
              Số điện thoại của bạn vẫn chưa dùng — thử lại ngay để giành quà nhé!
            </p>
          </div>

          <div className="flex flex-col gap-5 w-full max-w-[640px] mt-2">
            <button
              type="button"
              onClick={onRetry}
              className="cta-gold"
              style={{ fontSize: "clamp(1.8rem, 3.4vw, 3rem)" }}
            >
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

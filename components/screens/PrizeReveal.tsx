"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import type { SpinResult } from "../../lib/types";

interface PrizeRevealProps {
  spin: SpinResult;
  isTester: boolean;
  autoResetMs: number;
  onReset: () => void;
}

export default function PrizeReveal({ spin, isTester, autoResetMs, onReset }: PrizeRevealProps) {
  const [remaining, setRemaining] = useState<number>(Math.ceil(autoResetMs / 1000));
  const completedRef = useRef<boolean>(false);

  useEffect(() => {
    // Confetti shower
    const burst = (ratio: number, opts: confetti.Options) =>
      confetti({
        particleCount: Math.floor(180 * ratio),
        ...opts,
      });
    burst(0.25, { spread: 26, startVelocity: 55, origin: { x: 0.5, y: 0.55 }, colors: ["#f5c842", "#fde98a", "#ffffff"] });
    burst(0.2, { spread: 60, startVelocity: 45, origin: { x: 0.3, y: 0.55 }, colors: ["#f5c842", "#fde98a", "#ffffff"] });
    burst(0.2, { spread: 60, startVelocity: 45, origin: { x: 0.7, y: 0.55 }, colors: ["#f5c842", "#fde98a", "#ffffff"] });
    burst(0.35, { spread: 100, decay: 0.92, scalar: 1.2, origin: { x: 0.5, y: 0.55 }, colors: ["#f5c842", "#fde98a", "#ffffff", "#2156e8"] });
  }, []);

  useEffect(() => {
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const left = Math.max(0, Math.ceil((autoResetMs - elapsed) / 1000));
      setRemaining(left);
      if (elapsed >= autoResetMs && !completedRef.current) {
        completedRef.current = true;
        window.clearInterval(tick);
        onReset();
      }
    }, 250);
    return () => window.clearInterval(tick);
  }, [autoResetMs, onReset]);

  const ringSize = 120;
  const ringRadius = (ringSize - 12) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const progress = remaining / Math.ceil(autoResetMs / 1000);

  return (
    <div className="fullscreen-portrait relative">
      <div className="aurora-layer" />
      <div className="ambient-light" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 py-14">
        <div className="w-full max-w-[820px] flex flex-col items-center gap-10 slide-up-in text-center">
          <p className="text-eyebrow text-gold-light">CHÚC MỪNG BẠN ĐÃ NHẬN ĐƯỢC</p>

          <div className="relative">
            <div className="absolute inset-0 bg-gold/30 blur-3xl scale-150 rounded-full" />
            <div className="relative w-[200px] h-[155px]">
              <Image
                src="/asset/Artboard 9.png"
                alt=""
                width={600}
                height={460}
                className="w-full h-full object-contain brand-glow"
              />
            </div>
          </div>

          <div className="w-full glass-panel-strong px-12 py-10 flex flex-col items-center gap-6">
            <h2 className="text-display-xl font-black text-gold-light leading-none text-balance">
              {spin.prize.name}
            </h2>
            {spin.prize.description && (
              <p className="text-h2 text-white/85 max-w-[680px] text-balance">
                {spin.prize.description}
              </p>
            )}
            {spin.prize.code && (
              <div className="mt-4 px-10 py-5 rounded-2xl bg-navy-deep border-2 border-gold/60 shadow-gold-glow">
                <p className="text-caption uppercase tracking-[0.32em] text-white/55 mb-2">Mã ưu đãi</p>
                <p className="numeric-display text-[3.5rem] font-black text-gold-light tracking-[0.15em]">
                  {spin.prize.code}
                </p>
              </div>
            )}
          </div>

          <p className="text-h2 text-white/85 text-balance">
            Vui lòng đến quầy nhân viên <span className="text-gold-light font-semibold">Mắt Việt</span> để nhận quà
          </p>

          {isTester && (
            <p className="text-caption text-amber-300/80 uppercase tracking-[0.3em]">
              Chế độ tester — không trừ kho quà
            </p>
          )}
        </div>

        <div className="mt-12 flex flex-col items-center gap-3">
          <div className="relative" style={{ width: ringSize, height: ringSize }}>
            <svg viewBox={`0 0 ${ringSize} ${ringSize}`} className="absolute inset-0 -rotate-90">
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={8}
              />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                stroke="#f5c842"
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                style={{ transition: "stroke-dashoffset 250ms linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-h1 font-black text-gold-light numeric-display">
              {remaining}
            </div>
          </div>
          <p className="text-caption uppercase tracking-[0.3em] text-white/55">
            Tự động trở về trang chủ
          </p>
        </div>
      </div>
    </div>
  );
}

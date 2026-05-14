"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import confetti from "canvas-confetti";
import type { SpinResult } from "../../lib/types";
import { isVoucher, prizeImage, voucherAmount } from "../../lib/prizeImages";
import Ambient from "../Ambient";

interface PrizeRevealProps {
  spin: SpinResult;
  isTester: boolean;
  autoResetMs: number;
  onReset: () => void;
}

export default function PrizeReveal({ spin, isTester, autoResetMs, onReset }: PrizeRevealProps) {
  const [remaining, setRemaining] = useState<number>(Math.ceil(autoResetMs / 1000));
  const completedRef = useRef<boolean>(false);

  const img = prizeImage(spin.prize.id);
  const voucher = isVoucher(spin.prize.id) || !img;

  useEffect(() => {
    const burst = (ratio: number, opts: confetti.Options) =>
      confetti({ particleCount: Math.floor(200 * ratio), ...opts });
    burst(0.25, { spread: 28, startVelocity: 58, origin: { x: 0.5, y: 0.5 }, colors: ["#f5c842", "#fde98a", "#ffffff"] });
    burst(0.22, { spread: 70, startVelocity: 48, origin: { x: 0.25, y: 0.5 }, colors: ["#f5c842", "#fde98a", "#ffffff"] });
    burst(0.22, { spread: 70, startVelocity: 48, origin: { x: 0.75, y: 0.5 }, colors: ["#f5c842", "#fde98a", "#ffffff"] });
    burst(0.4, { spread: 110, decay: 0.92, scalar: 1.2, origin: { x: 0.5, y: 0.5 }, colors: ["#f5c842", "#fde98a", "#ffffff", "#2156e8"] });
  }, []);

  useEffect(() => {
    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setRemaining(Math.max(0, Math.ceil((autoResetMs - elapsed) / 1000)));
      if (elapsed >= autoResetMs && !completedRef.current) {
        completedRef.current = true;
        window.clearInterval(tick);
        onReset();
      }
    }, 250);
    return () => window.clearInterval(tick);
  }, [autoResetMs, onReset]);

  const ringSize = 132;
  const ringRadius = (ringSize - 14) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const progress = remaining / Math.ceil(autoResetMs / 1000);

  return (
    <div className="fullscreen-portrait relative">
      <Ambient rays particles={20} />

      <div className="screen-stack justify-between">
        {/* Heading */}
        <div className="zone flex-shrink-0 gap-3 spring-in">
          <p className="text-eyebrow text-gold-light">Chúc mừng bạn đã trúng</p>
          <h2 className="text-display font-black tracking-tight text-center text-gold-light leading-none">
            {spin.prize.name}
          </h2>
        </div>

        {/* Prize hero */}
        <div className="zone flex-1 justify-center min-h-0">
          <div className="relative spring-in" style={{ animationDelay: "0.15s" }}>
            <div className="absolute inset-0 -m-12 rounded-[40px] bg-gold/30 blur-[80px]" />
            {voucher ? (
              <div
                className="prize-chip-voucher relative"
                style={{ width: "min(62vw, 560px)", height: "min(46vw, 420px)" }}
              >
                <span className="text-h2 font-bold opacity-75 tracking-[0.2em]">VOUCHER</span>
                <span
                  className="font-black leading-none my-2"
                  style={{ fontSize: "clamp(4rem, 9vw, 8rem)" }}
                >
                  {voucherAmount(spin.prize.name)}
                </span>
                <span className="text-h2 font-bold opacity-75">VNĐ</span>
                <span className="text-label font-extrabold mt-5 tracking-wide">Mắt Việt</span>
              </div>
            ) : (
              <div
                className="prize-chip relative p-8"
                style={{ width: "min(64vw, 600px)", height: "min(64vw, 600px)" }}
              >
                <Image
                  src={img!}
                  alt={spin.prize.name}
                  fill
                  sizes="600px"
                  style={{ objectFit: "contain", padding: "8%" }}
                  priority
                />
              </div>
            )}
          </div>
        </div>

        {/* Detail + code */}
        <div className="zone flex-shrink-0 gap-6 slide-up-in" style={{ animationDelay: "0.3s" }}>
          {spin.prize.description && (
            <p className="text-h2 text-white/85 max-w-[860px] text-balance text-center">
              {spin.prize.description}
            </p>
          )}
          {spin.prize.code && (
            <div className="px-12 py-6 rounded-3xl bg-navy-deep border-2 border-gold/60 shadow-gold-glow flex flex-col items-center">
              <p className="text-caption uppercase tracking-[0.32em] text-white/55 mb-2">
                Mã ưu đãi
              </p>
              <p
                className="numeric-display font-black text-gold-light tracking-[0.14em]"
                style={{ fontSize: "clamp(2.2rem, 4vw, 3.8rem)" }}
              >
                {spin.prize.code}
              </p>
            </div>
          )}
          <p className="text-h2 text-white/85 text-balance text-center">
            Vui lòng đến quầy nhân viên{" "}
            <span className="text-gold-light font-semibold">Mắt Việt</span> để nhận quà
          </p>
          {isTester && (
            <p className="text-caption text-amber-300/80 uppercase tracking-[0.3em]">
              Chế độ tester — không trừ kho quà
            </p>
          )}
        </div>

        {/* Auto-reset countdown */}
        <div className="zone flex-shrink-0 gap-3">
          <div className="relative" style={{ width: ringSize, height: ringSize }}>
            <svg viewBox={`0 0 ${ringSize} ${ringSize}`} className="absolute inset-0 -rotate-90">
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={9}
              />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                fill="none"
                stroke="#f5c842"
                strokeWidth={9}
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

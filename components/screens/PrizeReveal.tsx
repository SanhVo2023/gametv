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
      confetti({ particleCount: Math.floor(240 * ratio), ...opts });
    burst(0.28, { spread: 30, startVelocity: 62, origin: { x: 0.5, y: 0.46 }, colors: ["#f5c842", "#fde98a", "#ffffff"] });
    burst(0.24, { spread: 75, startVelocity: 50, origin: { x: 0.2, y: 0.5 }, colors: ["#f5c842", "#fde98a", "#ffffff"] });
    burst(0.24, { spread: 75, startVelocity: 50, origin: { x: 0.8, y: 0.5 }, colors: ["#f5c842", "#fde98a", "#ffffff"] });
    burst(0.46, { spread: 120, decay: 0.92, scalar: 1.25, origin: { x: 0.5, y: 0.48 }, colors: ["#f5c842", "#fde98a", "#ffffff", "#2156e8"] });
    // a second pop a beat later
    window.setTimeout(
      () => burst(0.3, { spread: 100, startVelocity: 45, origin: { x: 0.5, y: 0.42 }, colors: ["#f5c842", "#fde98a", "#ffffff"] }),
      550,
    );
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

  const ringSize = 116;
  const ringRadius = (ringSize - 12) / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const progress = remaining / Math.ceil(autoResetMs / 1000);

  return (
    <div className="fullscreen-portrait relative">
      <Ambient rays particles={24} />

      {/* Centered celebratory cluster — bottom padding reserves space for the
          anchored countdown ring so the cluster never overlaps it */}
      <div className="screen-stack !gap-[clamp(14px,2.6vh,56px)] !pb-[clamp(120px,15vh,220px)]">
        <p className="text-eyebrow text-gold-light spring-in">Chúc mừng bạn đã trúng</p>

        <h2
          className="font-black tracking-tight text-center text-gold-light leading-none spring-in"
          style={{ fontSize: "clamp(2.2rem, 5.2vw, 6.8rem)", animationDelay: "0.08s" }}
        >
          {spin.prize.name}
        </h2>

        {/* Hero prize */}
        <div className="relative spring-in" style={{ animationDelay: "0.18s" }}>
          {voucher ? (
            <>
              <div className="absolute inset-0 -m-14 rounded-[44px] bg-gold/35 blur-[90px] animate-pulse-soft" />
              <div
                className="prize-chip-voucher shine-sweep relative"
                style={{ width: "min(70vw, 600px)", height: "min(50vw, 440px)" }}
              >
                <span className="text-h2 font-bold opacity-75 tracking-[0.2em]">VOUCHER</span>
                <span
                  className="font-black leading-none my-2"
                  style={{ fontSize: "clamp(3.6rem, 9vw, 8.5rem)" }}
                >
                  {voucherAmount(spin.prize.name)}
                </span>
                <span className="text-h2 font-bold opacity-75">VNĐ</span>
                <span className="text-label font-extrabold mt-5 tracking-wide">Mắt Việt</span>
              </div>
            </>
          ) : (
            /* Transparent product photo — floats large in an animated spotlight */
            <div
              className="relative flex items-center justify-center"
              style={{ width: "min(94vw, 880px)", height: "min(68vw, 600px)" }}
            >
              {/* radiating spotlight glow */}
              <div
                className="absolute inset-[-14%] animate-pulse-soft"
                style={{
                  background:
                    "radial-gradient(circle at 50% 46%, rgba(245,200,66,0.6) 0%, rgba(58,123,255,0.34) 36%, transparent 66%)",
                  filter: "blur(26px)",
                }}
              />
              {/* spinning light rays */}
              <div
                className="absolute inset-[-10%] animate-spin-slow"
                style={{
                  background:
                    "repeating-conic-gradient(from 0deg, rgba(245,200,66,0.18) 0deg 6deg, transparent 6deg 20deg)",
                  borderRadius: "50%",
                  maskImage: "radial-gradient(circle, #000 28%, transparent 70%)",
                  WebkitMaskImage: "radial-gradient(circle, #000 28%, transparent 70%)",
                }}
              />
              {/* orbiting gold sparkles */}
              {[
                { s: "clamp(9px,1.7vw,26px)", r: "clamp(150px,33vw,420px)", d: "10s", delay: "0s" },
                { s: "clamp(6px,1.2vw,17px)", r: "clamp(130px,28vw,360px)", d: "13s", delay: "-4s" },
                { s: "clamp(11px,2vw,30px)", r: "clamp(168px,37vw,470px)", d: "16s", delay: "-8s" },
                { s: "clamp(5px,1vw,14px)", r: "clamp(158px,35vw,440px)", d: "12s", delay: "-10s" },
              ].map((sp, i) => (
                <span
                  key={i}
                  className="orbit-sparkle"
                  style={{
                    ["--s" as string]: sp.s,
                    ["--orbit-r" as string]: sp.r,
                    animationDuration: sp.d,
                    animationDelay: sp.delay,
                  }}
                />
              ))}
              {/* the product — floats, breathes and sways */}
              <div className="absolute inset-[2%] float-soft">
                <div className="relative w-full h-full prize-breathe">
                  <Image
                    src={img!}
                    alt={spin.prize.name}
                    fill
                    sizes="880px"
                    priority
                    style={{
                      objectFit: "contain",
                      filter: "drop-shadow(0 34px 44px rgba(0,0,0,0.62))",
                    }}
                  />
                </div>
              </div>
              {/* soft ground shadow */}
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  bottom: "2%",
                  width: "52%",
                  height: "7%",
                  background:
                    "radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 72%)",
                  filter: "blur(12px)",
                }}
              />
            </div>
          )}
        </div>

        {/* Detail + code */}
        <div className="zone gap-6 slide-up-in" style={{ animationDelay: "0.34s" }}>
          {spin.prize.description && (
            <p className="text-body text-white/85 max-w-[880px] text-balance text-center">
              {spin.prize.description}
            </p>
          )}
          {spin.prize.code && (
            <div className="px-12 py-5 rounded-3xl bg-navy-deep border-2 border-gold/60 shadow-gold-glow flex flex-col items-center">
              <p className="text-caption uppercase tracking-[0.32em] text-white/55 mb-1">
                Mã ưu đãi
              </p>
              <p
                className="numeric-display font-black text-gold-light tracking-[0.14em]"
                style={{ fontSize: "clamp(2rem, 3.8vw, 3.6rem)" }}
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
      </div>

      {/* Auto-reset countdown — anchored at the bottom */}
      <div className="absolute left-0 right-0 z-20 flex flex-col items-center gap-2 bottom-[clamp(16px,2.6vh,56px)]">
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
  );
}

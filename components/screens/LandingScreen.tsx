"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface LandingScreenProps {
  onStart: () => void;
}

export default function LandingScreen({ onStart }: LandingScreenProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fullscreen-portrait relative overflow-hidden">
      <div className="aurora-layer" />
      <div className="ambient-light" />
      <div className="glow-layer" />

      <div className="absolute top-0 left-0 right-0 px-12 pt-12 flex justify-center">
        <div className={`pill pill-gold ${mounted ? "fade-in" : "opacity-0"}`} style={{ animationDelay: "0.1s" }}>
          <span className="dot-pulse" />
          <span>Mắt Việt × Diamond Plaza × LOTTE</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-between pt-32 pb-20 px-12">
        <div className={`w-full max-w-[820px] flex flex-col items-center gap-10 ${mounted ? "slide-up-in" : "opacity-0"}`}>
          <div className="w-full max-w-[640px] brand-glow">
            <Image
              src="/asset/Artboard 1.png"
              alt="Vision Care + — Mắt Việt"
              width={1005}
              height={990}
              priority
              className="w-full h-auto"
            />
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-display-xl font-black tracking-[0.04em] text-gold-light leading-none">
              ELITE DAY
            </h1>
            <p className="text-h2 font-light text-white/90 tracking-wide max-w-[560px] text-balance">
              Trải nghiệm chăm sóc thị lực <span className="text-gold-light font-semibold">đẳng cấp</span>
            </p>
          </div>
        </div>

        <div
          className={`relative my-6 ${mounted ? "fade-in" : "opacity-0"}`}
          style={{ animationDelay: "0.6s" }}
        >
          <div className="absolute inset-0 rounded-full bg-brand-glow/30 blur-3xl scale-150" />
          <div className="relative w-[260px] h-[200px] animate-float">
            <Image
              src="/asset/Artboard 9.png"
              alt=""
              width={600}
              height={460}
              className="w-full h-full object-contain brand-glow"
            />
          </div>
        </div>

        <div className={`flex flex-col items-center gap-8 ${mounted ? "slide-up-in" : "opacity-0"}`} style={{ animationDelay: "0.4s" }}>
          <button
            type="button"
            onClick={onStart}
            className="cta-gold animate-pulse-glow text-h1"
          >
            <span>Bắt Đầu Chơi</span>
            <i className="fa-solid fa-arrow-right" />
          </button>

          <p className="text-label uppercase tracking-[0.32em] text-white/60">
            Chạm để tham gia trò chơi
          </p>
        </div>
      </div>
    </div>
  );
}

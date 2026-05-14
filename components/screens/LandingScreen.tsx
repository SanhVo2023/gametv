"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Prize } from "../../lib/types";
import Ambient from "../Ambient";
import PrizeMarquee from "../PrizeMarquee";

interface LandingScreenProps {
  onStart: () => void;
  prizes: Prize[];
}

const STEPS = [
  { icon: "fa-mobile-screen-button", label: "Nhập số điện thoại" },
  { icon: "fa-clone", label: "Lật tìm cặp hình" },
  { icon: "fa-gift", label: "Quay vòng trúng quà" },
];

export default function LandingScreen({ onStart, prizes }: LandingScreenProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fullscreen-portrait relative">
      <Ambient rays particles={22} />

      {/* Top chrome — anchored */}
      <div className="absolute left-0 right-0 z-20 flex justify-center top-[clamp(18px,3vh,64px)]">
        <div className={`pill pill-gold ${mounted ? "fade-in" : "opacity-0"}`}>
          <span className="dot-pulse" />
          <span>Mắt Việt × Diamond Plaza × LOTTE</span>
        </div>
      </div>

      {/* Lifestyle anchor — model peeks in from the lower-right */}
      <div
        className="absolute bottom-0 right-0 z-[2] pointer-events-none select-none"
        style={{ width: "min(30vw, 540px)", opacity: 0.5 }}
      >
        <Image
          src="/asset/Artboard 7.png"
          alt=""
          width={1236}
          height={1710}
          className="w-full h-auto"
          style={{
            maskImage: "linear-gradient(to top, transparent, #000 26%)",
            WebkitMaskImage: "linear-gradient(to top, transparent, #000 26%)",
          }}
          priority
        />
      </div>

      {/* Centered content cluster */}
      <div className="screen-stack">
        {/* Hero */}
        <div className={`zone gap-3 ${mounted ? "spring-in" : "opacity-0"}`}>
          <div className="w-[min(42vw,520px)] brand-glow">
            <Image
              src="/asset/Artboard 1.png"
              alt="Vision Care + — Mắt Việt"
              width={1005}
              height={990}
              priority
              className="w-full h-auto"
            />
          </div>
          <h1
            className="font-black tracking-[0.05em] text-gold-light leading-none"
            style={{ fontSize: "clamp(2.8rem, 8vw, 10rem)" }}
          >
            ELITE DAY
          </h1>
          <p className="text-h2 font-light text-white/85 text-center text-balance max-w-[80vw]">
            Trải nghiệm chăm sóc thị lực{" "}
            <span className="text-gold-light font-semibold">đẳng cấp</span>
          </p>
        </div>

        {/* Prize showcase */}
        <div className={`zone gap-4 ${mounted ? "slide-up-in" : "opacity-0"}`} style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-4">
            <span className="h-px w-[8vw] max-w-24 bg-gold/40" />
            <p className="text-caption font-bold uppercase tracking-[0.28em] text-gold-light">
              310 phần quà — quay là trúng
            </p>
            <span className="h-px w-[8vw] max-w-24 bg-gold/40" />
          </div>
          <PrizeMarquee prizes={prizes} />
        </div>

        {/* How to play */}
        <div
          className={`zone ${mounted ? "slide-up-in" : "opacity-0"}`}
          style={{ animationDelay: "0.32s" }}
        >
          <div className="flex items-stretch gap-[1.5vw] w-full max-w-[1200px] justify-center">
            {STEPS.map((s, i) => (
              <div
                key={s.label}
                className="glass-panel flex-1 flex items-center gap-[1.2vw] px-[1.8vw] py-[1.4vh]"
              >
                <div
                  className="flex shrink-0 items-center justify-center rounded-full bg-gold text-navy-deep font-black"
                  style={{
                    width: "clamp(40px,4vw,80px)",
                    height: "clamp(40px,4vw,80px)",
                    fontSize: "clamp(1.1rem,2vw,2.4rem)",
                  }}
                >
                  {i + 1}
                </div>
                <div className="flex flex-col gap-1">
                  <i className={`fa-solid ${s.icon} text-gold-light text-h2`} />
                  <span className="text-label text-white/90 leading-tight">{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className={`zone gap-4 ${mounted ? "spring-in" : "opacity-0"}`} style={{ animationDelay: "0.44s" }}>
          <button
            type="button"
            onClick={onStart}
            className="cta-gold animate-pulse-glow"
            style={{ fontSize: "clamp(1.8rem, 4vw, 4rem)" }}
          >
            <span>Bắt Đầu Chơi</span>
            <i className="fa-solid fa-arrow-right" />
          </button>
          <p className="text-caption uppercase tracking-[0.32em] text-white/55">
            Chạm để tham gia trò chơi
          </p>
        </div>
      </div>
    </div>
  );
}

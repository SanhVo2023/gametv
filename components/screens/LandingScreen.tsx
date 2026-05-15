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
  { icon: "fa-mobile-screen-button", label: "Nhập SĐT" },
  { icon: "fa-clone", label: "Lật cặp hình" },
  { icon: "fa-gift", label: "Quay trúng quà" },
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

      {/* Lifestyle anchor — model slides in from the lower-right and gently floats */}
      <div
        className={`absolute bottom-0 right-0 z-[2] pointer-events-none select-none transition-all duration-[900ms] ease-out-soft ${
          mounted ? "translate-x-0 opacity-[0.82]" : "translate-x-20 opacity-0"
        }`}
        style={{ width: "min(50vw, 920px)" }}
      >
        {/* soft glow behind her for presence */}
        <div className="absolute inset-0 -m-10 rounded-full bg-brand-glow/25 blur-[90px]" />
        <div className="relative float-soft">
          <Image
            src="/asset/Artboard 7.png"
            alt=""
            width={1236}
            height={1710}
            className="w-full h-auto"
            style={{
              maskImage: "linear-gradient(to top, transparent, #000 20%)",
              WebkitMaskImage: "linear-gradient(to top, transparent, #000 20%)",
            }}
            priority
          />
        </div>
      </div>

      {/* Centered content cluster */}
      <div className="screen-stack">
        {/* Hero */}
        <div className={`zone gap-4 ${mounted ? "spring-in" : "opacity-0"}`}>
          <div className="w-[min(38vw,460px)] brand-glow">
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
            style={{ fontSize: "clamp(2.6rem, 6.6vw, 8.5rem)" }}
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
          <div className="flex items-stretch gap-[1.8vw] w-full max-w-[1100px] justify-center">
            {STEPS.map((s, i) => (
              <div
                key={s.label}
                className="glass-panel flex-1 flex flex-col items-center text-center gap-[0.8vh] px-[1.4vw] py-[2vh]"
              >
                <div
                  className="flex shrink-0 items-center justify-center rounded-full bg-gold text-navy-deep font-black"
                  style={{
                    width: "clamp(42px,3.6vw,76px)",
                    height: "clamp(42px,3.6vw,76px)",
                    fontSize: "clamp(1.15rem,1.9vw,2.4rem)",
                  }}
                >
                  {i + 1}
                </div>
                <i className={`fa-solid ${s.icon} text-gold-light text-h2`} />
                <span className="text-label text-white/90 leading-tight whitespace-nowrap">
                  {s.label}
                </span>
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

        {/* AI webapp — opens in a new tab */}
        <div
          className={`zone flex-shrink-0 ${mounted ? "slide-up-in" : "opacity-0"}`}
          style={{ animationDelay: "0.6s" }}
        >
          <a
            href="https://neoeyesight.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="ai-section w-full max-w-[760px]"
          >
            <div className="ai-icon-tile">
              <i
                className="fa-solid fa-wand-magic-sparkles"
                style={{ fontSize: "clamp(1.3rem, 2.5vw, 2.4rem)" }}
              />
            </div>
            <div className="flex flex-col flex-1 min-w-0 text-left">
              <span className="text-eyebrow ai-text-gradient">
                <i className="fa-solid fa-sparkles mr-2" />
                Công nghệ AI
              </span>
              <span
                className="font-bold text-white/95 leading-tight"
                style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.7rem)" }}
              >
                Khám phá AI phân tích thị lực
              </span>
            </div>
            <span
              className="cta-ai"
              style={{ fontSize: "clamp(0.85rem, 1.4vw, 1.25rem)" }}
            >
              <span>NeoEyeSight</span>
              <i className="fa-solid fa-arrow-up-right-from-square" />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

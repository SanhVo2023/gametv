"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import type { Prize } from "../../lib/types";
import Ambient from "../Ambient";
import PrizeMarquee from "../PrizeMarquee";
import ViewToolbox from "../showcase/ViewToolbox";

const NEOEYESIGHT_URL = "https://neoeyesight.netlify.app/";

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

  // Staff-only lucky-draw entry: requires two taps within 1.5s so a stray
  // guest tap does nothing. First tap brightens the button as feedback.
  const [drawArmed, setDrawArmed] = useState(false);
  const drawArmTimer = useRef<number | null>(null);
  const handleDrawTap = () => {
    if (drawArmed) {
      window.location.href = "/spin";
      return;
    }
    setDrawArmed(true);
    if (drawArmTimer.current) window.clearTimeout(drawArmTimer.current);
    drawArmTimer.current = window.setTimeout(() => setDrawArmed(false), 1500);
  };

  return (
    <div className="fullscreen-portrait relative">
      {/* Poster gradient FIRST (opaque), then the KV as the bottom backdrop —
          its sky melts upward into the gradient — then the ambient washes. */}
      <div className="landing-anniv-bg" />
      <Image
        src="/asset/kv-hero.jpg"
        alt=""
        width={2560}
        height={1440}
        priority
        className="landing-hero-bottom"
      />
      <Ambient rays particles={22} />

      {/* Top chrome — anchored */}
      <div className="absolute left-0 right-0 z-20 flex justify-center top-[clamp(18px,3vh,64px)]">
        <div className={`pill pill-gold ${mounted ? "fade-in" : "opacity-0"}`}>
          <span className="dot-pulse" />
          <span>Mắt Việt Sala — 10.07.2026</span>
        </div>
      </div>

      {/* Centered content cluster */}
      {/* Content ends above the KV footer zone (see !pb) so the photo reads
          as the page's grand finale instead of a background under text. */}
      <div className="screen-stack !gap-[clamp(14px,2.5vh,54px)] !pb-[clamp(150px,24vh,480px)] !pt-[clamp(84px,9.5vh,190px)]">
        {/* Hero — poster typography */}
        <div className={`zone gap-2 ${mounted ? "spring-in" : "opacity-0"}`}>
          <span
            className="script-gold leading-none"
            style={{ fontSize: "clamp(2.6rem, 6vw, 6.5rem)" }}
          >
            Welcome to
          </span>
          <h1
            className="anniv-headline font-black tracking-[0.04em] leading-[1.08] text-center text-balance max-w-[92vw]"
            style={{ fontSize: "clamp(2.2rem, 4.5vw, 5.4rem)" }}
          >
            MẮT VIỆT ANNIVERSARY EVENT
          </h1>
          <p className="text-h2 font-light text-white/85 text-center text-balance max-w-[80vw]">
            Chơi mini game — <span className="text-gold-light font-semibold">nhận quà liền tay</span>
          </p>
        </div>

        {/* Prize showcase */}
        <div className={`zone gap-4 ${mounted ? "slide-up-in" : "opacity-0"}`} style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-4">
            <span className="h-px w-[8vw] max-w-24 bg-gold/40" />
            <p className="text-caption font-bold uppercase tracking-[0.28em] text-gold-light">
              Quay là trúng — 100% có quà
            </p>
            <span className="h-px w-[8vw] max-w-24 bg-gold/40" />
          </div>
          <PrizeMarquee prizes={prizes} />
        </div>

        {/* CTA — the primary action sits right under the prizes */}
        <div className={`zone gap-3 ${mounted ? "spring-in" : "opacity-0"}`} style={{ animationDelay: "0.36s" }}>
          <button
            type="button"
            onClick={onStart}
            className="cta-gold animate-pulse-glow"
            style={{ fontSize: "clamp(1.8rem, 4vw, 4rem)" }}
          >
            <span>Bắt Đầu Chơi</span>
            <i className="fa-solid fa-arrow-right" />
          </button>
          <p className="text-caption uppercase tracking-[0.32em] text-white/60">
            Chạm để tham gia trò chơi
          </p>
        </div>

        {/* How to play — one slim strip: 1 → 2 → 3 */}
        <div
          className={`zone ${mounted ? "slide-up-in" : "opacity-0"}`}
          style={{ animationDelay: "0.46s" }}
        >
          <div className="landing-light-panel flex items-center justify-center gap-[1.6vw] px-[2.6vw] py-[1.6vh] max-w-[96vw]">
            {STEPS.map((s, i) => (
              <div key={s.label} className="contents">
                {i > 0 && (
                  <i
                    className="fa-solid fa-arrow-right text-gold-deep/60"
                    style={{ fontSize: "clamp(0.85rem, 1.3vw, 1.5rem)" }}
                  />
                )}
                <div className="flex items-center gap-[0.7vw]">
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full bg-gold text-navy-deep font-black"
                    style={{
                      width: "clamp(30px,2.6vw,52px)",
                      height: "clamp(30px,2.6vw,52px)",
                      fontSize: "clamp(0.9rem,1.4vw,1.7rem)",
                    }}
                  >
                    {i + 1}
                  </div>
                  <i
                    className={`fa-solid ${s.icon} text-gold-deep`}
                    style={{ fontSize: "clamp(1rem,1.6vw,1.9rem)" }}
                  />
                  <span className="text-label text-navy-deep leading-tight whitespace-nowrap">
                    {s.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI webapp — dark card pops on the light zone, opens in a new tab */}
        <div
          className={`zone flex-shrink-0 ${mounted ? "slide-up-in" : "opacity-0"}`}
          style={{ animationDelay: "0.6s" }}
        >
          <a
            href={NEOEYESIGHT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ai-section w-full max-w-[780px]"
          >
            <div className="ai-icon-tile">
              <i
                className="fa-solid fa-wand-magic-sparkles"
                style={{ fontSize: "clamp(1.3rem, 2.5vw, 2.4rem)" }}
              />
            </div>
            <div className="flex flex-col flex-1 min-w-0 text-left gap-1">
              <span className="text-eyebrow ai-text-gradient">
                <i className="fa-solid fa-sparkles mr-2" />
                Công nghệ AI
              </span>
              <span
                className="font-bold text-white/95 leading-tight"
                style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.7rem)" }}
              >
                AI phân tích thị lực
              </span>
              <span
                className="flex items-center gap-2 text-white/65 leading-tight mt-1"
                style={{ fontSize: "clamp(0.75rem, 1.25vw, 1.2rem)" }}
              >
                <i className="fa-solid fa-mobile-screen text-brand-glow" />
                Quét mã bằng điện thoại để trải nghiệm
              </span>
            </div>
            <div className="ai-qr-tile">
              <QRCodeSVG
                value={NEOEYESIGHT_URL}
                bgColor="#ffffff"
                fgColor="#001033"
                level="M"
                marginSize={0}
                size={320}
              />
            </div>
          </a>
        </div>
      </div>

      {/* Staff navigation between the TV views (also deliberately dim) */}
      <ViewToolbox current="home" />

      {/* Staff-only lucky-draw entry (double-tap) — deliberately dim, stacked
          above the toolbox button */}
      <button
        type="button"
        onClick={handleDrawTap}
        aria-label="Rút thăm trúng thưởng"
        className={`fixed bottom-24 left-8 z-50 flex h-12 w-12 items-center justify-center rounded-full border text-xl transition-opacity ${
          drawArmed
            ? "opacity-80 border-gold/60 bg-navy-deep/70 text-gold-light"
            : "opacity-40 border-white/25 bg-navy-deep/50 text-white/80"
        }`}
      >
        <i className="fa-solid fa-gift" />
      </button>
    </div>
  );
}

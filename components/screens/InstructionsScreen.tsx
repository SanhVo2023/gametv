"use client";

import { useEffect, useState } from "react";
import Ambient from "../Ambient";
import { BrandLogo, type BrandKey } from "../icons/BrandLogos";
import { playKeyTap, playMatchSound } from "../../lib/audio";

interface InstructionsScreenProps {
  onDone: () => void;
  onCancel: () => void;
}

const AUTO_ADVANCE_S = 15;

/* --- Looping demos ---------------------------------------------- */

function DemoCard({ icon, demoClass }: { icon: BrandKey; demoClass: string }) {
  return (
    <div
      className={`card-container ${demoClass}`}
      style={{
        width: "clamp(96px, 11vw, 220px)",
        minHeight: 0,
      }}
      aria-hidden="true"
    >
      <div className="card">
        <div className="face face-back">
          <img
            src="/asset/Artboard 9.png"
            alt=""
            className="face-back-icon"
            draggable={false}
          />
        </div>
        <div className="face face-front">
          <BrandLogo name={icon} className="face-front-icon" />
        </div>
      </div>
    </div>
  );
}

function DemoFlipCard() {
  return <DemoCard icon="rayban" demoClass="demo-flip-card" />;
}

function DemoMatch() {
  return (
    <div className="flex items-center gap-[clamp(8px,1vw,20px)]" aria-hidden="true">
      <DemoCard icon="gucci" demoClass="demo-match-card" />
      <DemoCard icon="gucci" demoClass="demo-match-card" />
    </div>
  );
}

function DemoPips() {
  return (
    <div className="flex items-center gap-[clamp(6px,0.8vw,14px)]" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="demo-pip"
          style={{
            width: "clamp(12px, 1.5vw, 32px)",
            height: "clamp(12px, 1.5vw, 32px)",
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}

/* --- Step row -------------------------------------------------- */

function StepRow({
  n,
  caption,
  delay,
  children,
}: {
  n: number;
  caption: string;
  delay: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="glass-panel w-full flex items-center gap-[clamp(14px,1.8vw,40px)] px-[clamp(18px,2.2vw,44px)] py-[clamp(14px,1.8vh,28px)] slide-up-in"
      style={{ animationDelay: delay }}
    >
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-gold text-navy-deep font-black"
        style={{
          width: "clamp(48px, 4.4vw, 92px)",
          height: "clamp(48px, 4.4vw, 92px)",
          fontSize: "clamp(1.2rem, 2.2vw, 2.8rem)",
        }}
      >
        {n}
      </div>
      <div className="shrink-0 flex items-center justify-center">{children}</div>
      <p className="text-h2 text-white/90 flex-1 text-balance leading-tight">
        {caption}
      </p>
    </div>
  );
}

/* --- Screen ---------------------------------------------------- */

export default function InstructionsScreen({ onDone, onCancel }: InstructionsScreenProps) {
  const [remaining, setRemaining] = useState<number>(AUTO_ADVANCE_S);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          onDone();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [onDone]);

  return (
    <div className="fullscreen-portrait relative">
      <Ambient rays particles={12} />

      {/* Back — anchored top-left */}
      <div className="absolute z-20 top-[clamp(18px,3vh,60px)] left-[clamp(24px,3.5vw,110px)]">
        <button
          type="button"
          onClick={() => {
            playKeyTap();
            onCancel();
          }}
          className="cta-ghost !min-h-0 !py-[1.4vh] !px-[2vw] text-label"
        >
          <i className="fa-solid fa-arrow-left mr-3" />
          <span>Trở về</span>
        </button>
      </div>

      <div className="screen-stack">
        {/* Heading */}
        <div className="zone gap-2 slide-up-in">
          <p className="text-eyebrow text-gold-light">Cách chơi</p>
          <h2 className="text-h1 font-black tracking-tight text-center">
            Hướng dẫn nhanh
          </h2>
        </div>

        {/* Steps */}
        <div className="zone gap-[clamp(14px,2vh,40px)] w-full max-w-[1100px]">
          <StepRow n={1} caption="Chạm vào thẻ bài để lật mở" delay="0.1s">
            <DemoFlipCard />
          </StepRow>
          <StepRow n={2} caption="Tìm 2 thẻ giống nhau để ghi điểm" delay="0.22s">
            <DemoMatch />
          </StepRow>
          <StepRow n={3} caption="Ghép đủ 8 cặp trước khi hết giờ" delay="0.34s">
            <DemoPips />
          </StepRow>
        </div>

        {/* CTA */}
        <div
          className="zone gap-3 spring-in"
          style={{ animationDelay: "0.5s" }}
        >
          <button
            type="button"
            onClick={() => {
              playMatchSound();
              onDone();
            }}
            className="cta-gold animate-pulse-glow"
            style={{ fontSize: "clamp(1.6rem, 3.4vw, 3.4rem)" }}
          >
            <span>Bắt Đầu Chơi</span>
            <i className="fa-solid fa-arrow-right" />
          </button>
          <p className="text-caption uppercase tracking-[0.3em] text-white/55">
            Tự động bắt đầu sau {remaining} giây
          </p>
        </div>
      </div>
    </div>
  );
}

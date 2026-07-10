"use client";

import Head from "next/head";
import Image from "next/image";
import Ambient from "../Ambient";
import Slideshow from "./Slideshow";
import ViewToolbox from "./ViewToolbox";
import { COMPANY_SLIDES } from "../../lib/showcase";
import { useKioskGuards } from "../../lib/useKioskGuards";

/**
 * TV presentation for the 37th birthday: one slide per moment — tenure
 * honors, company parties, store life, Best Award. Single-photo slides show
 * a lone hero; multi-photo slides add a 2-column grid beneath it.
 * Manual navigation only (arrows / dots / swipe), like the other showcases.
 */
export default function CompanyShowcase() {
  useKioskGuards();

  const slides = COMPANY_SLIDES.map((slide) => {
    const [hero, ...rest] = slide.images;
    const grid = rest.slice(0, 4);
    // Single-photo slides carry a lot of open background — poster-size type
    // keeps them from feeling sparse next to the grid slides.
    const solo = grid.length === 0;
    return (
      <div
        key={slide.title}
        className="flex h-full w-full flex-col items-center justify-center gap-[clamp(14px,2.2vh,64px)] px-[clamp(16px,4vw,140px)]"
      >
        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="script-gold leading-none"
            style={{ fontSize: solo ? "clamp(2.4rem, 5.6vw, 8.5rem)" : "clamp(1.8rem, 4vw, 6rem)" }}
          >
            {slide.eyebrow}
          </span>
          <h2
            className="anniv-headline font-black tracking-[0.04em] leading-[1.1] text-center text-balance"
            style={{ fontSize: solo ? "clamp(2.8rem, 6.6vw, 11rem)" : "clamp(2rem, 4.6vw, 7.5rem)" }}
          >
            {slide.title}
          </h2>
        </div>

        {/* Hero photo */}
        <div className="store-photo w-full" style={{ aspectRatio: "3 / 2" }}>
          <Image
            src={hero}
            alt={slide.title}
            fill
            sizes="92vw"
            loading="eager"
            className="object-cover"
          />
        </div>

        {/* Companion grid: 2-up (3 photos), 3-across (4 photos), 2×2 (5 photos) */}
        {grid.length > 0 && (
          <div
            className={`grid w-full gap-[clamp(10px,1.6vw,40px)] ${
              grid.length === 3 ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
            {grid.map((src) => (
              <div key={src} className="store-photo" style={{ aspectRatio: "3 / 2" }}>
                <Image
                  src={src}
                  alt={slide.title}
                  fill
                  sizes={grid.length === 3 ? "31vw" : "46vw"}
                  loading="eager"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  });

  return (
    <div className="fullscreen-portrait relative">
      <Head>
        <title>Mắt Việt — Sinh nhật 37 năm</title>
      </Head>
      <div className="landing-anniv-bg" />
      <Ambient particles={14} />

      <div className="relative z-10 flex h-full flex-col items-center pt-[clamp(18px,3vh,64px)] pb-[clamp(18px,3vh,56px)]">
        <div className="pill pill-gold mb-[clamp(10px,1.8vh,32px)]">
          <span className="dot-pulse" />
          <span>Sinh nhật 37 năm Mắt Việt</span>
        </div>
        <div className="flex w-full max-w-[min(94vw,2200px)] flex-1 min-h-0 flex-col">
          <Slideshow slides={slides} label="Sinh nhật 37 năm" />
        </div>
      </div>

      <ViewToolbox current="company" />
    </div>
  );
}

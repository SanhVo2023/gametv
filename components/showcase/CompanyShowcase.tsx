"use client";

import Head from "next/head";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import Ambient from "../Ambient";
import Slideshow from "./Slideshow";
import ViewToolbox from "./ViewToolbox";
import { COMPANY_SLIDES } from "../../lib/showcase";
import { useKioskGuards } from "../../lib/useKioskGuards";

const TOTAL_IMAGES = COMPANY_SLIDES.reduce((n, s) => n + s.images.length, 0);

// If some load events never fire (e.g. a broken file), reveal anyway.
const LOADING_CAP_MS = 12000;

/**
 * TV presentation for the 37th birthday: one slide per moment — tenure
 * honors, company parties, store life, Best Award. Single-photo slides show
 * a lone hero; multi-photo slides add a 2-column grid beneath it.
 * Manual navigation only (arrows / dots / swipe), like the other showcases.
 *
 * All ~24 photos load eagerly, which takes a few seconds on the kiosk — an
 * opaque loading overlay (with progress) covers the strip until every image
 * has settled, then fades out.
 */
export default function CompanyShowcase() {
  useKioskGuards();

  const [loadedCount, setLoadedCount] = useState(0);
  const [capReached, setCapReached] = useState(false);
  const [overlayGone, setOverlayGone] = useState(false);
  const ready = capReached || loadedCount >= TOTAL_IMAGES;

  const handleImageSettled = useCallback(() => {
    setLoadedCount((c) => c + 1);
  }, []);

  useEffect(() => {
    const cap = window.setTimeout(() => setCapReached(true), LOADING_CAP_MS);
    return () => window.clearTimeout(cap);
  }, []);

  // Drop the overlay from the tree once its fade-out transition has played.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setOverlayGone(true), 800);
    return () => window.clearTimeout(t);
  }, [ready]);

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
            onLoad={handleImageSettled}
            onError={handleImageSettled}
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
                  onLoad={handleImageSettled}
                  onError={handleImageSettled}
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

      {/* Loading overlay — opaque so half-decoded photos never flash.
          Sits under the staff toolbox (z-60) so navigation stays possible. */}
      {!overlayGone && (
        <div
          className={`absolute inset-0 z-40 transition-opacity duration-700 ${
            ready ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          aria-hidden={ready}
        >
          <div className="landing-anniv-bg" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-[clamp(12px,2vh,40px)]">
            <span
              className="script-gold leading-none"
              style={{ fontSize: "clamp(2.4rem, 5.6vw, 8.5rem)" }}
            >
              Mắt Việt
            </span>
            <h1
              className="anniv-headline font-black tracking-[0.04em] leading-[1.1] text-center"
              style={{ fontSize: "clamp(2.8rem, 6.6vw, 11rem)" }}
            >
              Sinh nhật 37 năm
            </h1>
            <p className="flex items-center gap-4 text-white/80 uppercase tracking-[0.3em]"
               style={{ fontSize: "clamp(1rem, 1.6vw, 2.2rem)" }}>
              <i className="fa-solid fa-spinner fa-spin" />
              <span>
                Đang tải hình ảnh… {Math.min(loadedCount, TOTAL_IMAGES)}/{TOTAL_IMAGES}
              </span>
            </p>
          </div>
        </div>
      )}

      <ViewToolbox current="company" />
    </div>
  );
}

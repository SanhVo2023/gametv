"use client";

import Head from "next/head";
import Image from "next/image";
import Ambient from "../Ambient";
import Slideshow from "./Slideshow";
import ViewToolbox from "./ViewToolbox";
import { BRANDS } from "../../lib/showcase";
import { useKioskGuards } from "../../lib/useKioskGuards";

/**
 * TV presentation: one big white logo per slide on the navy event backdrop.
 * Same manual slide mechanism as the store showcase.
 */
export default function BrandShowcase() {
  useKioskGuards();

  const slides = BRANDS.map((brand) => (
    <div
      key={brand.key}
      className="flex h-full w-full flex-col items-center justify-center gap-[clamp(18px,3vh,52px)] px-[clamp(16px,5vw,100px)]"
    >
      <div className="brand-stage">
        <div className="brand-halo" aria-hidden />
        {brand.src ? (
          <Image
            src={brand.src}
            alt={brand.label}
            width={1400}
            height={800}
            loading="eager"
            className="brand-logo-img"
          />
        ) : (
          // No logo file yet (Lindberg) — a clean wordmark stands in.
          <span className="brand-wordmark">{brand.label.toUpperCase()}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="h-px w-[7vw] max-w-20 bg-gold/40" />
        <p className="text-caption font-bold uppercase tracking-[0.32em] text-gold-light">
          {brand.label}
        </p>
        <span className="h-px w-[7vw] max-w-20 bg-gold/40" />
      </div>
    </div>
  ));

  return (
    <div className="fullscreen-portrait relative">
      <Head>
        <title>Mắt Việt — Thương hiệu</title>
      </Head>
      <div className="landing-anniv-bg" />
      <Ambient particles={14} />

      <div className="relative z-10 flex h-full flex-col items-center pt-[clamp(18px,3vh,64px)] pb-[clamp(18px,3vh,56px)]">
        <div className="pill pill-gold mb-[clamp(10px,1.8vh,32px)]">
          <span className="dot-pulse" />
          <span>Thương hiệu tại Mắt Việt</span>
        </div>
        <div className="flex w-full max-w-[min(94vw,1180px)] flex-1 min-h-0 flex-col">
          <Slideshow slides={slides} label="Thương hiệu" />
        </div>
      </div>

      <ViewToolbox current="brands" />
    </div>
  );
}

"use client";

import Head from "next/head";
import Image from "next/image";
import Ambient from "../Ambient";
import Slideshow from "./Slideshow";
import ViewToolbox from "./ViewToolbox";
import { STORES } from "../../lib/showcase";
import { useKioskGuards } from "../../lib/useKioskGuards";

/**
 * TV presentation: one slide per store — the store name over a hero photo
 * plus a 2×2 grid. Manual navigation only (arrows / dots / swipe).
 */
export default function StoreShowcase() {
  useKioskGuards();

  const slides = STORES.map((store) => {
    const [hero, ...rest] = store.images;
    const grid = rest.slice(0, 4);
    return (
      <div
        key={store.name}
        className="flex h-full w-full flex-col items-center justify-center gap-[clamp(14px,2.2vh,64px)] px-[clamp(16px,4vw,140px)]"
      >
        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="script-gold leading-none"
            style={{ fontSize: "clamp(1.8rem, 4vw, 6rem)" }}
          >
            Mắt Việt
          </span>
          <h2
            className="anniv-headline font-black tracking-[0.04em] leading-[1.1] text-center text-balance"
            style={{ fontSize: "clamp(2rem, 4.6vw, 7.5rem)" }}
          >
            {store.name}
          </h2>
        </div>

        {/* Hero photo */}
        <div className="store-photo w-full" style={{ aspectRatio: "4 / 3" }}>
          <Image
            src={hero}
            alt={store.name}
            fill
            sizes="92vw"
            loading="eager"
            className="object-cover"
          />
        </div>

        {/* 2×2 grid */}
        <div className="grid w-full grid-cols-2 gap-[clamp(10px,1.6vw,40px)]">
          {grid.map((src) => (
            <div key={src} className="store-photo" style={{ aspectRatio: "4 / 3" }}>
              <Image
                src={src}
                alt={store.name}
                fill
                sizes="46vw"
                loading="eager"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    );
  });

  return (
    <div className="fullscreen-portrait relative">
      <Head>
        <title>Mắt Việt — Hệ thống cửa hàng</title>
      </Head>
      <div className="landing-anniv-bg" />
      <Ambient particles={14} />

      <div className="relative z-10 flex h-full flex-col items-center pt-[clamp(18px,3vh,64px)] pb-[clamp(18px,3vh,56px)]">
        <div className="pill pill-gold mb-[clamp(10px,1.8vh,32px)]">
          <span className="dot-pulse" />
          <span>Hệ thống cửa hàng Mắt Việt</span>
        </div>
        <div className="flex w-full max-w-[min(94vw,2200px)] flex-1 min-h-0 flex-col">
          <Slideshow slides={slides} label="Cửa hàng" />
        </div>
      </div>

      <ViewToolbox current="stores" />
    </div>
  );
}

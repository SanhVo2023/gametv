"use client";

import Head from "next/head";
import Image from "next/image";
import Ambient from "../Ambient";
import { isLowPerf } from "../../lib/perf";
import { useKioskGuards } from "../../lib/useKioskGuards";

/**
 * Standby screen: continuous abstract orbit animation around the Mắt Việt
 * mark. Any touch returns to the main page. All animation is transform-only;
 * low-perf mode keeps a single slow ring (see globals.css overrides).
 */
export default function StandbyView() {
  useKioskGuards();

  return (
    <div
      className="fullscreen-portrait relative flex flex-col items-center justify-center"
      style={{
        background:
          "radial-gradient(circle at 50% 38%, rgba(33,86,232,0.22) 0%, rgba(0,16,51,0) 55%), linear-gradient(180deg, #001033 0%, #001a5c 58%, #0d2680 100%)",
      }}
      onPointerDown={() => {
        window.location.href = "/";
      }}
    >
      <Head>
        <title>Mắt Việt — Màn hình chờ</title>
      </Head>
      {!isLowPerf() && <Ambient particles={16} />}

      {/* Orbit stage */}
      <div className="standby-stage">
        <div className="standby-glow" aria-hidden />
        <div className="standby-ring ring-a" aria-hidden />
        <div className="standby-ring ring-b" aria-hidden>
          <span className="standby-satellite" />
        </div>
        <div className="standby-ring ring-c" aria-hidden>
          <span className="standby-satellite small" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-[clamp(10px,1.6vh,26px)]">
          <Image
            src="/asset/Artboard 9.png"
            alt="Mắt Việt"
            width={310}
            height={230}
            priority
            className="standby-logo"
          />
          <h1
            className="anniv-headline font-black tracking-[0.08em] leading-none text-center"
            style={{ fontSize: "clamp(2.6rem, 7vw, 7rem)" }}
          >
            MẮT VIỆT
          </h1>
          <span
            className="script-gold leading-none"
            style={{ fontSize: "clamp(1.6rem, 3.6vw, 3.8rem)" }}
          >
            Anniversary Event
          </span>
        </div>
      </div>

      {/* Touch hint */}
      <div className="absolute bottom-[clamp(40px,7vh,140px)] left-0 right-0 flex justify-center">
        <p className="standby-hint text-caption uppercase tracking-[0.4em] text-white/55">
          <i className="fa-solid fa-hand-pointer mr-3" />
          Chạm để tiếp tục
        </p>
      </div>
    </div>
  );
}

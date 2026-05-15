"use client";

import { useCallback, useMemo, useState } from "react";
import type { Difficulty } from "../../lib/types";
import { playKeyTap, playMatchSound } from "../../lib/audio";
import Ambient from "../Ambient";

interface DifficultyScreenProps {
  onChosen: (difficulty: Difficulty) => void;
  onCancel: () => void;
}

export default function DifficultyScreen({ onChosen, onCancel }: DifficultyScreenProps) {
  const [chosen, setChosen] = useState<Difficulty | null>(null);

  const embers = useMemo(
    () =>
      Array.from({ length: 10 }).map(() => {
        const size = 5 + Math.random() * 11;
        return {
          left: `${8 + Math.random() * 84}%`,
          bottom: `${4 + Math.random() * 30}%`,
          width: `${size}px`,
          height: `${size}px`,
          animationDuration: `${2.4 + Math.random() * 2.6}s`,
          animationDelay: `${-Math.random() * 4}s`,
        };
      }),
    [],
  );

  const pick = useCallback(
    (d: Difficulty) => {
      if (chosen) return;
      setChosen(d);
      playMatchSound();
      window.setTimeout(() => onChosen(d), 420);
    },
    [chosen, onChosen],
  );

  return (
    <div className="fullscreen-portrait relative">
      <Ambient rays particles={14} />

      {/* Back — anchored */}
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
        <div className="zone gap-3 slide-up-in">
          <p className="text-eyebrow text-gold-light">Sẵn sàng chưa?</p>
          <h2 className="text-display font-black tracking-tight text-center text-balance">
            Chọn <span className="text-gold-light">độ khó</span>
          </h2>
        </div>

        {/* Choice cards */}
        <div className="flex items-stretch justify-center gap-[2.5vw] w-full max-w-[1400px]">
          {/* DỄ */}
          <button
            type="button"
            onClick={() => pick("easy")}
            className={`glass-panel-strong relative flex-1 flex flex-col items-center text-center gap-[1.6vh] px-[2.4vw] py-[3.4vh] transition-transform duration-300 ${
              chosen === "easy" ? "scale-105" : chosen ? "scale-95 opacity-50" : "spring-in"
            }`}
            style={{ animationDelay: "0.1s" }}
          >
            <div className="absolute inset-0 -z-10 rounded-[28px] bg-brand-glow/15 blur-2xl" />
            <div
              className="flex items-center justify-center rounded-full bg-brand-blue/30 border-2 border-brand-glow/40"
              style={{ width: "clamp(90px,9vw,180px)", height: "clamp(90px,9vw,180px)" }}
            >
              <i
                className="fa-solid fa-face-smile-beam text-brand-glow"
                style={{ fontSize: "clamp(2.6rem,5vw,5.5rem)" }}
              />
            </div>
            <h3
              className="font-black text-white tracking-[0.08em]"
              style={{ fontSize: "clamp(2rem,4.4vw,5rem)" }}
            >
              DỄ
            </h3>
            <p className="text-body text-white/75 leading-tight text-balance">
              Thong thả tìm cặp đôi
            </p>
            <div className="flex flex-col gap-2 mt-1 w-full">
              <span className="pill justify-center !tracking-normal !normal-case text-label">
                <i className="fa-solid fa-clock text-gold-light" /> 80 giây
              </span>
              <span className="pill justify-center !tracking-normal !normal-case text-label">
                <i className="fa-solid fa-thumbtack text-gold-light" /> Thẻ bài đứng yên
              </span>
            </div>
          </button>

          {/* KHÓ */}
          <button
            type="button"
            onClick={() => pick("hard")}
            className={`flame-border glass-panel-strong relative flex-1 flex flex-col items-center text-center gap-[1.6vh] px-[2.4vw] py-[3.4vh] overflow-hidden transition-transform duration-300 ${
              chosen === "hard"
                ? "scale-105"
                : chosen
                  ? "scale-95 opacity-50"
                  : "spring-in hard-shake"
            }`}
            style={{
              animationDelay: "0.18s",
              background:
                "linear-gradient(160deg, rgba(40,8,16,0.92), rgba(0,16,51,0.92))",
            }}
          >
            {/* red aura */}
            <div className="absolute inset-0 -z-10 rounded-[28px] bg-red-500/25 blur-2xl animate-pulse-soft" />
            {/* embers */}
            {embers.map((e, i) => (
              <span key={i} className="ember" style={e} />
            ))}

            <div
              className="absolute top-3 right-3 pill !tracking-normal !normal-case text-caption"
              style={{ background: "rgba(220,38,38,0.25)", borderColor: "rgba(248,113,113,0.5)", color: "#fecaca" }}
            >
              🔥 THỬ THÁCH
            </div>

            <div
              className="flex items-center justify-center rounded-full border-2"
              style={{
                width: "clamp(90px,9vw,180px)",
                height: "clamp(90px,9vw,180px)",
                background: "rgba(220,38,38,0.22)",
                borderColor: "rgba(248,113,113,0.6)",
              }}
            >
              <i
                className="fa-solid fa-fire-flame-curved flicker"
                style={{ fontSize: "clamp(2.6rem,5vw,5.5rem)", color: "#fca5a5" }}
              />
            </div>
            <h3
              className="font-black tracking-[0.08em]"
              style={{
                fontSize: "clamp(2rem,4.4vw,5rem)",
                background: "linear-gradient(135deg, #fde98a, #f87171, #dc2626)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              KHÓ
            </h3>
            <p className="text-body text-white/80 leading-tight text-balance">
              Thẻ bài tráo chỗ — tốc độ cao!
            </p>
            <div className="flex flex-col gap-2 mt-1 w-full">
              <span
                className="pill justify-center !tracking-normal !normal-case text-label"
                style={{ background: "rgba(220,38,38,0.18)", borderColor: "rgba(248,113,113,0.4)" }}
              >
                <i className="fa-solid fa-bolt text-red-300" /> 70 giây
              </span>
              <span
                className="pill justify-center !tracking-normal !normal-case text-label"
                style={{ background: "rgba(220,38,38,0.18)", borderColor: "rgba(248,113,113,0.4)" }}
              >
                <i className="fa-solid fa-shuffle text-red-300" /> Thẻ bài đổi vị trí
              </span>
            </div>
          </button>
        </div>

        <p className="text-caption uppercase tracking-[0.3em] text-white/45 slide-up-in" style={{ animationDelay: "0.3s" }}>
          Chạm vào một thẻ để bắt đầu
        </p>
      </div>
    </div>
  );
}

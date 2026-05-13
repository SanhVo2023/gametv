"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { spinWheel } from "../../lib/gas";
import { playWheelTick, playWinSting } from "../../lib/audio";
import type { Prize, SpinResult } from "../../lib/types";

interface WheelOfFortuneProps {
  phone: string;
  prizes: Prize[];
  soundEnabled: boolean;
  onComplete: (result: SpinResult) => void;
  onFail: () => void;
}

const WHEEL_PALETTE = [
  ["#1138c4", "#2156e8"],
  ["#001a5c", "#0a2070"],
  ["#1d4ed8", "#3a7bff"],
  ["#001033", "#0d2680"],
] as const;

const SPIN_DURATION_MS = 4400;
const PRE_SPIN_DELAY_MS = 900;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeWedge(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

export default function WheelOfFortune({
  phone,
  prizes,
  soundEnabled,
  onComplete,
  onFail,
}: WheelOfFortuneProps) {
  const [status, setStatus] = useState<"loading" | "spinning" | "settling">("loading");
  const [targetRotation, setTargetRotation] = useState<number>(0);
  const [resolvedResult, setResolvedResult] = useState<SpinResult | null>(null);
  const rotationRef = useRef<number>(0);
  const lastTickWedgeRef = useRef<number>(-1);
  const requestStartedRef = useRef<boolean>(false);

  const wedgeAngle = useMemo(() => 360 / prizes.length, [prizes.length]);

  // Kick off the spin request on mount.
  useEffect(() => {
    if (requestStartedRef.current) return;
    requestStartedRef.current = true;

    let cancelled = false;
    const run = async () => {
      try {
        const res = await spinWheel(phone);
        if (cancelled) return;
        if (res.totalWedges !== prizes.length) {
          // Stock changed mid-flight; abort and bounce to fallback.
          onFail();
          return;
        }
        const wedgeCenter = res.wedgeIndex * wedgeAngle + wedgeAngle / 2;
        // Pointer is at the top (270° in our SVG coordinates: 0° is right, 90° down).
        // We want the wedge center to align with the pointer after rotation.
        // Visual rotation rotates the wheel clockwise, so we add a base rotation that lands the chosen wedge under the pointer.
        const base = (270 - wedgeCenter + 360) % 360;
        const extraTurns = 6 * 360;
        const finalRotation = rotationRef.current + extraTurns + base;
        setResolvedResult(res);
        rotationRef.current = finalRotation;

        // Brief delay so the wheel sits still for a moment before launching.
        window.setTimeout(() => {
          if (cancelled) return;
          setTargetRotation(finalRotation);
          setStatus("spinning");
        }, PRE_SPIN_DELAY_MS);
      } catch {
        onFail();
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [phone, prizes.length, wedgeAngle, onFail]);

  // Tick sound loop while spinning.
  useEffect(() => {
    if (status !== "spinning") return;
    if (!soundEnabled) return;
    const startTime = performance.now();
    const totalRotation = targetRotation - (rotationRef.current - (targetRotation - rotationRef.current));
    // We need rotation progress to detect wedge crossings.
    const startRotation = 0;
    const endRotation = targetRotation;
    const tickEase = (t: number) => {
      // Approximate cubic-bezier(0.17,0.67,0.12,0.99) — heavy ease-out.
      return 1 - Math.pow(1 - t, 3.4);
    };
    let raf = 0;
    const loop = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / SPIN_DURATION_MS);
      const eased = tickEase(t);
      const currentRot = startRotation + (endRotation - startRotation) * eased;
      const currentWedge = Math.floor((currentRot % 360) / wedgeAngle);
      if (currentWedge !== lastTickWedgeRef.current) {
        lastTickWedgeRef.current = currentWedge;
        playWheelTick();
      }
      if (t < 1) {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status, targetRotation, wedgeAngle, soundEnabled]);

  // When the CSS transition ends, settle and bubble up.
  const handleTransitionEnd = useCallback(() => {
    if (status !== "spinning") return;
    setStatus("settling");
    if (soundEnabled) playWinSting();
    window.setTimeout(() => {
      if (resolvedResult) onComplete(resolvedResult);
    }, 650);
  }, [status, resolvedResult, onComplete, soundEnabled]);

  const wheelSize = 720;
  const center = wheelSize / 2;
  const radius = wheelSize / 2 - 14;
  const labelRadius = radius * 0.62;

  return (
    <div className="fullscreen-portrait relative">
      <div className="aurora-layer" />
      <div className="ambient-light" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-12 py-14">
        <div className="text-center flex flex-col items-center gap-3 slide-up-in">
          <p className="text-eyebrow text-gold-light">Vòng quay may mắn</p>
          <h2 className="text-display font-black tracking-tight">Quà của bạn đây!</h2>
          <p className="text-h2 text-white/75 max-w-[640px] text-balance">
            Vòng quay sẽ dừng lại trên phần thưởng mà bạn nhận được
          </p>
        </div>

        <div className="relative flex items-center justify-center my-6" style={{ width: wheelSize, height: wheelSize, maxWidth: "92vw", maxHeight: "92vw" }}>
          {/* Glow halo */}
          <div className="absolute inset-0 rounded-full bg-brand-glow/30 blur-3xl" />
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full ring-[10px] ring-gold/60 shadow-gold-glow-lg" />

          {/* SVG wheel */}
          <svg
            viewBox={`0 0 ${wheelSize} ${wheelSize}`}
            className="absolute inset-0 w-full h-full"
            style={{
              transform: `rotate(${targetRotation}deg)`,
              transition: status === "spinning" ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : "none",
              willChange: "transform",
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            <defs>
              {prizes.map((_, i) => {
                const [a, b] = WHEEL_PALETTE[i % WHEEL_PALETTE.length];
                return (
                  <linearGradient id={`wedge-grad-${i}`} key={i} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={a} />
                    <stop offset="100%" stopColor={b} />
                  </linearGradient>
                );
              })}
            </defs>

            {prizes.map((p, i) => {
              const start = i * wedgeAngle;
              const end = start + wedgeAngle;
              const d = describeWedge(center, center, radius, start, end);
              const midAngle = start + wedgeAngle / 2;
              const labelPos = polarToCartesian(center, center, labelRadius, midAngle);
              return (
                <g key={p.id}>
                  <path
                    d={d}
                    fill={p.colorHex ?? `url(#wedge-grad-${i})`}
                    stroke="rgba(245, 200, 66, 0.85)"
                    strokeWidth={2}
                  />
                  <g transform={`translate(${labelPos.x} ${labelPos.y}) rotate(${midAngle})`}>
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontFamily="Montserrat"
                      fontWeight={700}
                      fontSize={Math.max(14, 26 - prizes.length)}
                      style={{ pointerEvents: "none" }}
                    >
                      {p.name.length > 22 ? p.name.slice(0, 21) + "…" : p.name}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Center hub */}
            <circle cx={center} cy={center} r={radius * 0.18} fill="#001033" stroke="#f5c842" strokeWidth={3} />
          </svg>

          {/* Center brand icon (does not rotate) */}
          <div className="absolute z-10 flex items-center justify-center rounded-full" style={{ width: radius * 0.32, height: radius * 0.32 }}>
            <Image
              src="/asset/Artboard 9.png"
              alt=""
              width={300}
              height={230}
              className="brand-glow"
              style={{ width: "100%", height: "auto" }}
            />
          </div>

          {/* Pointer at top */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
            <svg width="62" height="84" viewBox="0 0 62 84">
              <defs>
                <linearGradient id="pointer-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fde98a" />
                  <stop offset="100%" stopColor="#c9962a" />
                </linearGradient>
              </defs>
              <polygon points="31,84 4,4 58,4" fill="url(#pointer-grad)" stroke="#001033" strokeWidth="3" />
              <circle cx="31" cy="14" r="6" fill="#001033" />
            </svg>
          </div>
        </div>

        <div className="text-center">
          {status === "loading" && (
            <p className="text-body text-white/70 flex items-center gap-3 justify-center">
              <span className="dot-pulse" /> Đang chuẩn bị vòng quay…
            </p>
          )}
          {status === "spinning" && (
            <p className="text-h2 text-gold-light animate-pulse-soft">
              Hãy chờ phần thưởng dừng lại nhé!
            </p>
          )}
          {status === "settling" && (
            <p className="text-h2 text-gold-light animate-pulse-soft">
              Tuyệt vời!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

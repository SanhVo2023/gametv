"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { spinWheel } from "../../lib/gas";
import { playWheelTick, playWhoosh, playWinSting } from "../../lib/audio";
import { isVoucher, prizeImage } from "../../lib/prizeImages";
import type { Prize, SpinResult } from "../../lib/types";
import Ambient from "../Ambient";

interface WheelOfFortuneProps {
  phone: string;
  soundEnabled: boolean;
  /** In-flight spin request pre-fetched at win-time (may already be resolved). */
  spinPromise: Promise<SpinResult> | null;
  onComplete: (result: SpinResult) => void;
  onGiveUp: () => void;
}

const WHEEL_PALETTE = [
  ["#1138c4", "#2156e8"],
  ["#001a5c", "#0a2070"],
  ["#1d4ed8", "#3a7bff"],
  ["#001033", "#0d2680"],
] as const;

const VIEWBOX = 1000;

// Spin physics — realistic friction: anticipation wind-up, punchy launch into a
// long power-decel, then a single damped settle-rock.
const WINDUP_MS = 300;
const SPIN_MS = 4000;
const SETTLE_MS = 480;
const WINDUP_DEG = 14;
const OVERSHOOT_DEG = 3.5;
const IDLE_AUTOSPIN_MS = 20_000;

type Phase = "loading" | "ready" | "spinning" | "settling" | "error";

interface ErrorInfo {
  kind: "retry" | "noPrizes";
  text: string;
}

function classifyError(msg: string): ErrorInfo {
  if (/no_prizes/i.test(msg))
    return { kind: "noPrizes", text: "Kho quà tạm hết — vui lòng đến quầy nhân viên Mắt Việt." };
  if (/already_won/i.test(msg))
    return { kind: "noPrizes", text: "Số điện thoại này đã nhận quà rồi." };
  if (/busy/i.test(msg))
    return { kind: "retry", text: "Hệ thống đang bận một chút, thử lại nhé!" };
  return { kind: "retry", text: "Mất kết nối tới hệ thống. Vui lòng thử lại." };
}

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

/** "Voucher 100.000đ" -> "100K" */
function voucherShort(name: string): string {
  const digits = name.replace(/\D/g, "");
  if (!digits) return "Quà";
  const n = parseInt(digits, 10);
  return n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;
}

export default function WheelOfFortune({
  phone,
  soundEnabled,
  spinPromise,
  onComplete,
  onGiveUp,
}: WheelOfFortuneProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [result, setResult] = useState<SpinResult | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [restRotation, setRestRotation] = useState<number>(0);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const restRotationRef = useRef<number>(0);
  const lastTickWedgeRef = useRef<number>(-1);
  const attemptRef = useRef<number>(0);
  const startedRef = useRef<boolean>(false);

  const prizes: Prize[] = result?.prizes ?? [];
  const wedgeAngle = useMemo(
    () => (prizes.length > 0 ? 360 / prizes.length : 45),
    [prizes.length],
  );

  const resolveSpin = useCallback((promise: Promise<SpinResult>) => {
    const attempt = ++attemptRef.current;
    startedRef.current = false;
    setPhase("loading");
    setErrorInfo(null);
    promise
      .then((res) => {
        if (attempt !== attemptRef.current) return;
        if (!res.prizes || res.prizes.length === 0) {
          setErrorInfo({ kind: "noPrizes", text: "Kho quà tạm hết." });
          setPhase("error");
          return;
        }
        setResult(res);
        setPhase("ready");
      })
      .catch((err: unknown) => {
        if (attempt !== attemptRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        setErrorInfo(classifyError(msg));
        setPhase("error");
      });
  }, []);

  useEffect(() => {
    resolveSpin(spinPromise ?? spinWheel(phone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, []);

  // ---- The spin ----
  const startSpin = useCallback(() => {
    if (startedRef.current || !result) return;
    startedRef.current = true;
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    setPhase("spinning");

    const wedgeCenter = result.wedgeIndex * wedgeAngle + wedgeAngle / 2;
    const base = (360 - wedgeCenter) % 360;
    const startRot = restRotationRef.current;
    const windupTarget = startRot - WINDUP_DEG;
    const finalRotation = startRot + 6 * 360 + base;
    const total = WINDUP_MS + SPIN_MS + SETTLE_MS;
    const t0 = performance.now();
    let whooshed = false;

    const frame = (now: number) => {
      const t = now - t0;
      let rot: number;
      if (t < WINDUP_MS) {
        // ease back — anticipation
        const p = t / WINDUP_MS;
        rot = startRot + (windupTarget - startRot) * (1 - Math.pow(1 - p, 2));
      } else if (t < WINDUP_MS + SPIN_MS) {
        if (!whooshed) {
          whooshed = true;
          if (soundEnabled) playWhoosh();
        }
        // punchy launch -> long friction tail
        const p = (t - WINDUP_MS) / SPIN_MS;
        rot = windupTarget + (finalRotation - windupTarget) * (1 - Math.pow(1 - p, 3.6));
      } else if (t < total) {
        // single damped settle-rock
        const p = (t - WINDUP_MS - SPIN_MS) / SETTLE_MS;
        rot = finalRotation + Math.sin(p * Math.PI) * Math.exp(-3 * p) * OVERSHOOT_DEG;
      } else {
        rot = finalRotation;
      }

      if (svgRef.current) svgRef.current.style.transform = `rotate(${rot}deg)`;

      // Tick on each forward wedge crossing (after the wind-up).
      if (t >= WINDUP_MS) {
        const wedge = Math.floor((((rot % 360) + 360) % 360) / wedgeAngle);
        if (wedge !== lastTickWedgeRef.current) {
          lastTickWedgeRef.current = wedge;
          if (soundEnabled) playWheelTick();
        }
      }

      if (t < total) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        restRotationRef.current = finalRotation;
        setRestRotation(finalRotation);
        setPhase("settling");
        if (soundEnabled) playWinSting();
        window.setTimeout(() => {
          if (result) onComplete(result);
        }, 600);
      }
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [result, wedgeAngle, soundEnabled, onComplete]);

  // Idle fallback — auto-spin if the SPIN button is left untouched.
  useEffect(() => {
    if (phase !== "ready") return;
    idleTimerRef.current = window.setTimeout(() => startSpin(), IDLE_AUTOSPIN_MS);
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [phase, startSpin]);

  const handleRetry = useCallback(() => {
    resolveSpin(spinWheel(phone));
  }, [phone, resolveSpin]);

  // SVG geometry
  const center = VIEWBOX / 2;
  const radius = VIEWBOX / 2 - 18;
  const hubRadius = radius * 0.19;
  const badgeRadius = radius * 0.6;
  const badgeR = radius * 0.205;

  const showWheel = phase === "ready" || phase === "spinning" || phase === "settling";

  return (
    <div className="fullscreen-portrait relative">
      <Ambient rays particles={18} />

      <div className="screen-stack !justify-between">
        {/* Heading */}
        <div className="zone gap-3 flex-shrink-0 spring-in">
          <p className="text-eyebrow text-gold-light">Vòng quay may mắn</p>
          <h2 className="text-display font-black tracking-tight text-center">
            Quà của bạn đây!
          </h2>
        </div>

        {/* Wheel */}
        <div className="zone flex-1 justify-center min-h-0">
          <div
            className="relative aspect-square"
            style={{ width: "min(94vw, 70vh)", height: "min(94vw, 70vh)" }}
          >
            <div className="absolute inset-0 -m-10 rounded-full bg-brand-glow/35 blur-[90px]" />
            <div className="absolute inset-0 rounded-full ring-[16px] ring-gold/70 shadow-gold-glow-lg" />
            <div className="absolute inset-[16px] rounded-full ring-1 ring-white/20" />

            {phase === "loading" && (
              <div className="absolute inset-[24px] rounded-full overflow-hidden">
                <div
                  className="absolute inset-0 animate-spin-slow"
                  style={{
                    background:
                      "conic-gradient(from 0deg, rgba(58,123,255,0.05), rgba(58,123,255,0.4), rgba(245,200,66,0.35), rgba(58,123,255,0.05))",
                  }}
                />
              </div>
            )}

            {showWheel && result && (
              <svg
                ref={svgRef}
                viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
                className="absolute inset-0 w-full h-full fade-in"
                style={{ transform: `rotate(${restRotation}deg)`, willChange: "transform" }}
              >
                <defs>
                  {prizes.map((_, i) => {
                    const [a, b] = WHEEL_PALETTE[i % WHEEL_PALETTE.length];
                    return (
                      <radialGradient id={`wedge-grad-${i}`} key={i} cx="50%" cy="50%" r="62%">
                        <stop offset="0%" stopColor={a} />
                        <stop offset="100%" stopColor={b} />
                      </radialGradient>
                    );
                  })}
                  <clipPath id="badge-clip">
                    <circle cx="0" cy="0" r={badgeR - 6} />
                  </clipPath>
                </defs>

                {prizes.map((p, i) => {
                  const start = i * wedgeAngle;
                  const end = start + wedgeAngle;
                  const d = describeWedge(center, center, radius, start, end);
                  const midAngle = start + wedgeAngle / 2;
                  const badgePos = polarToCartesian(center, center, badgeRadius, midAngle);
                  const img = prizeImage(p.id);
                  const voucher = isVoucher(p.id) || !img;
                  return (
                    <g key={p.id}>
                      <path
                        d={d}
                        fill={p.colorHex ?? `url(#wedge-grad-${i})`}
                        stroke="rgba(245, 200, 66, 0.85)"
                        strokeWidth={3}
                      />
                      <g transform={`translate(${badgePos.x} ${badgePos.y}) rotate(${midAngle})`}>
                        {voucher ? (
                          <>
                            <circle r={badgeR} fill="#f5c842" stroke="#ffffff" strokeWidth={6} />
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              y={-badgeR * 0.16}
                              fontFamily="Montserrat, system-ui, sans-serif"
                              fontWeight={900}
                              fontSize={badgeR * 0.66}
                              fill="#001033"
                            >
                              {voucherShort(p.name)}
                            </text>
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              y={badgeR * 0.42}
                              fontFamily="Montserrat, system-ui, sans-serif"
                              fontWeight={700}
                              fontSize={badgeR * 0.26}
                              fill="#001033"
                            >
                              VOUCHER
                            </text>
                          </>
                        ) : (
                          <>
                            <circle r={badgeR} fill="#ffffff" stroke="#f5c842" strokeWidth={6} />
                            <image
                              href={img!}
                              x={-(badgeR - 6)}
                              y={-(badgeR - 6)}
                              width={(badgeR - 6) * 2}
                              height={(badgeR - 6) * 2}
                              clipPath="url(#badge-clip)"
                              preserveAspectRatio="xMidYMid meet"
                            />
                          </>
                        )}
                      </g>
                    </g>
                  );
                })}

                <circle cx={center} cy={center} r={hubRadius} fill="#001033" stroke="#f5c842" strokeWidth={5} />
                <circle cx={center} cy={center} r={hubRadius - 8} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
              </svg>
            )}

            {/* Center brand icon (static) */}
            <div
              className="absolute z-10 flex items-center justify-center pointer-events-none"
              style={{ top: "50%", left: "50%", width: "24%", height: "24%", transform: "translate(-50%, -50%)" }}
            >
              <Image
                src="/asset/Artboard 9.png"
                alt=""
                width={400}
                height={310}
                className="brand-glow"
                style={{ width: "100%", height: "auto" }}
                draggable={false}
              />
            </div>

            {/* Pointer */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20" style={{ width: "10%" }}>
              <svg viewBox="0 0 80 110" className="w-full h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
                <defs>
                  <linearGradient id="pointer-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fde98a" />
                    <stop offset="100%" stopColor="#c9962a" />
                  </linearGradient>
                </defs>
                <polygon points="40,108 6,12 74,12" fill="url(#pointer-grad)" stroke="#001033" strokeWidth="4" />
                <circle cx="40" cy="22" r="8" fill="#001033" />
              </svg>
            </div>

            {/* Error card overlay */}
            {phase === "error" && errorInfo && (
              <div className="absolute inset-0 flex items-center justify-center z-30 spring-in">
                <div className="glass-panel-strong w-[82%] px-10 py-12 flex flex-col items-center gap-8 text-center">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 border-2 border-white/25">
                    <i
                      className={`text-6xl text-gold-light ${
                        errorInfo.kind === "noPrizes"
                          ? "fa-solid fa-circle-info"
                          : "fa-solid fa-plug-circle-exclamation"
                      }`}
                    />
                  </div>
                  <p className="text-h2 text-white/90 text-balance">{errorInfo.text}</p>
                  <div className="flex flex-col gap-4 w-full">
                    {errorInfo.kind === "retry" && (
                      <button type="button" onClick={handleRetry} className="cta-gold text-h2">
                        <i className="fa-solid fa-rotate-right" />
                        <span>Thử lại</span>
                      </button>
                    )}
                    <button type="button" onClick={onGiveUp} className="cta-ghost text-h2">
                      Về trang chủ
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action / status zone */}
        <div className="zone flex-shrink-0 min-h-[clamp(110px,15vh,260px)] justify-center gap-3">
          {phase === "loading" && (
            <p className="text-h2 text-white/85 flex items-center gap-3">
              <span className="dot-pulse" /> Đang chuẩn bị vòng quay…
            </p>
          )}
          {phase === "ready" && (
            <>
              <button
                type="button"
                onClick={startSpin}
                className="cta-gold animate-pulse-glow"
                style={{ fontSize: "clamp(1.9rem, 4.2vw, 4.2rem)" }}
              >
                <i className="fa-solid fa-arrows-spin" />
                <span>Quay Ngay</span>
              </button>
              <p className="text-caption uppercase tracking-[0.3em] text-white/55">
                Chạm nút để quay vòng may mắn
              </p>
            </>
          )}
          {phase === "spinning" && (
            <p className="text-h2 text-gold-light animate-pulse-soft">
              Hồi hộp chưa, chờ kim dừng lại nhé!
            </p>
          )}
          {phase === "settling" && (
            <p className="text-display font-black text-gold-light animate-pulse-soft">
              Tuyệt vời!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

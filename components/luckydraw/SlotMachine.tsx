"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isSoundEnabled, playPop, playWheelTick } from "../../lib/audio";

/**
 * Two-reel slot machine for ticket numbers 1–50 (tens reel 0–5 conceptually,
 * but both reels carry full 0–9 strips like a real machine). The reels loop
 * while the force check is in flight; once `target` arrives, the tens reel
 * brakes first, then the units reel — each with a small overshoot bounce.
 */

const REPS = 5; // 0-9 repeated → 50 cells per strip
const STRIP = Array.from({ length: REPS * 10 }, (_, i) => i % 10);
const TENS_LAND_MS = 1500;
const UNITS_LAND_MS = 2900;
const LAND_EASE = "cubic-bezier(0.16, 0.6, 0.18, 1.04)"; // slight overshoot = mechanical bounce

type ReelMode = "rest" | "loop" | "land";

interface ReelProps {
  mode: ReelMode;
  /** Digit to sit on when mode is 'rest' or to brake onto when 'land'. */
  digit: number;
  cellH: number;
  landMs: number;
  /** Which repetition to land in — higher = more revolutions while braking. */
  landRep: number;
  dimmed: boolean;
  onStopped?: () => void;
}

function Reel({ mode, digit, cellH, landMs, landRep, dimmed, onStopped }: ReelProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const onStoppedRef = useRef(onStopped);
  onStoppedRef.current = onStopped;

  // Center cell index i on the payline (middle of a 3-cell window).
  const centerY = useCallback((i: number) => -(i - 1) * cellH, [cellH]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    if (mode === "rest") {
      el.classList.remove("reel-looping");
      el.style.transition = "none";
      el.style.transform = `translateY(${centerY(20 + digit)}px)`;
      return;
    }

    if (mode === "loop") {
      el.style.transition = "none";
      el.style.transform = "translateY(0px)";
      el.classList.add("reel-looping");
      return;
    }

    // mode === "land": jump out of the loop (invisible at speed — the strip
    // pattern repeats), then one long eased transition onto the target digit.
    el.classList.remove("reel-looping");
    el.style.transition = "none";
    el.style.transform = `translateY(${centerY(digit)}px)`;
    void el.offsetHeight; // reflow so the jump isn't transitioned
    el.style.transition = `transform ${landMs}ms ${LAND_EASE}`;
    el.style.transform = `translateY(${centerY(landRep * 10 + digit)}px)`;
    const done = (e: TransitionEvent) => {
      if (e.target !== el) return;
      el.removeEventListener("transitionend", done);
      onStoppedRef.current?.();
    };
    el.addEventListener("transitionend", done);
    return () => el.removeEventListener("transitionend", done);
  }, [mode, digit, cellH, landMs, landRep, centerY]);

  return (
    <div className={`slot-window ${dimmed ? "slot-dim" : ""}`} style={{ height: cellH * 3 }}>
      <div
        ref={stripRef}
        className="slot-strip"
        style={{ ["--slot-cell" as string]: `${cellH}px` }}
      >
        {STRIP.map((d, i) => (
          <div key={i} className="slot-cell" style={{ height: cellH, fontSize: cellH * 0.66 }}>
            {d}
          </div>
        ))}
      </div>
      {/* reel shading + payline */}
      <div className="slot-shade" />
      <div className="slot-payline" />
    </div>
  );
}

interface SlotMachineProps {
  /** true while the draw is running (loop → brake). */
  spinning: boolean;
  /** Final number 1–50; null while the force check is still in flight. */
  target: number | null;
  /** Number shown while at rest (last draw), null → 00. */
  restNumber: number | null;
  onLanded: () => void;
}

export default function SlotMachine({ spinning, target, restNumber, onLanded }: SlotMachineProps) {
  const [cellH, setCellH] = useState(140);
  const tickTimer = useRef<number | null>(null);
  const stopsRef = useRef(0);
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;

  useEffect(() => {
    const size = () =>
      setCellH(Math.round(Math.max(84, Math.min(window.innerHeight * 0.105, 190))));
    size();
    window.addEventListener("resize", size);
    return () => window.removeEventListener("resize", size);
  }, []);

  // Tick sounds: constant purr while looping, decelerating while braking.
  useEffect(() => {
    const clear = () => {
      if (tickTimer.current) window.clearTimeout(tickTimer.current);
      tickTimer.current = null;
    };
    clear();
    if (!spinning) return clear;
    if (target === null) {
      const purr = () => {
        if (isSoundEnabled()) playWheelTick();
        tickTimer.current = window.setTimeout(purr, 75);
      };
      purr();
    } else {
      const started = Date.now();
      const decel = () => {
        const t = (Date.now() - started) / UNITS_LAND_MS;
        if (t >= 1) return;
        if (isSoundEnabled()) playWheelTick();
        tickTimer.current = window.setTimeout(decel, 75 + 260 * t * t);
      };
      decel();
    }
    return clear;
  }, [spinning, target]);

  const mode: ReelMode = spinning ? (target === null ? "loop" : "land") : "rest";
  const shown = spinning && target !== null ? target : (restNumber ?? 0);
  const tens = Math.floor(shown / 10) % 10;
  const units = shown % 10;

  const handleStop = useCallback(() => {
    stopsRef.current += 1;
    if (isSoundEnabled()) playPop();
    if (stopsRef.current >= 2) {
      stopsRef.current = 0;
      window.setTimeout(() => onLandedRef.current(), 200); // let the bounce settle
    }
  }, []);

  useEffect(() => {
    if (mode !== "land") stopsRef.current = 0;
  }, [mode]);

  return (
    <div className="slot-cabinet">
      <div className="slot-marquee">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className={`slot-bulb ${spinning ? "lit" : ""}`} style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <div className="slot-face">
        <Reel
          mode={mode}
          digit={tens}
          cellH={cellH}
          landMs={TENS_LAND_MS}
          landRep={2}
          dimmed={!spinning}
          onStopped={handleStop}
        />
        <Reel
          mode={mode}
          digit={units}
          cellH={cellH}
          landMs={UNITS_LAND_MS}
          landRep={3}
          dimmed={!spinning}
          onStopped={handleStop}
        />
      </div>
    </div>
  );
}

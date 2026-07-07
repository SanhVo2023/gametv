"use client";

import { useEffect, useRef, useState } from "react";
import { isSoundEnabled, playWheelTick } from "../../lib/audio";

interface NumberTickerProps {
  /** Numbers to flash while animating. Never empty while spinning. */
  pool: number[];
  /** null = fast shuffle; a number = decelerate and land on it. */
  target: number | null;
  onLanded: () => void;
}

const SHUFFLE_MS = 45;
const DECEL_TICKS = 26;
const DECEL_MAX_MS = 420;

/**
 * Big rolling-number display. JS-driven setTimeout chain (no CSS animation),
 * so it stays smooth in low-perf mode too.
 */
export default function NumberTicker({ pool, target, onLanded }: NumberTickerProps) {
  const [display, setDisplay] = useState<number>(() => pool[0] ?? 1);
  const timerRef = useRef<number | null>(null);
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;
  const poolRef = useRef(pool);
  poolRef.current = pool;

  useEffect(() => {
    const clear = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
    clear();

    const randomShow = (avoid?: number): void => {
      const p = poolRef.current;
      let n = p[Math.floor(Math.random() * p.length)];
      if (avoid !== undefined && p.length > 1) {
        while (n === avoid) n = p[Math.floor(Math.random() * p.length)];
      }
      setDisplay(n);
    };

    if (target === null) {
      // Fast shuffle — sound throttled to every 3rd frame so it purrs, not buzzes.
      let frame = 0;
      const tick = () => {
        randomShow();
        if (isSoundEnabled() && frame % 3 === 0) playWheelTick();
        frame++;
        timerRef.current = window.setTimeout(tick, SHUFFLE_MS);
      };
      tick();
    } else {
      // Deceleration: quadratic ease-out over ~3.2s, last tick = target.
      let i = 0;
      const step = () => {
        if (i < DECEL_TICKS - 1) {
          randomShow(target);
          if (isSoundEnabled()) playWheelTick();
          const d = SHUFFLE_MS + (DECEL_MAX_MS - SHUFFLE_MS) * Math.pow(i / (DECEL_TICKS - 1), 2);
          i++;
          timerRef.current = window.setTimeout(step, d);
        } else {
          setDisplay(target);
          onLandedRef.current();
        }
      };
      step();
    }
    return clear;
  }, [target]);

  return (
    <span
      className="numeric-display font-black leading-none text-gold-light"
      style={{ fontSize: "clamp(9rem, 26vw, 22rem)" }}
    >
      {display}
    </span>
  );
}

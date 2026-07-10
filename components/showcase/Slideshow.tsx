"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface SlideshowProps {
  slides: ReactNode[];
  /** Accessible label for the region, e.g. "Cửa hàng". */
  label?: string;
}

const SWIPE_THRESHOLD_PX = 60;

/**
 * Manual-only slide mechanism shared by the store & brand showcases:
 * big prev/next arrows, dot indicators + counter, horizontal swipe.
 * Transform-only transition — safe on the kiosk GPU.
 */
export default function Slideshow({ slides, label }: SlideshowProps) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + count) % count);
    },
    [count]
  );

  // Keyboard control (presenter remote / attached keyboard):
  // ←/→ (also ↑/↓, PageUp/Down, Space), Home/End, digits 1–9 jump to a slide.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          go(1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          go(-1);
          break;
        case "Home":
          e.preventDefault();
          setIndex(0);
          break;
        case "End":
          e.preventDefault();
          setIndex(count - 1);
          break;
        default: {
          const n = Number(e.key);
          if (n >= 1 && n <= count) setIndex(n - 1);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, count]);

  // Swipe: single-pointer horizontal drag beyond the threshold.
  const touchRef = useRef<{ id: number; x: number } | null>(null);
  const handlePointerDown = (e: React.PointerEvent) => {
    if (touchRef.current) return; // ignore extra fingers
    touchRef.current = { id: e.pointerId, x: e.clientX };
    // Keep receiving events even if the drag wanders over an image
    // (native image drag would otherwise cancel the gesture).
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    const start = touchRef.current;
    if (!start || start.id !== e.pointerId) return;
    touchRef.current = null;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="relative flex w-full flex-1 min-h-0 flex-col" aria-label={label}>
      {/* Slide strip */}
      <div
        className="slide-viewport flex-1 min-h-0"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => (touchRef.current = null)}
      >
        <div
          className="slide-strip"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="slide-cell" aria-hidden={i !== index}>
              {slide}
            </div>
          ))}
        </div>
      </div>

      {/* Edge arrows */}
      <button
        type="button"
        onClick={() => go(-1)}
        className="slide-arrow left-[clamp(8px,1.6vw,28px)]"
        aria-label="Trang trước"
      >
        <i className="fa-solid fa-chevron-left" />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        className="slide-arrow right-[clamp(8px,1.6vw,28px)]"
        aria-label="Trang sau"
      >
        <i className="fa-solid fa-chevron-right" />
      </button>

      {/* Dots + counter */}
      <div className="flex flex-col items-center gap-[1vh] pt-[clamp(10px,1.6vh,28px)]">
        <div className="flex items-center gap-[clamp(8px,1vw,16px)]">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`slide-dot ${i === index ? "active" : ""}`}
              aria-label={`Trang ${i + 1}`}
            />
          ))}
        </div>
        <p className="text-caption uppercase tracking-[0.3em] text-navy-deep/60">
          {index + 1} / {count}
        </p>
      </div>
    </div>
  );
}

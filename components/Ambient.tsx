"use client";

import { useMemo } from "react";

interface AmbientProps {
  /** Slow rotating light-rays behind the content. */
  rays?: boolean;
  /** Number of drifting particles (0 = none). */
  particles?: number;
}

/**
 * Shared decorative background layer — aurora wash, ambient glow, optional
 * rotating light rays and drifting particles. All transform/opacity only.
 */
export default function Ambient({ rays = false, particles = 0 }: AmbientProps) {
  const dots = useMemo(() => {
    return Array.from({ length: particles }).map(() => {
      const size = 6 + Math.random() * 18;
      return {
        left: `${Math.random() * 100}%`,
        bottom: `-${10 + Math.random() * 24}px`,
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${9 + Math.random() * 11}s`,
        animationDelay: `${-Math.random() * 14}s`,
        drift: `${(Math.random() - 0.5) * 90}px`,
        blue: Math.random() > 0.5,
      };
    });
  }, [particles]);

  return (
    <>
      <div className="aurora-layer" />
      <div className="ambient-light" />
      {rays && <div className="light-rays" />}
      {particles > 0 && (
        <div className="particle-field">
          {dots.map((d, i) => (
            <span
              key={i}
              className={`particle${d.blue ? " blue" : ""}`}
              style={{
                left: d.left,
                bottom: d.bottom,
                width: d.width,
                height: d.height,
                animationDuration: d.animationDuration,
                animationDelay: d.animationDelay,
                ["--drift" as string]: d.drift,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

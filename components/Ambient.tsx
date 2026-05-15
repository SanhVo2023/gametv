"use client";

import { useMemo } from "react";
import { isLowPerf } from "../lib/perf";

interface AmbientProps {
  /** Slow rotating light-rays behind the content. */
  rays?: boolean;
  /** Number of drifting particles (0 = none). */
  particles?: number;
}

/**
 * Shared decorative background layer — aurora wash, ambient glow, optional
 * rotating light rays and drifting particles. All transform/opacity only.
 *
 * In low-perf mode the rays and particles are skipped entirely (no DOM
 * nodes, no animation frames). The aurora + ambient-light stay but are
 * neutered to static colour washes by the CSS overrides in globals.css.
 */
export default function Ambient({ rays = false, particles = 0 }: AmbientProps) {
  const lowPerf = isLowPerf();
  const effectiveParticles = lowPerf ? 0 : particles;
  const effectiveRays = !lowPerf && rays;

  const dots = useMemo(() => {
    return Array.from({ length: effectiveParticles }).map(() => {
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
  }, [effectiveParticles]);

  return (
    <>
      <div className="aurora-layer" />
      <div className="ambient-light" />
      {effectiveRays && <div className="light-rays" />}
      {effectiveParticles > 0 && (
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

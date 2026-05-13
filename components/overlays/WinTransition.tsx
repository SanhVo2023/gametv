"use client";

import { useEffect } from "react";

interface WinTransitionProps {
  onDone: () => void;
}

export default function WinTransition({ onDone }: WinTransitionProps) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 1400);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(245,200,66,0.55),_rgba(0,16,51,0.95))] animate-fade-in-up" />
      <div className="relative z-10 flex flex-col items-center gap-8 slide-up-in">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gold/40 blur-3xl scale-150 animate-pulse-glow" />
          <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-gold-light via-gold to-gold-deep shadow-gold-glow-lg">
            <i className="fa-solid fa-trophy text-7xl text-navy-deep" />
          </div>
        </div>
        <p className="text-eyebrow text-gold-light">CHÚC MỪNG</p>
        <h2 className="text-display-xl font-black tracking-tight text-white text-center">
          Xuất sắc!
        </h2>
        <p className="text-h2 text-white/80">Bạn được quay vòng quay may mắn</p>
      </div>
    </div>
  );
}

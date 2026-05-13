"use client";

import { useCallback } from "react";

interface SoundToggleProps {
  enabled: boolean;
  onToggle: (next: boolean) => void;
}

export default function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
  const handle = useCallback(() => onToggle(!enabled), [enabled, onToggle]);
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={enabled ? "Tắt âm thanh" : "Bật âm thanh"}
      className="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/8 text-2xl text-white/85 backdrop-blur-md transition-all active:scale-95 hover:bg-white/12"
    >
      <i className={enabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark"} />
    </button>
  );
}

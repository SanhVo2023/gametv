"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { playErrorSound, playFlipSound, playMatchSound, playWinSting } from "../../lib/audio";

interface MemoryBoardProps {
  phone: string;
  soundEnabled: boolean;
  onWin: () => void;
  onLose: () => void;
}

interface Card {
  id: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const ICONS = [
  "fa-eye",
  "fa-glasses",
  "fa-eye-dropper",
  "fa-stethoscope",
  "fa-microscope",
  "fa-sun",
  "fa-shield-halved",
  "fa-heart-pulse",
] as const;

const GAME_DURATION = 75;
const FLIP_BACK_DELAY_MS = 850;
const CRITICAL_SECONDS = 20;

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildBoard(): Card[] {
  const seed = ICONS.flatMap((icon) => [icon, icon]);
  return shuffle(seed).map((icon, id) => ({
    id,
    icon,
    isFlipped: false,
    isMatched: false,
  }));
}

export default function MemoryBoard({ soundEnabled, onWin, onLose }: MemoryBoardProps) {
  const [cards, setCards] = useState<Card[]>(() => buildBoard());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(GAME_DURATION);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [vanishedIds, setVanishedIds] = useState<Set<number>>(new Set());
  const timerRef = useRef<number | null>(null);
  const completedRef = useRef<boolean>(false);

  // ---- Timer ----
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          if (!completedRef.current) {
            completedRef.current = true;
            playErrorSound();
            // Defer to allow state to settle and animations to finish.
            window.setTimeout(() => onLose(), 250);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [onLose]);

  // ---- Win check ----
  useEffect(() => {
    if (matchedPairs === ICONS.length && !completedRef.current) {
      completedRef.current = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (soundEnabled) playWinSting();
      confetti({
        particleCount: 140,
        spread: 90,
        startVelocity: 55,
        origin: { y: 0.6 },
        colors: ["#f5c842", "#fde98a", "#ffffff", "#2156e8"],
      });
      window.setTimeout(() => onWin(), 850);
    }
  }, [matchedPairs, onWin, soundEnabled]);

  // ---- Card interaction ----
  const handleCardClick = useCallback(
    (id: number) => {
      if (isProcessing) return;
      if (completedRef.current) return;
      const card = cards.find((c) => c.id === id);
      if (!card || card.isFlipped || card.isMatched) return;
      if (flipped.length >= 2) return;

      if (soundEnabled) playFlipSound();
      const nextFlipped = [...flipped, id];
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, isFlipped: true } : c)));
      setFlipped(nextFlipped);

      if (nextFlipped.length === 2) {
        const [a, b] = nextFlipped;
        const aCard = cards.find((c) => c.id === a)!;
        const bCard = cards.find((c) => c.id === b)!;
        if (aCard.icon === bCard.icon) {
          // Match
          setIsProcessing(true);
          window.setTimeout(() => {
            if (soundEnabled) playMatchSound();
            setCards((prev) =>
              prev.map((c) => (c.id === a || c.id === b ? { ...c, isMatched: true } : c)),
            );
            setMatchedPairs((m) => m + 1);
            setFlipped([]);
            setIsProcessing(false);
            setVanishedIds((prev) => {
              const next = new Set(prev);
              next.add(a);
              next.add(b);
              return next;
            });
            confetti({
              particleCount: 24,
              spread: 60,
              startVelocity: 28,
              origin: { y: 0.55 },
              colors: ["#f5c842", "#ffffff", "#2156e8"],
              ticks: 90,
            });
          }, 220);
        } else {
          // Miss
          setIsProcessing(true);
          window.setTimeout(() => {
            if (soundEnabled) playErrorSound();
            setCards((prev) =>
              prev.map((c) => (c.id === a || c.id === b ? { ...c, isFlipped: false } : c)),
            );
            setFlipped([]);
            setIsProcessing(false);
          }, FLIP_BACK_DELAY_MS);
        }
      }
    },
    [cards, flipped, isProcessing, soundEnabled],
  );

  const timerPercent = useMemo(() => (secondsLeft / GAME_DURATION) * 100, [secondsLeft]);
  const isCritical = secondsLeft <= CRITICAL_SECONDS;

  return (
    <div className="fullscreen-portrait relative">
      <div className="aurora-layer" />
      <div className="ambient-light" />

      <div className="relative z-10 flex flex-1 flex-col items-center px-10 pt-10 pb-12">
        {/* HUD */}
        <div className="w-full max-w-[900px] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="pill">
              <i className="fa-solid fa-trophy text-gold-light" />
              <span>
                <span className="text-gold-light">{matchedPairs}</span>
                <span className="opacity-60"> / {ICONS.length}</span>
              </span>
            </div>
            <div
              className={`numeric-display text-[5rem] font-black leading-none tabular-nums ${
                isCritical ? "text-red-300" : "text-gold-light"
              }`}
            >
              {secondsLeft}
              <span className="text-h2 align-top ml-2 opacity-70">s</span>
            </div>
            <div className="pill">
              <i className="fa-solid fa-bullseye text-gold-light" />
              <span>Vision Care + Elite Day</span>
            </div>
          </div>
          <div className={`timer-bar ${isCritical ? "critical" : ""}`}>
            <div className="timer-bar-fill" style={{ width: `${timerPercent}%` }} />
          </div>
        </div>

        {/* Title strip */}
        <div className="mt-10 text-center">
          <p className="text-eyebrow text-white/60">Tìm các cặp hình giống nhau</p>
        </div>

        {/* Grid */}
        <div className="flex-1 w-full flex items-center justify-center mt-8">
          <div className="game-grid">
            {cards.map((card, idx) => {
              const vanished = card.isMatched && vanishedIds.has(card.id);
              return (
                <div
                  key={card.id}
                  className={`card-container pop-in ${vanished ? "vanished" : ""}`}
                  style={{ animationDelay: `${idx * 32}ms` }}
                  onClick={() => handleCardClick(card.id)}
                >
                  <div
                    className={`card ${card.isFlipped || card.isMatched ? "flipped" : ""} ${
                      card.isMatched ? "vanish-anim" : ""
                    }`}
                  >
                    <div className="face face-back">
                      <img
                        src="/asset/Artboard 9.png"
                        alt=""
                        className="face-back-icon"
                        draggable={false}
                      />
                    </div>
                    <div className="face face-front">
                      <i className={`fa-solid ${card.icon}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

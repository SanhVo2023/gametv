"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  playBoing,
  playErrorSound,
  playFlipSound,
  playMatchSound,
  playWinSting,
} from "../../lib/audio";
import { playfulCopy } from "../../lib/playfulCopy";
import { VisionIcon, VISION_ICON_KEYS, type VisionIconKey } from "../icons/VisionIcons";
import Ambient from "../Ambient";

interface MemoryBoardProps {
  phone: string;
  soundEnabled: boolean;
  onWin: () => void;
  onLose: () => void;
}

interface Card {
  id: number;
  icon: VisionIconKey;
  isFlipped: boolean;
  isMatched: boolean;
}

const PAIR_COUNT = VISION_ICON_KEYS.length; // 8
const GAME_DURATION = 75;
const FLIP_BACK_DELAY_MS = 620;
const MATCH_CELEBRATE_MS = 360; // flip has visually landed — celebrate
const MATCH_VANISH_MS = 1150; // let the matched pair sit, THEN dissolve
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
  const seed = VISION_ICON_KEYS.flatMap((icon) => [icon, icon]);
  return shuffle(seed).map((icon, id) => ({
    id,
    icon,
    isFlipped: false,
    isMatched: false,
  }));
}

interface Toast {
  text: string;
  kind: "match" | "miss";
  key: number;
}

export default function MemoryBoard({ soundEnabled, onWin, onLose }: MemoryBoardProps) {
  const [cards, setCards] = useState<Card[]>(() => buildBoard());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(GAME_DURATION);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [vanishedIds, setVanishedIds] = useState<Set<number>>(new Set());
  const [shakingIds, setShakingIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [encourage, setEncourage] = useState<string>(() => playfulCopy.encourage());
  const timerRef = useRef<number | null>(null);
  const completedRef = useRef<boolean>(false);
  const toastKeyRef = useRef<number>(0);

  // ---- Timer ----
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          if (!completedRef.current) {
            completedRef.current = true;
            if (soundEnabled) playErrorSound();
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
  }, [onLose, soundEnabled]);

  // ---- Rotating encouragement ----
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!completedRef.current) setEncourage(playfulCopy.encourage());
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  // ---- Toast auto-clear ----
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1300);
    return () => window.clearTimeout(id);
  }, [toast]);

  // ---- Win check ----
  useEffect(() => {
    if (matchedPairs === PAIR_COUNT && !completedRef.current) {
      completedRef.current = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (soundEnabled) playWinSting();
      confetti({
        particleCount: 160,
        spread: 95,
        startVelocity: 58,
        origin: { y: 0.6 },
        colors: ["#f5c842", "#fde98a", "#ffffff", "#2156e8"],
      });
      window.setTimeout(() => onWin(), 900);
    }
  }, [matchedPairs, onWin, soundEnabled]);

  const pushToast = useCallback((kind: "match" | "miss") => {
    toastKeyRef.current += 1;
    setToast({
      text: kind === "match" ? playfulCopy.match() : playfulCopy.mismatch(),
      kind,
      key: toastKeyRef.current,
    });
  }, []);

  // ---- Card interaction ----
  const handleCardClick = useCallback(
    (id: number) => {
      if (isProcessing || completedRef.current) return;
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
          // Match — let the cards flip fully OPEN first, celebrate, sit a beat,
          // then dissolve. (Previously they vanished mid-flip.)
          setIsProcessing(true);
          window.setTimeout(() => {
            if (soundEnabled) playMatchSound();
            pushToast("match");
            confetti({
              particleCount: 32,
              spread: 70,
              startVelocity: 34,
              origin: { y: 0.5 },
              colors: ["#f5c842", "#ffffff", "#2156e8"],
              ticks: 100,
            });
          }, MATCH_CELEBRATE_MS);
          window.setTimeout(() => {
            setCards((prev) =>
              prev.map((c) => (c.id === a || c.id === b ? { ...c, isMatched: true } : c)),
            );
            setMatchedPairs((m) => m + 1);
            setFlipped([]);
            setIsProcessing(false);
            setVanishedIds((prev) => new Set(prev).add(a).add(b));
          }, MATCH_VANISH_MS);
        } else {
          // Miss — head-shake + boing
          setIsProcessing(true);
          setShakingIds(new Set([a, b]));
          if (soundEnabled) playBoing();
          pushToast("miss");
          window.setTimeout(() => {
            setCards((prev) =>
              prev.map((c) => (c.id === a || c.id === b ? { ...c, isFlipped: false } : c)),
            );
            setShakingIds(new Set());
            setFlipped([]);
            setIsProcessing(false);
          }, FLIP_BACK_DELAY_MS);
        }
      }
    },
    [cards, flipped, isProcessing, soundEnabled, pushToast],
  );

  const timerPercent = useMemo(() => (secondsLeft / GAME_DURATION) * 100, [secondsLeft]);
  const isCritical = secondsLeft <= CRITICAL_SECONDS;

  return (
    <div className="fullscreen-portrait relative">
      <Ambient particles={14} />

      <div className="screen-stack !gap-0 justify-between">
        {/* HUD */}
        <div className="zone gap-6 flex-shrink-0">
          <div className="w-full max-w-[1500px] flex items-center justify-between gap-6">
            <div className="pill pill-gold text-label">
              <i className="fa-solid fa-trophy" />
              <span>
                <span className="text-gold-light">{matchedPairs}</span>
                <span className="opacity-60"> / {PAIR_COUNT} cặp</span>
              </span>
            </div>

            <div
              className={`numeric-display font-black leading-none ${
                isCritical ? "text-red-300" : "text-gold-light"
              }`}
              style={{ fontSize: "clamp(3.5rem, 8vw, 7rem)" }}
            >
              {secondsLeft}
              <span className="text-h2 align-top ml-2 opacity-70">giây</span>
            </div>

            <div className="pill text-label">
              <i className="fa-solid fa-eye text-gold-light" />
              <span>Vision Care +</span>
            </div>
          </div>

          <div className={`w-full max-w-[1500px] timer-bar ${isCritical ? "critical" : ""}`}>
            <div className="timer-bar-fill" style={{ width: `${timerPercent}%` }} />
          </div>
        </div>

        {/* Subtitle + toast */}
        <div className="zone flex-shrink-0 relative h-[clamp(64px,9vh,140px)] justify-center">
          <p className="text-h2 font-semibold text-white/70 text-center transition-opacity">
            {encourage}
          </p>
          {toast && (
            <div
              key={toast.key}
              className={`absolute spring-in ${
                toast.kind === "match" ? "text-gold-light" : "text-white"
              }`}
            >
              <div
                className={`pill ${
                  toast.kind === "match" ? "pill-gold" : ""
                } text-h2 !tracking-normal !normal-case px-8 py-4`}
              >
                {toast.kind === "match" ? (
                  <i className="fa-solid fa-star" />
                ) : (
                  <i className="fa-solid fa-face-grin-beam-sweat" />
                )}
                <span>{toast.text}</span>
              </div>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="zone flex-1 justify-center min-h-0">
          <div className="game-grid">
            {cards.map((card, idx) => {
              const vanished = card.isMatched && vanishedIds.has(card.id);
              const shaking = shakingIds.has(card.id);
              return (
                <div
                  key={card.id}
                  className={`card-container pop-in ${vanished ? "vanished" : ""} ${
                    shaking ? "shake" : ""
                  }`}
                  style={{ animationDelay: `${idx * 34}ms` }}
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
                      <VisionIcon name={card.icon} className="face-front-icon" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom strip */}
        <div className="zone flex-shrink-0 gap-3">
          <p className="text-caption uppercase tracking-[0.3em] text-white/45">
            Ghép đủ 8 cặp để mở vòng quay may mắn
          </p>
          <div className="flex gap-2.5">
            {Array.from({ length: PAIR_COUNT }).map((_, i) => (
              <span
                key={i}
                className={`h-3 w-10 rounded-full transition-all duration-300 ${
                  i < matchedPairs ? "bg-gold" : "bg-white/12"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

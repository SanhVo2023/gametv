"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  playBoing,
  playCountdownTick,
  playErrorSound,
  playFlipSound,
  playMatchSound,
  playShuffle,
  playWinSting,
} from "../../lib/audio";
import { playfulCopy } from "../../lib/playfulCopy";
import { isLowPerf } from "../../lib/perf";
import type { Difficulty } from "../../lib/types";
import { BrandLogo, BRAND_KEYS, type BrandKey } from "../icons/BrandLogos";
import Ambient from "../Ambient";

interface MemoryBoardProps {
  phone: string;
  difficulty: Difficulty;
  soundEnabled: boolean;
  onWin: () => void;
  onLose: () => void;
  onRestart: () => void;
}

interface Card {
  id: number;
  icon: BrandKey;
  isFlipped: boolean;
  isMatched: boolean;
}

const PAIR_COUNT = 8; // board stays 4×4; brands are sampled 8-of-10 per game
const EASY_DURATION = 80;
const HARD_DURATION = 70;
const FLIP_BACK_DELAY_MS = 620;
const MATCH_CELEBRATE_MS = 360;
const MATCH_VANISH_MS = 1150;
const WARNING_SECONDS = 20;
const INTENSE_SECONDS = 10;
const SWAP_AFTER_MISSES = 3;
const SWAP_LOCK_MS = 1250;

function shuffle<T>(items: T[]): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildBoard(): Card[] {
  // Random 8 of the 10 brands each game (the component remounts per game,
  // so every round gets a fresh sample + layout).
  const brands = shuffle(BRAND_KEYS).slice(0, PAIR_COUNT);
  const seed = brands.flatMap((icon) => [icon, icon]);
  return shuffle(seed).map((icon, id) => ({
    id,
    icon,
    isFlipped: false,
    isMatched: false,
  }));
}

interface Toast {
  text: string;
  kind: "match" | "miss" | "swap";
  key: number;
}

export default function MemoryBoard({
  difficulty,
  soundEnabled,
  onWin,
  onLose,
  onRestart,
}: MemoryBoardProps) {
  const gameDuration = difficulty === "hard" ? HARD_DURATION : EASY_DURATION;

  // `cards` stays in a STABLE id-order for the component's whole life — it is
  // never reordered. Grid position is tracked separately in `slots`
  // (slots[cardId] = grid cell index) and applied via CSS `order`, so the DOM
  // order never changes and React never moves a node (which would restart the
  // moved nodes' CSS animations — the cause of the face-down-card flicker).
  const [cards, setCards] = useState<Card[]>(() => buildBoard());
  const [slots, setSlots] = useState<number[]>(() =>
    Array.from({ length: PAIR_COUNT * 2 }, (_, i) => i),
  );
  const [matchedPairs, setMatchedPairs] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(gameDuration);
  const [vanishedIds, setVanishedIds] = useState<Set<number>>(new Set());
  const [shakingIds, setShakingIds] = useState<Set<number>>(new Set());
  const [swappingIds, setSwappingIds] = useState<Set<number>>(new Set());
  const [missCount, setMissCount] = useState<number>(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [encourage, setEncourage] = useState<string>(() => playfulCopy.encourage());

  const timerRef = useRef<number | null>(null);
  const completedRef = useRef<boolean>(false);
  const toastKeyRef = useRef<number>(0);
  const missCountRef = useRef<number>(0);
  const cardsRef = useRef<Card[]>(cards);
  cardsRef.current = cards;
  const cardElsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const flipFromRef = useRef<Map<number, DOMRect> | null>(null);

  // Tap handling lives in refs, NOT state: on the TV's weak GPU a re-render
  // can take longer than the gap between two quick taps, so any state the
  // handler reads from its render closure can be stale. Refs are mutated
  // synchronously inside the handler, which makes back-to-back taps safe.
  const flippedRef = useRef<number[]>([]); // the in-progress pair (0–2 ids)
  const matchedIdsRef = useRef<Set<number>>(new Set()); // set the instant a match is detected
  const lockRef = useRef<boolean>(false); // input lock — hard-mode swap glide ONLY
  const missTimerRef = useRef<number | null>(null); // pending flip-back, cancellable by a 3rd tap

  useEffect(() => {
    return () => {
      if (missTimerRef.current) window.clearTimeout(missTimerRef.current);
    };
  }, []);

  const isWarning = secondsLeft <= WARNING_SECONDS && secondsLeft > INTENSE_SECONDS;
  const isIntense = secondsLeft <= INTENSE_SECONDS && secondsLeft > 0;

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

  // ---- Final-10s heartbeat beep ----
  useEffect(() => {
    if (
      soundEnabled &&
      secondsLeft <= INTENSE_SECONDS &&
      secondsLeft > 0 &&
      !completedRef.current
    ) {
      playCountdownTick(secondsLeft);
    }
  }, [secondsLeft, soundEnabled]);

  // ---- Rotating encouragement (panic copy in the danger zone) ----
  useEffect(() => {
    const id = window.setInterval(() => {
      if (completedRef.current) return;
      setEncourage(isIntense ? playfulCopy.panic() : playfulCopy.encourage());
    }, isIntense ? 2500 : 7000);
    return () => window.clearInterval(id);
  }, [isIntense]);

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
        particleCount: isLowPerf() ? 50 : 160,
        spread: 95,
        startVelocity: 58,
        origin: { y: 0.6 },
        colors: ["#f5c842", "#fde98a", "#ffffff", "#2156e8"],
      });
      window.setTimeout(() => onWin(), 900);
    }
  }, [matchedPairs, onWin, soundEnabled]);

  // ---- FLIP animation for hard-mode card swaps ----
  // Runs when `slots` changes (the only thing that moves cards). Cards whose
  // grid cell didn't change have dx/dy ≈ 0 and are skipped — only the two
  // swapped cards animate.
  useLayoutEffect(() => {
    const from = flipFromRef.current;
    if (!from) return;
    flipFromRef.current = null;
    cardElsRef.current.forEach((el, id) => {
      const oldR = from.get(id);
      if (!oldR) return;
      const newR = el.getBoundingClientRect();
      const dx = oldR.left - newR.left;
      const dy = oldR.top - newR.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      void el.offsetWidth; // force reflow (Invert -> Play)
      // slow, smooth glide so the player can register where the cards moved
      el.style.transition = "transform 0.95s cubic-bezier(0.33, 1, 0.45, 1)";
      el.style.transform = "";
      const cleanup = () => {
        el.style.transition = "";
        el.style.transform = "";
        el.removeEventListener("transitionend", cleanup);
      };
      el.addEventListener("transitionend", cleanup);
    });
  }, [slots]);

  const pushToast = useCallback((kind: "match" | "miss") => {
    toastKeyRef.current += 1;
    setToast({
      text: kind === "match" ? playfulCopy.match() : playfulCopy.mismatch(),
      kind,
      key: toastKeyRef.current,
    });
  }, []);

  // ---- Hard mode: swap exactly ONE pair of face-down cards ----
  const doHardSwap = useCallback(() => {
    // Only the `slots` map changes — `cards` (and therefore the DOM order) is
    // left untouched, so React never moves a node and nothing's animation
    // gets restarted. The FLIP effect animates the two cards that moved.
    // matchedIdsRef also excludes pairs still celebrating (matched but not
    // yet flagged isMatched during the pre-vanish window).
    const movableIds = cardsRef.current
      .filter((c) => !c.isMatched && !matchedIdsRef.current.has(c.id))
      .map((c) => c.id);
    if (movableIds.length < 2) return;

    // FLIP: capture current positions before the slot change
    const from = new Map<number, DOMRect>();
    cardElsRef.current.forEach((el, id) => from.set(id, el.getBoundingClientRect()));
    flipFromRef.current = from;

    const pool = shuffle(movableIds);
    const idA = pool[0];
    const idB = pool[1];
    setSlots((prev) => {
      const next = prev.slice();
      [next[idA], next[idB]] = [next[idB], next[idA]];
      return next;
    });
    setSwappingIds(new Set([idA, idB])); // gold highlight so the move is trackable
    window.setTimeout(() => setSwappingIds(new Set()), 1150);
    if (soundEnabled) playShuffle();
    toastKeyRef.current += 1;
    setToast({ text: playfulCopy.swap(), kind: "swap", key: toastKeyRef.current });
  }, [soundEnabled]);

  // ---- Card interaction ----

  // Flip a mismatched pair face-down + hard-mode miss accounting.
  // Returns true when it triggered the hard swap (input is then locked).
  const resolveMiss = useCallback(
    (a: number, b: number): boolean => {
      setCards((prev) =>
        prev.map((c) => (c.id === a || c.id === b ? { ...c, isFlipped: false } : c)),
      );
      setShakingIds(new Set());
      flippedRef.current = [];

      if (difficulty === "hard") {
        const newMiss = missCountRef.current + 1;
        setMissCount(newMiss); // show the full count briefly (incl. 3/3)
        missCountRef.current = newMiss >= SWAP_AFTER_MISSES ? 0 : newMiss;
        if (newMiss >= SWAP_AFTER_MISSES) {
          // keep input locked through the slow swap glide
          lockRef.current = true;
          window.setTimeout(() => {
            doHardSwap();
            setMissCount(0);
            window.setTimeout(() => {
              lockRef.current = false;
            }, SWAP_LOCK_MS);
          }, 320);
          return true;
        }
      }
      return false;
    },
    [difficulty, doHardSwap],
  );

  const handleCardTap = useCallback(
    (id: number) => {
      if (lockRef.current || completedRef.current) return;
      if (matchedIdsRef.current.has(id)) return; // matched (even mid-celebration)
      if (flippedRef.current.includes(id)) return; // re-tap on an open card

      // A mismatched pair is on screen awaiting flip-back — a tap on a third
      // card interrupts: snap the pair down now and count this tap as card 1
      // of the next pair. (A match clears flippedRef synchronously, so
      // length === 2 here always means miss-pending.)
      if (flippedRef.current.length === 2) {
        const [a, b] = flippedRef.current;
        if (missTimerRef.current) {
          window.clearTimeout(missTimerRef.current);
          missTimerRef.current = null;
        }
        // If this was the 3rd hard-mode miss the swap glide starts — swallow
        // the tap, the cards are about to move.
        if (resolveMiss(a, b)) return;
      }

      if (soundEnabled) playFlipSound();
      flippedRef.current = [...flippedRef.current, id];
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, isFlipped: true } : c)));

      if (flippedRef.current.length < 2) return;

      const [a, b] = flippedRef.current;
      // Icons never change after mount, so cardsRef can't be stale for this.
      const aIcon = cardsRef.current.find((c) => c.id === a)!.icon;
      const bIcon = cardsRef.current.find((c) => c.id === b)!.icon;

      if (aIcon === bIcon) {
        // Match — release input IMMEDIATELY; celebrate + dissolve are purely
        // visual timers. The matched ids are dead to taps from this instant.
        matchedIdsRef.current.add(a);
        matchedIdsRef.current.add(b);
        flippedRef.current = [];
        window.setTimeout(() => {
          if (completedRef.current) return;
          if (soundEnabled) playMatchSound();
          pushToast("match");
          confetti({
            particleCount: isLowPerf() ? 12 : 32,
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
          setVanishedIds((prev) => new Set(prev).add(a).add(b));
        }, MATCH_VANISH_MS);
      } else {
        // Miss — head-shake + boing; NO input lock. The pair flips back on a
        // timer, or instantly when the player taps a third card.
        setShakingIds(new Set([a, b]));
        if (soundEnabled) playBoing();
        pushToast("miss");
        missTimerRef.current = window.setTimeout(() => {
          missTimerRef.current = null;
          resolveMiss(a, b);
        }, FLIP_BACK_DELAY_MS);
      }
    },
    [soundEnabled, pushToast, resolveMiss],
  );

  const timerPercent = useMemo(
    () => (secondsLeft / gameDuration) * 100,
    [secondsLeft, gameDuration],
  );
  const timerStateClass = isIntense ? "critical" : isWarning ? "warning" : "";
  const missWarn = difficulty === "hard" && missCount === SWAP_AFTER_MISSES - 1;

  return (
    <div className="fullscreen-portrait relative">
      <Ambient particles={14} />
      {isIntense && <div className="danger-vignette" />}

      {/* Restart — bail back to difficulty selection mid-game */}
      <button
        type="button"
        onClick={onRestart}
        aria-label="Chơi lại"
        className="cta-ghost !min-h-0 !py-[1.2vh] !px-[1.8vw] text-label absolute z-30"
        style={{
          left: "clamp(20px, 3vw, 90px)",
          bottom: "clamp(20px, 3vh, 60px)",
        }}
      >
        <i className="fa-solid fa-rotate-right mr-3" />
        <span>Chơi lại</span>
      </button>

      <div className="screen-stack !gap-0 justify-between">
        {/* HUD */}
        <div className="zone gap-5 flex-shrink-0">
          <div className="w-full max-w-[1500px] flex items-center justify-between gap-6">
            <div className="pill pill-gold text-label">
              <i className="fa-solid fa-trophy" />
              <span>
                <span className="text-gold-light">{matchedPairs}</span>
                <span className="opacity-60"> / {PAIR_COUNT} cặp</span>
              </span>
            </div>

            {/* Big animated countdown */}
            <div className="relative flex items-center justify-center" style={{ minHeight: "clamp(5rem,13vw,13rem)" }}>
              {isIntense && (
                <span
                  className="countdown-ring-danger absolute"
                  style={{ width: "clamp(120px,13vw,260px)", height: "clamp(120px,13vw,260px)" }}
                />
              )}
              <span
                key={secondsLeft}
                className={`numeric-display font-black leading-none ${
                  isIntense ? "countdown-slam text-red-400" : "countdown-tick text-gold-light"
                }`}
                style={{
                  fontSize: isIntense
                    ? "clamp(5rem, 13vw, 13rem)"
                    : "clamp(4.2rem, 10.5vw, 11rem)",
                }}
              >
                {secondsLeft}
              </span>
              <span className="text-h2 opacity-70 self-end mb-[1.4vh] ml-2">giây</span>
            </div>

            {/* Difficulty badge — hard mode also shows the miss counter */}
            {difficulty === "hard" ? (
              <div
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-5 py-3 ${
                  missWarn ? "miss-warning" : ""
                }`}
                style={{
                  background: missWarn ? "rgba(245,158,11,0.22)" : "rgba(220,38,38,0.18)",
                  borderColor: missWarn ? "rgba(251,191,36,0.65)" : "rgba(248,113,113,0.4)",
                }}
              >
                <div
                  className="flex items-center gap-2 text-label font-bold"
                  style={{ color: missWarn ? "#fde68a" : "#fecaca" }}
                >
                  <i className="fa-solid fa-fire-flame-curved flicker" />
                  <span>KHÓ</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-caption uppercase tracking-wider opacity-65">Trượt</span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: SWAP_AFTER_MISSES }).map((_, i) => (
                      <span
                        key={i}
                        className="rounded-full transition-all duration-300"
                        style={{
                          width: "clamp(11px,1.1vw,20px)",
                          height: "clamp(11px,1.1vw,20px)",
                          background:
                            i < missCount
                              ? missWarn
                                ? "#fbbf24"
                                : "#f87171"
                              : "rgba(255,255,255,0.15)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="pill text-label">
                <i className="fa-solid fa-face-smile-beam text-gold-light" />
                <span>DỄ</span>
              </div>
            )}
          </div>

          <div className={`w-full max-w-[1500px] timer-bar ${timerStateClass}`}>
            <div className="timer-bar-fill" style={{ width: `${timerPercent}%` }} />
          </div>
        </div>

        {/* Subtitle + toast */}
        <div className="zone flex-shrink-0 relative h-[clamp(64px,9vh,140px)] justify-center">
          <p
            className={`text-h2 font-semibold text-center transition-colors ${
              isIntense ? "text-red-300" : "text-white/70"
            }`}
          >
            {encourage}
          </p>
          {toast && (
            <div
              key={toast.key}
              className={`absolute spring-in ${
                toast.kind === "miss" ? "text-white" : "text-gold-light"
              }`}
            >
              <div
                className={`pill ${
                  toast.kind === "miss" ? "" : "pill-gold"
                } text-h2 !tracking-normal !normal-case px-8 py-4`}
              >
                {toast.kind === "match" && <i className="fa-solid fa-star" />}
                {toast.kind === "miss" && <i className="fa-solid fa-face-grin-beam-sweat" />}
                {toast.kind === "swap" && <i className="fa-solid fa-shuffle" />}
                <span>{toast.text}</span>
              </div>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="zone flex-1 justify-center min-h-0">
          <div className="game-grid">
            {cards.map((card) => {
              const vanished = card.isMatched && vanishedIds.has(card.id);
              const shaking = shakingIds.has(card.id);
              return (
                <div
                  key={card.id}
                  ref={(el) => {
                    if (el) cardElsRef.current.set(card.id, el);
                    else cardElsRef.current.delete(card.id);
                  }}
                  className={`card-container ${vanished ? "vanished" : ""} ${
                    shaking ? "shake" : ""
                  } ${swappingIds.has(card.id) ? "card-swapping" : ""}`}
                  style={{ order: slots[card.id] }}
                  // pointerdown (not click): fires on touch-DOWN and per-finger,
                  // so a quick second tap — even mid-multi-touch — always lands.
                  onPointerDown={(e) => {
                    if (e.pointerType === "mouse" && e.button !== 0) return;
                    handleCardTap(card.id);
                  }}
                >
                  <div className="card-inner pop-in" style={{ animationDelay: `${card.id * 34}ms` }}>
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
                        <BrandLogo name={card.icon} className="face-front-icon" />
                      </div>
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

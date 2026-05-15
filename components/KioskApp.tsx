"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState, Difficulty, Prize, SpinResult } from "../lib/types";
import {
  loadSoundPreference,
  playStart,
  setSoundEnabled as setSoundEnabledStorage,
  startAmbientPad,
  stopAmbientPad,
  unlockAudio,
} from "../lib/audio";
import { getPrizes, spinWheel } from "../lib/gas";
import { preloadPrizeImages } from "../lib/prizeImages";
// Importing lib/perf runs initPerfMode() once at module load (before render),
// so <html data-perf="low"> is set in time for the first CSS pass.
import { isLowPerf } from "../lib/perf";

import LandingScreen from "./screens/LandingScreen";
import PhonePad from "./screens/PhonePad";
import InstructionsScreen from "./screens/InstructionsScreen";
import DifficultyScreen from "./screens/DifficultyScreen";
import MemoryBoard from "./screens/MemoryBoard";
import WheelOfFortune from "./screens/WheelOfFortune";
import PrizeReveal from "./screens/PrizeReveal";
import WinTransition from "./overlays/WinTransition";
import LoseModal from "./overlays/LoseModal";
import SoundToggle from "./ui/SoundToggle";

const AUTO_RESET_MS = 15_000;

export default function KioskApp() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [phone, setPhone] = useState<string>("");
  const [isTester, setIsTester] = useState<boolean>(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const audioUnlockedRef = useRef<boolean>(false);
  // The spinWheel request is kicked off the instant the game is won, so its
  // latency is hidden behind the WinTransition + the wheel's pre-spin delay.
  const spinPromiseRef = useRef<Promise<SpinResult> | null>(null);

  // Load sound preference + warm the prize-photo cache once at app start.
  // (Skip the preload on low-perf to avoid hitting RAM on the constrained TV;
  // the wheel falls back to lazy loading at spin time.)
  useEffect(() => {
    setSoundOn(loadSoundPreference());
    if (!isLowPerf()) preloadPrizeImages();
  }, []);

  // Lock portrait orientation when possible.
  useEffect(() => {
    type OrientationLockType =
      | "any" | "natural" | "landscape" | "portrait"
      | "portrait-primary" | "portrait-secondary"
      | "landscape-primary" | "landscape-secondary";
    const so = window.screen?.orientation as
      | { lock?: (type: OrientationLockType) => Promise<void> }
      | undefined;
    if (so && typeof so.lock === "function") {
      so.lock("portrait").catch(() => {
        /* requires kiosk privilege; ignore */
      });
    }
  }, []);

  // Suppress browser pull-to-refresh / overscroll glow.
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);

  // Ambient pad — only on idle, only after audio unlocked.
  useEffect(() => {
    if (appState === "idle" && soundOn && audioUnlockedRef.current) {
      startAmbientPad();
    } else {
      stopAmbientPad();
    }
  }, [appState, soundOn]);

  // Prefetch the prize list — on idle (landing marquee) and again at game start,
  // so the wheel can render instantly from it instead of waiting on spinWheel.
  useEffect(() => {
    if (appState === "idle" || appState === "game") {
      getPrizes()
        .then(setPrizes)
        .catch(() => {
          /* decorative / non-blocking — ignore failures */
        });
    }
  }, [appState]);

  const handleSoundToggle = useCallback(
    (next: boolean) => {
      setSoundOn(next);
      setSoundEnabledStorage(next);
      if (next && appState === "idle" && audioUnlockedRef.current) startAmbientPad();
      if (!next) stopAmbientPad();
    },
    [appState],
  );

  // ---------------- Transitions ----------------

  const handleStart = useCallback(async () => {
    await unlockAudio();
    audioUnlockedRef.current = true;
    // grand "let's go!" stinger on the very first interaction
    if (soundOn) playStart();
    setAppState("phone");
  }, [soundOn]);

  const handlePhoneAllowed = useCallback((confirmedPhone: string, tester: boolean) => {
    setPhone(confirmedPhone);
    setIsTester(tester);
    setAppState("instructions");
  }, []);

  const handlePhoneCancel = useCallback(() => {
    setPhone("");
    setIsTester(false);
    setAppState("idle");
  }, []);

  const handleInstructionsDone = useCallback(() => {
    setAppState("difficulty");
  }, []);

  const handleInstructionsCancel = useCallback(() => {
    setPhone("");
    setIsTester(false);
    setAppState("phone");
  }, []);

  const handleDifficultyChosen = useCallback((d: Difficulty) => {
    setDifficulty(d);
    setAppState("game");
  }, []);

  const handleDifficultyCancel = useCallback(() => {
    // Back-stack: difficulty → instructions (phone stays)
    setAppState("instructions");
  }, []);

  const handleGameWin = useCallback(() => {
    // Kick off the spin request immediately — it resolves while the
    // WinTransition plays, so the wheel can spin almost instantly.
    const p = spinWheel(phone);
    p.catch(() => {
      /* the wheel awaits this promise and surfaces the error itself */
    });
    spinPromiseRef.current = p;
    setAppState("win_transition");
  }, [phone]);

  const handleGameLose = useCallback(() => {
    setAppState("lose_modal");
  }, []);

  const handleWinTransitionEnd = useCallback(() => {
    setAppState("wheel");
  }, []);

  const handleWheelComplete = useCallback((result: SpinResult) => {
    setSpinResult(result);
    setAppState("prize_reveal");
  }, []);

  const resetToIdle = useCallback(() => {
    setPhone("");
    setIsTester(false);
    setSpinResult(null);
    spinPromiseRef.current = null;
    setAppState("idle");
  }, []);

  const handleRetryAfterLoss = useCallback(() => {
    // Phone isn't consumed on a loss — keep it and let the player re-pick a mode.
    setAppState("difficulty");
  }, []);

  // ---------------- Render ----------------
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {appState === "idle" && <LandingScreen onStart={handleStart} prizes={prizes} />}

      {appState === "phone" && (
        <PhonePad onAllowed={handlePhoneAllowed} onCancel={handlePhoneCancel} />
      )}

      {appState === "instructions" && (
        <InstructionsScreen
          onDone={handleInstructionsDone}
          onCancel={handleInstructionsCancel}
        />
      )}

      {appState === "difficulty" && (
        <DifficultyScreen onChosen={handleDifficultyChosen} onCancel={handleDifficultyCancel} />
      )}

      {appState === "game" && (
        <MemoryBoard
          phone={phone}
          difficulty={difficulty}
          soundEnabled={soundOn}
          onWin={handleGameWin}
          onLose={handleGameLose}
          onRestart={handleRetryAfterLoss}
        />
      )}

      {appState === "win_transition" && <WinTransition onDone={handleWinTransitionEnd} />}

      {appState === "wheel" && (
        <WheelOfFortune
          phone={phone}
          soundEnabled={soundOn}
          prizes={prizes}
          spinPromise={spinPromiseRef.current}
          onComplete={handleWheelComplete}
          onGiveUp={resetToIdle}
        />
      )}

      {appState === "prize_reveal" && spinResult && (
        <PrizeReveal
          spin={spinResult}
          isTester={isTester}
          autoResetMs={AUTO_RESET_MS}
          onReset={resetToIdle}
        />
      )}

      {appState === "lose_modal" && (
        <LoseModal phone={phone} onRetry={handleRetryAfterLoss} onHome={resetToIdle} />
      )}

      <SoundToggle enabled={soundOn} onToggle={handleSoundToggle} />
    </main>
  );
}

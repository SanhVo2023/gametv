"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppState, Prize, SpinResult } from "../lib/types";
import {
  loadSoundPreference,
  setSoundEnabled as setSoundEnabledStorage,
  startAmbientPad,
  stopAmbientPad,
  unlockAudio,
} from "../lib/audio";
import { getPrizes, spinWheel } from "../lib/gas";

import LandingScreen from "./screens/LandingScreen";
import PhonePad from "./screens/PhonePad";
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
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const audioUnlockedRef = useRef<boolean>(false);
  // The spinWheel request is kicked off the instant the game is won, so its
  // latency is hidden behind the WinTransition + the wheel's pre-spin delay.
  const spinPromiseRef = useRef<Promise<SpinResult> | null>(null);

  // Load sound preference once.
  useEffect(() => {
    setSoundOn(loadSoundPreference());
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

  // Prefetch the prize list (for the landing showcase marquee).
  useEffect(() => {
    if (appState === "idle") {
      getPrizes()
        .then(setPrizes)
        .catch(() => {
          /* showcase is decorative — ignore failures */
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
    if (soundOn) startAmbientPad();
    setAppState("phone");
  }, [soundOn]);

  const handlePhoneAllowed = useCallback((confirmedPhone: string, tester: boolean) => {
    setPhone(confirmedPhone);
    setIsTester(tester);
    setAppState("game");
  }, []);

  const handlePhoneCancel = useCallback(() => {
    setPhone("");
    setIsTester(false);
    setAppState("idle");
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
    setPhone("");
    setAppState("phone");
  }, []);

  // ---------------- Render ----------------
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {appState === "idle" && <LandingScreen onStart={handleStart} prizes={prizes} />}

      {appState === "phone" && (
        <PhonePad onAllowed={handlePhoneAllowed} onCancel={handlePhoneCancel} />
      )}

      {appState === "game" && (
        <MemoryBoard
          phone={phone}
          soundEnabled={soundOn}
          onWin={handleGameWin}
          onLose={handleGameLose}
        />
      )}

      {appState === "win_transition" && <WinTransition onDone={handleWinTransitionEnd} />}

      {appState === "wheel" && (
        <WheelOfFortune
          phone={phone}
          soundEnabled={soundOn}
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

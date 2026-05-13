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
import { getPrizes } from "../lib/gas";

import LandingScreen from "./screens/LandingScreen";
import PhonePad from "./screens/PhonePad";
import MemoryBoard from "./screens/MemoryBoard";
import WheelOfFortune from "./screens/WheelOfFortune";
import PrizeReveal from "./screens/PrizeReveal";
import WinTransition from "./overlays/WinTransition";
import LoseModal from "./overlays/LoseModal";
import SoundToggle from "./ui/SoundToggle";
import NoPrizesScreen from "./screens/NoPrizesScreen";

const AUTO_RESET_MS = 15_000;

export default function KioskApp() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [phone, setPhone] = useState<string>("");
  const [isTester, setIsTester] = useState<boolean>(false);
  const [prizes, setPrizes] = useState<Prize[] | null>(null);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const audioUnlockedRef = useRef<boolean>(false);

  // Load sound preference once.
  useEffect(() => {
    const enabled = loadSoundPreference();
    setSoundOn(enabled);
  }, []);

  // Lock portrait orientation when possible (kiosk install will already set physical orientation).
  useEffect(() => {
    type OrientationLockType =
      | "any"
      | "natural"
      | "landscape"
      | "portrait"
      | "portrait-primary"
      | "portrait-secondary"
      | "landscape-primary"
      | "landscape-secondary";
    const so = (window.screen?.orientation as { lock?: (type: OrientationLockType) => Promise<void> } | undefined);
    if (so && typeof so.lock === "function") {
      so.lock("portrait").catch(() => {
        /* requires fullscreen / kiosk privilege; ignore */
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

  // Ambient pad lifecycle — only audible on idle state, and only after sound is unlocked.
  useEffect(() => {
    if (appState === "idle" && soundOn && audioUnlockedRef.current) {
      startAmbientPad();
    } else {
      stopAmbientPad();
    }
  }, [appState, soundOn]);

  // Prefetch prize list on idle so the wheel is instant when we get there.
  useEffect(() => {
    if (appState === "idle" || appState === "phone") {
      getPrizes().then(setPrizes).catch(() => {
        /* will retry on entry to wheel state */
      });
    }
  }, [appState]);

  const handleSoundToggle = useCallback(
    (next: boolean) => {
      setSoundOn(next);
      setSoundEnabledStorage(next);
      if (next && appState === "idle" && audioUnlockedRef.current) {
        startAmbientPad();
      }
      if (!next) {
        stopAmbientPad();
      }
    },
    [appState],
  );

  // ---------------- Transitions ----------------

  const handleStart = useCallback(async () => {
    // First user gesture — unlock the audio context.
    await unlockAudio();
    audioUnlockedRef.current = true;
    if (soundOn) startAmbientPad();
    setAppState("phone");
  }, [soundOn]);

  const handlePhoneAllowed = useCallback(
    (confirmedPhone: string, tester: boolean) => {
      setPhone(confirmedPhone);
      setIsTester(tester);
      setAppState("game");
    },
    [],
  );

  const handlePhoneCancel = useCallback(() => {
    setPhone("");
    setIsTester(false);
    setAppState("idle");
  }, []);

  const handleGameWin = useCallback(() => {
    setAppState("win_transition");
  }, []);

  const handleGameLose = useCallback(() => {
    setAppState("lose_modal");
  }, []);

  const handleWinTransitionEnd = useCallback(async () => {
    // Make sure we have prizes loaded before the wheel mounts.
    if (!prizes) {
      try {
        const fresh = await getPrizes(true);
        setPrizes(fresh);
        if (fresh.length === 0) {
          setAppState("no_prizes");
          return;
        }
      } catch {
        setAppState("no_prizes");
        return;
      }
    } else if (prizes.length === 0) {
      setAppState("no_prizes");
      return;
    }
    setAppState("wheel");
  }, [prizes]);

  const handleWheelComplete = useCallback((result: SpinResult) => {
    setSpinResult(result);
    setAppState("prize_reveal");
  }, []);

  const handlePrizeAutoReset = useCallback(() => {
    setPhone("");
    setIsTester(false);
    setSpinResult(null);
    setAppState("idle");
  }, []);

  const handleRetryAfterLoss = useCallback(() => {
    setPhone("");
    setAppState("phone");
  }, []);

  const handleHomeFromLoss = useCallback(() => {
    setPhone("");
    setIsTester(false);
    setAppState("idle");
  }, []);

  // ---------------- Render ----------------
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {appState === "idle" && <LandingScreen onStart={handleStart} />}

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

      {appState === "wheel" && prizes && prizes.length > 0 && (
        <WheelOfFortune
          phone={phone}
          prizes={prizes}
          soundEnabled={soundOn}
          onComplete={handleWheelComplete}
          onFail={() => setAppState("no_prizes")}
        />
      )}

      {appState === "prize_reveal" && spinResult && (
        <PrizeReveal
          spin={spinResult}
          isTester={isTester}
          autoResetMs={AUTO_RESET_MS}
          onReset={handlePrizeAutoReset}
        />
      )}

      {appState === "lose_modal" && (
        <LoseModal phone={phone} onRetry={handleRetryAfterLoss} onHome={handleHomeFromLoss} />
      )}

      {appState === "no_prizes" && <NoPrizesScreen onHome={handleHomeFromLoss} />}

      <SoundToggle enabled={soundOn} onToggle={handleSoundToggle} />
    </main>
  );
}

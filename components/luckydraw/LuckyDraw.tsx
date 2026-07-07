"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Ambient from "../Ambient";
import SlotMachine from "./SlotMachine";
import CongratsOverlay from "./CongratsOverlay";
import DrawnBoard from "./DrawnBoard";
import { playWhoosh, playWinSting, unlockAudio } from "../../lib/audio";
import { clearDrawForce, getDrawForce, logDrawWin, type DrawForce } from "../../lib/gas";
import {
  PRIZE_SLOTS,
  getPool,
  loadDrawState,
  randomFromPool,
  resetDrawState,
  saveDrawState,
  type DrawState,
} from "../../lib/luckyDraw";

type Phase =
  | "idle"
  | "spinning"
  | "congrats"
  | "complete"
  | "exhausted"
  | "confirm_reset";

const FORCE_POLL_MS = 2500;
const MIN_SHUFFLE_MS = 1500;
const POLLED_FORCE_MAX_AGE_MS = 10_000;
const RESET_LONG_PRESS_MS = 5000;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * End-of-event lucky draw ("rút thăm trúng thưởng"). Ticket numbers 1–50,
 * 10 prizes drawn least→most prestigious. State lives in localStorage; the
 * GAS backend only supplies the secret admin force channel + audit log.
 */
export default function LuckyDraw() {
  const router = useRouter();
  const [state, setState] = useState<DrawState>(() => loadDrawState());
  const [phase, setPhase] = useState<Phase>(() => {
    const s = loadDrawState();
    if (s.pending) return "congrats"; // reload during congrats → restore it
    if (s.winners.length >= PRIZE_SLOTS.length) return "complete";
    return "idle";
  });
  const [spinTarget, setSpinTarget] = useState<number | null>(null);

  const lastForceRef = useRef<{ force: DrawForce; fetchedAt: number } | null>(null);
  const chosenRef = useRef<number | null>(null);
  const longPressRef = useRef<number | null>(null);

  // ---- Kiosk hardening (same as KioskApp) ----
  useEffect(() => {
    const anyScreen = window.screen as unknown as {
      orientation?: { lock?: (o: string) => Promise<void> };
    };
    anyScreen.orientation?.lock?.("portrait").catch(() => {});
  }, []);
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);

  // ---- ?reset=1 → confirmation panel (query stripped on confirm/cancel) ----
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      setPhase("confirm_reset");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Background force poll while idle (keeps the fallback fresh) ----
  useEffect(() => {
    if (phase !== "idle") return;
    let alive = true;
    const poll = async () => {
      const force = await getDrawForce(2000);
      if (alive && force) lastForceRef.current = { force, fetchedAt: Date.now() };
    };
    poll();
    const id = window.setInterval(poll, FORCE_POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [phase]);

  const persist = useCallback((next: DrawState) => {
    saveDrawState(next);
    setState(next);
  }, []);

  // ---- Spin ----
  const handleSpin = useCallback(async () => {
    await unlockAudio(); // fresh page load → audio context is locked until a gesture
    const pool = getPool(state);
    if (pool.length === 0) {
      setPhase("exhausted");
      return;
    }
    setSpinTarget(null);
    setPhase("spinning");
    playWhoosh();

    // One fresh force check, fully hidden behind the minimum shuffle time.
    const started = Date.now();
    const force = await getDrawForce(MIN_SHUFFLE_MS);
    let target: number;
    if (force && pool.includes(force.number)) {
      target = force.number;
      clearDrawForce();
    } else if (force) {
      // Forced number already taken — consume it so it can't linger.
      clearDrawForce();
      target = randomFromPool(pool);
    } else {
      // Timed out / offline: fall back to the last background poll if fresh.
      const lp = lastForceRef.current;
      if (lp && Date.now() - lp.fetchedAt < POLLED_FORCE_MAX_AGE_MS && pool.includes(lp.force.number)) {
        target = lp.force.number;
        clearDrawForce();
      } else {
        target = randomFromPool(pool);
      }
    }
    lastForceRef.current = null;
    chosenRef.current = target;

    const remaining = MIN_SHUFFLE_MS - (Date.now() - started);
    if (remaining > 0) await delay(remaining);
    setSpinTarget(target); // ticker decelerates onto it
  }, [state]);

  const handleLanded = useCallback(() => {
    const number = chosenRef.current;
    if (number === null) return;
    playWinSting();
    // Persist BEFORE showing congrats so a reload restores the overlay.
    persist({ ...state, pending: { number, slotIndex: state.winners.length } });
    setSpinTarget(null);
    setPhase("congrats");
  }, [state, persist]);

  // ---- Congrats actions ----
  const handleReceive = useCallback(() => {
    if (!state.pending) return;
    const slot = PRIZE_SLOTS[state.pending.slotIndex];
    const winners = [
      ...state.winners,
      {
        number: state.pending.number,
        slotIndex: state.pending.slotIndex,
        tier: slot.tier,
        at: Date.now(),
      },
    ];
    logDrawWin(state.pending.number, slot.tier, "received");
    persist({ ...state, winners, pending: null });
    setPhase(winners.length >= PRIZE_SLOTS.length ? "complete" : "idle");
  }, [state, persist]);

  const handleAbsent = useCallback(() => {
    if (!state.pending) return;
    const slot = PRIZE_SLOTS[state.pending.slotIndex];
    logDrawWin(state.pending.number, slot.tier, "absent");
    // Number excluded permanently; same slot re-spins (slot = winners.length).
    persist({ ...state, absent: [...state.absent, state.pending.number], pending: null });
    setPhase("idle");
  }, [state, persist]);

  // ---- Reset (confirm panel; backup entry = 5s long-press on the title) ----
  const confirmReset = useCallback(() => {
    persist(resetDrawState());
    setPhase("idle");
    router.replace("/spin");
  }, [persist, router]);
  const cancelReset = useCallback(() => {
    setPhase(state.winners.length >= PRIZE_SLOTS.length ? "complete" : state.pending ? "congrats" : "idle");
    router.replace("/spin");
  }, [state, router]);
  const startLongPress = useCallback(() => {
    longPressRef.current = window.setTimeout(() => setPhase("confirm_reset"), RESET_LONG_PRESS_MS);
  }, []);
  const endLongPress = useCallback(() => {
    if (longPressRef.current) window.clearTimeout(longPressRef.current);
  }, []);

  const currentSlot = PRIZE_SLOTS[Math.min(state.winners.length, PRIZE_SLOTS.length - 1)];
  const lastNumber =
    state.pending?.number ?? state.winners[state.winners.length - 1]?.number ?? null;

  return (
    <div className="fullscreen-portrait relative">
      <Ambient rays particles={14} />

      {/* Back to the game kiosk — full navigation resets everything cleanly */}
      <a
        href="/"
        className="cta-ghost !min-h-0 !py-[1.2vh] !px-[1.8vw] text-label absolute z-30"
        style={{ left: "clamp(20px, 3vw, 90px)", top: "clamp(18px, 3vh, 60px)" }}
      >
        <i className="fa-solid fa-arrow-left mr-3" />
        <span>Trở về</span>
      </a>

      {/* justify-evenly spreads the sections across the full height instead of
          packing them at the center */}
      <div className="screen-stack !justify-evenly !gap-0 !py-[clamp(70px,7.5vh,150px)]">
        {/* Header */}
        <div className="zone gap-2">
          <div
            className="pill pill-gold select-none"
            onPointerDown={startLongPress}
            onPointerUp={endLongPress}
            onPointerLeave={endLongPress}
          >
            <i className="fa-solid fa-ticket" />
            <span>Rút thăm trúng thưởng</span>
          </div>
          {phase !== "complete" && (
            <div className="flex flex-col items-center">
              <h1
                className="script-gold leading-tight"
                style={{ fontSize: "clamp(2.6rem, 6vw, 6.5rem)" }}
              >
                {currentSlot.tier}
              </h1>
              {currentSlot.tierTotal > 1 && (
                <p className="text-h2 text-white/70">
                  lượt {currentSlot.nth} / {currentSlot.tierTotal}
                </p>
              )}
            </div>
          )}
        </div>

        {phase === "complete" ? (
          /* Completion board */
          <div className="zone gap-[2vh]">
            <h2 className="text-h1 font-black text-gold-light">Rút thăm hoàn tất!</h2>
            <div className="glass-panel-strong px-[3vw] py-[3vh] flex flex-col gap-3 w-full max-w-[820px]">
              {[...state.winners].reverse().map((w) => (
                <div key={w.slotIndex} className="flex items-center justify-between gap-6">
                  <span className="text-h2 text-white/85">
                    {w.tier}
                    {PRIZE_SLOTS[w.slotIndex].tierTotal > 1
                      ? ` — lượt ${PRIZE_SLOTS[w.slotIndex].nth}`
                      : ""}
                  </span>
                  <span className="numeric-display text-h1 font-black text-gold-light">{w.number}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Slot machine */}
            <div className="zone">
              <SlotMachine
                spinning={phase === "spinning"}
                target={spinTarget}
                restNumber={lastNumber}
                onLanded={handleLanded}
              />
            </div>

            {/* CTA */}
            <div className="zone" style={{ minHeight: "clamp(70px, 8vh, 150px)" }}>
              {phase === "idle" && (
                <button
                  type="button"
                  onClick={handleSpin}
                  className="cta-gold animate-pulse-glow"
                  style={{ fontSize: "clamp(1.8rem, 4vw, 4rem)" }}
                >
                  <i className="fa-solid fa-dice mr-3" />
                  <span>Quay Số</span>
                </button>
              )}
              {phase === "spinning" && (
                <p className="text-h2 text-white/60 uppercase tracking-[0.2em]">Đang quay…</p>
              )}
            </div>

            <DrawnBoard state={state} />
          </>
        )}
      </div>

      {/* Staff: wipe everything and start over (also ?reset=1 / long-press title) */}
      <button
        type="button"
        onClick={() => setPhase("confirm_reset")}
        aria-label="Làm mới lượt rút thăm"
        className="fixed bottom-8 right-8 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-navy-deep/50 text-xl text-white/80 opacity-40 transition-opacity active:opacity-80"
      >
        <i className="fa-solid fa-arrows-rotate" />
      </button>

      {/* Overlays */}
      {phase === "congrats" && state.pending && (
        <CongratsOverlay
          number={state.pending.number}
          slot={PRIZE_SLOTS[state.pending.slotIndex]}
          onReceive={handleReceive}
          onAbsent={handleAbsent}
        />
      )}

      {phase === "exhausted" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-navy-deep/95 px-10">
          <h2 className="text-h1 font-black text-gold-light text-center">Hết số hợp lệ!</h2>
          <p className="text-h2 text-white/75 text-center text-balance">
            Tất cả số phiếu còn lại đều đã trúng hoặc vắng mặt.
          </p>
          <button type="button" onClick={() => setPhase("confirm_reset")} className="cta-ghost">
            Làm mới lượt rút thăm
          </button>
        </div>
      )}

      {phase === "confirm_reset" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-navy-deep/95 px-10">
          <h2 className="text-h1 font-black text-white text-center">Xóa toàn bộ kết quả rút thăm?</h2>
          <p className="text-h2 text-white/70 text-center text-balance max-w-[70vw]">
            {state.winners.length} giải đã trao và {state.absent.length} số vắng mặt sẽ bị xóa. Không thể
            hoàn tác.
          </p>
          <div className="flex items-center gap-8">
            <button type="button" onClick={confirmReset} className="cta-gold">
              Xóa và bắt đầu lại
            </button>
            <button type="button" onClick={cancelReset} className="cta-ghost">
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

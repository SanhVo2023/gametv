"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import confetti from "canvas-confetti";
import { Button } from "./ui/button";

const ICONS = [
  "fa-gift",
  "fa-snowflake",
  "fa-sleigh",
  "fa-bell",
  "fa-tree",
  "fa-snowman",
  "fa-candy-cane",
  "fa-star"
];

const GAME_DURATION = 60;
const ATTEMPTS_PER_DAY = 2;
// Use the inner iframe URL which contains the actual table data
const SHEET_HTML_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQK-jgSHLIG4mOXU1gHFRregxyDP5K_xbeSTElNG_r2jesZfM-QNxTVyicj846JJ2_HWJm0DdFxj8DN/pubhtml/sheet?headers=false&gid=48702679";
const FORM_POST_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScvMZzoq2NR3EN6v77G3VPtvq0PO11XaHmamvz7s0SuTIDalA/formResponse";
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 25000;
const POLL_START_DELAY_MS = 3000;
const BANNER_URL =
  "https://cdn.hstatic.net/files/200000689681/article/artboard_1__10__073cf5b38b54400bb7eabdec9da754d9.png";
const STATUS_FAIL_KEYWORDS = ["fail", "không", "bo qua", "bỏ qua"];

// Normalize phone: remove all non-digit chars for string-to-string comparison
const normalizePhone = (s: string) =>
  (s || "")
    .replace(/\u00A0/g, " ") // convert non-breaking spaces
    .replace(/\D/g, "")      // keep only digits
    .trim();

// Parse sheet timestamp format: "DD/MM/YYYY HH:mm:ss"
function parseSheetTimestamp(ts: string): Date | null {
  if (!ts || !ts.trim()) return null;
  const parts = ts.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!parts) return null;
  const [, day, month, year, hour, minute, second] = parts;
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
  // Validate date
  if (isNaN(date.getTime())) return null;
  return date;
}

// Check if date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

type Card = {
  id: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
};

type SheetRow = {
  timestamp: string;
  phone: string;
  result: string;
  status: string;
  voucher: string;
  value: string;
};

let audioCtx: AudioContext | null = null;

function ensureAudioCtx(enabled: boolean) {
  if (typeof window === "undefined") return null;
  if (!enabled) return null;
  if (!audioCtx) {
    const AC =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  return audioCtx;
}

function playFlipSound(enabled: boolean) {
  const ctx = ensureAudioCtx(enabled);
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

function playMatchSound(enabled: boolean) {
  const ctx = ensureAudioCtx(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.05, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + i * 0.08 + 0.5
    );
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.5);
  });
}

function playErrorSound(enabled: boolean) {
  const ctx = ensureAudioCtx(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.linearRampToValueAtTime(100, now + 0.2);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

function playWinSound(enabled: boolean) {
  const ctx = ensureAudioCtx(enabled);
  if (!ctx) return;
  const now = ctx.currentTime;
  [523, 659, 784, 1046, 784, 1046].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const duration = i === 5 ? 1.0 : 0.2;
    gain.gain.setValueAtTime(0.05, now + i * 0.2);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + i * 0.2 + duration
    );
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.2);
    osc.stop(now + i * 0.2 + duration);
  });
}

async function fetchSheetRows(): Promise<SheetRow[]> {
  const res = await fetch(SHEET_HTML_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Sheet fetch failed");
  const text = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  
  // Try multiple selectors - Google Sheets HTML structure varies
  let rows = Array.from(doc.querySelectorAll("table tbody tr"));
  if (rows.length === 0) {
    rows = Array.from(doc.querySelectorAll("table tr"));
  }
  if (rows.length === 0) {
    rows = Array.from(doc.querySelectorAll("tr"));
  }
  
  console.log("[Sheet] Total TR elements found:", rows.length);
  
  // Debug: show raw HTML structure
  if (rows.length > 0) {
    const firstRow = rows[0];
    const cells = Array.from(firstRow.querySelectorAll("td,th")).map(c => c.textContent?.trim() || "");
    console.log("[Sheet] First row cells:", cells);
  }
  
  // Find header row to detect column indices
  let phoneColIdx = 1;
  let headerRowIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = Array.from(row.querySelectorAll("td,th")).map(
      (c) => c.textContent?.trim().toLowerCase() || ""
    );
    const idx = cells.findIndex((c) => c.includes("điện thoại") || c.includes("phone") || c.includes("số điện"));
    if (idx !== -1) {
      phoneColIdx = idx;
      headerRowIdx = i;
      console.log("[Sheet] Header found at row", i, "phone column index:", phoneColIdx, "cells:", cells);
      break;
    }
  }

  // Get data rows (skip header and any rows before it)
  const dataRows = rows.slice(headerRowIdx + 1).filter((r) => {
    const cells = r.querySelectorAll("td,th");
    if (cells.length < 3) return false;
    const firstCell = cells[0].textContent?.trim() || "";
    // Skip empty rows or header-like rows
    return firstCell.length > 0 && !firstCell.toLowerCase().includes("thời gian");
  });

  console.log("[Sheet] Data rows after filtering:", dataRows.length);

  const result = dataRows.map((r) => {
    const cells = Array.from(r.querySelectorAll("td,th")).map(
      (c) => c.textContent?.trim() || ""
    );
    return {
      timestamp: cells[phoneColIdx - 1] || cells[0] || "",
      phone: cells[phoneColIdx] || "",
      result: cells[phoneColIdx + 1] || "",
      status: cells[phoneColIdx + 2] || "",
      voucher: cells[phoneColIdx + 3] || "",
      value: cells[phoneColIdx + 4] || ""
    };
  });

  // Debug: log first few rows
  console.log("[Sheet] Parsed rows sample:", result.slice(0, 3).map(r => ({
    phone: r.phone,
    phoneNorm: normalizePhone(r.phone),
    result: r.result,
    value: r.value
  })));

  return result;
}

function latestWinForPhone(rows: SheetRow[], phone: string): SheetRow | null {
  const normInput = normalizePhone(phone);
  const phoneWins = rows.filter(
    (r) => normalizePhone(r.phone) === normInput && r.result?.toLowerCase() === "win"
  );
  if (!phoneWins.length) return null;
  // Rows come in chronological order from the sheet; take the last one
  return phoneWins[phoneWins.length - 1];
}

function submitResult(phone: string, result: "win" | "lose") {
  if (!phone) return;
  const formData = new FormData();
  formData.append("entry.1084802864", phone);
  formData.append("entry.1399009874", result);
  fetch(FORM_POST_URL, {
    method: "POST",
    mode: "no-cors",
    body: formData
  }).catch(() => {});
}

function createMiniBurstFromElement(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;
  confetti({
    particleCount: 20,
    spread: 30,
    startVelocity: 15,
    origin: { x, y },
    colors: ["#fbbf24", "#ffffff"],
    disableForReducedMotion: true
  });
}

function SnowLayer() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < 200; i++) {
      const snowflake = document.createElement("div");
      snowflake.classList.add("snowflake");
      const speedClass = Math.random() > 0.6 ? "slow" : Math.random() > 0.5 ? "fast" : "";
      if (speedClass) snowflake.classList.add(speedClass);
      snowflake.innerHTML = Math.random() > 0.5 ? "❄" : "✦";
      snowflake.style.left = `${Math.random() * 100}vw`;
      snowflake.style.animationDuration = `${Math.random() * 5 + 3}s`;
      snowflake.style.animationDelay = `${Math.random() * 5}s`;
      snowflake.style.fontSize = `${Math.random() * 10 + 5}px`;
      snowflake.style.opacity = `${Math.random() * 0.6 + 0.2}`;
      container.appendChild(snowflake);
    }
  }, []);

  return <div ref={containerRef} className="snow-container" />;
}

function SparkleLayer() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < 30; i++) {
      const sparkle = document.createElement("div");
      sparkle.classList.add("sparkle");
      sparkle.style.left = `${Math.random() * 100}%`;
      sparkle.style.top = `${Math.random() * 100}%`;
      sparkle.style.animationDelay = `${Math.random() * 3}s`;
      container.appendChild(sparkle);
    }
  }, []);

  return <div ref={containerRef} className="sparkle-layer" />;
}

function ChristmasDecorations() {
  return (
    <>
      <div className="ornament">🎄</div>
      <div className="ornament">🔔</div>
      <div className="ornament">⭐</div>
      <div className="ornament">🎁</div>
      <div className="holly-corner top-left">🎄</div>
      <div className="holly-corner top-right">🎄</div>
    </>
  );
}

type MemoryGameProps = {
  /**
   * full: LP + phone + game (single page)
   * gameOnly: phone + game only (used on /play route)
   */
  mode?: "full" | "gameOnly";
};

export function MemoryGame({ mode = "full" }: MemoryGameProps) {
  const router = useRouter();
  const isEmbed = useMemo(
    () => router.query.embed === "1" || router.query.embed === "true",
    [router.query.embed]
  );

  const [step, setStep] = useState<"landing" | "phone" | "game">(
    mode === "full" ? "landing" : "phone"
  );
  const [phone, setPhone] = useState("");
  const [isCheckingAttempts, setIsCheckingAttempts] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(ATTEMPTS_PER_DAY);
  const [attemptsStatus, setAttemptsStatus] = useState(
    "Nhấn BẮT ĐẦU để tham gia."
  );
  const [attemptsError, setAttemptsError] = useState("");

  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [timer, setTimer] = useState(GAME_DURATION);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGameArea, setShowGameArea] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalWin, setModalWin] = useState(false);
  const [prizeText, setPrizeText] = useState("");
  const [prizeCode, setPrizeCode] = useState("");
  const [voucherFetched, setVoucherFetched] = useState(false);
  const [voucherError, setVoucherError] = useState(false);
  const [copied, setCopied] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isGameActiveRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const updateAttemptsFromSheet = async (p: string) => {
    setAttemptsError("");
    setAttemptsStatus("Đang kiểm tra lượt...");
    try {
      const rows = await fetchSheetRows();
      const normInput = normalizePhone(p);
      console.log("[Check] Input phone normalized:", normInput, "total rows:", rows.length);
      const phoneRows = rows.filter((r) => {
        const normSheet = normalizePhone(r.phone);
        if (normSheet !== normInput) return false;
        const rowDate = parseSheetTimestamp(r.timestamp);
        const isTodayRow = rowDate && isToday(rowDate);
        if (isTodayRow) console.log("[Check] MATCH TODAY:", r.phone, "→", normSheet, "date:", r.timestamp);
        return isTodayRow;
      });
      console.log("[Check] Matching today rows:", phoneRows.length);
      const used = Math.min(ATTEMPTS_PER_DAY, phoneRows.length);
      const left = Math.max(0, ATTEMPTS_PER_DAY - used);
      setAttemptsUsed(used);
      setAttemptsStatus(`Đã đọc sheet: ${used} lượt hôm nay → còn ${left} lượt`);
      setAttemptsLeft(left);
      return { used, left };
    } catch (err) {
      console.error("[Check] Sheet fetch error:", err);
      setAttemptsUsed(ATTEMPTS_PER_DAY);
      setAttemptsLeft(0);
      setAttemptsError("Hệ thống lỗi");
      return { used: ATTEMPTS_PER_DAY, left: 0 };
    }
  };

  const startTimer = () => {
    setTimer(GAME_DURATION);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (!isGameActiveRef.current) return prev;
        const next = prev - 1;
        if (next <= 0) {
          endGame(false);
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const startVoucherPolling = (currentPhone: string) => {
    const start = Date.now();
    setPrizeText("Đang chờ voucher...");
    setPrizeCode("");
    setVoucherFetched(false);
    setVoucherError(false);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    setTimeout(() => {
      pollIntervalRef.current = setInterval(async () => {
        if (!currentPhone) return;
        if (Date.now() - start > POLL_TIMEOUT_MS) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setPrizeText("Hết thời gian chờ voucher");
          setPrizeCode("Vui lòng liên hệ CSKH");
          setVoucherFetched(true);
          setVoucherError(true);
          return;
        }
        try {
          const rows = await fetchSheetRows();
          const latestWin = latestWinForPhone(rows, currentPhone);
          if (!latestWin) return;
          const status = (latestWin.status || "").trim();
          const statusLower = status.toLowerCase();
          const voucher = latestWin.voucher || "";
          const value = latestWin.value || "";

          // Check for "sent" status (success)
          if (statusLower === "sent") {
            setPrizeText(value || "Voucher đã cấp");
            setPrizeCode(voucher || "");
            setVoucherFetched(true);
            setVoucherError(false);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            return;
          }

          // Check for error status (contains "Lỗi" or "Bỏ qua")
          if (status.includes("Lỗi") || status.includes("Bỏ qua") || status.includes("bỏ qua")) {
            setPrizeText("Gửi voucher thất bại");
            setPrizeCode(status);
            setVoucherFetched(true);
            setVoucherError(true);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            return;
          }
        } catch {
          // ignore polling errors
        }
      }, POLL_INTERVAL_MS);
    }, POLL_START_DELAY_MS);
  };

  const initBoard = () => {
    const selectedIcons = ICONS.slice(0, 6);
    const iconPairs = [...selectedIcons, ...selectedIcons].sort(
      () => Math.random() - 0.5
    );
    const deck: Card[] = iconPairs.map((icon, index) => ({
      id: index,
      icon,
      isFlipped: false,
      isMatched: false
    }));
    setCards(deck);
    setFlipped([]);
    setMatchedPairs(0);
    setIsProcessing(false);
    setIsGameActive(true);
    isGameActiveRef.current = true;
  };

  const handleStartGame = async () => {
    const trimmed = phone.trim();
    if (trimmed.length < 9) {
      setAttemptsError("Sai số điện thoại. Vui lòng dùng số điện thoại chính xác");
      return;
    }

    setPhone(trimmed);

    if (isCheckingAttempts) return;
    setIsCheckingAttempts(true);
    setAttemptsStatus("Đang kiểm tra lượt...");
    setAttemptsError("");
    let fetched = { used: attemptsUsed, left: attemptsLeft };
    try {
      fetched = await updateAttemptsFromSheet(trimmed);
    } catch (err) {
      setAttemptsError("Hệ thống lỗi");
      setIsCheckingAttempts(false);
      return;
    } finally {
      setIsCheckingAttempts(false);
    }

    if (fetched.left <= 0) {
      setAttemptsError(
        "Hết lượt chơi hôm nay. Vui lòng quay lại sau 0h."
      );
      return;
    }

    const ctx = ensureAudioCtx(soundOn);
    if (ctx && ctx.state === "suspended") ctx.resume();

    setShowGameArea(true);
    setStep("game");
    initBoard();
    startTimer();
  };

  const handleCardClick = (index: number) => {
    if (!isGameActive || isProcessing) return;
    const card = cards[index];
    if (!card || card.isFlipped || card.isMatched) return;

    playFlipSound(soundOn);

    const updatedCards = [...cards];
    updatedCards[index] = { ...card, isFlipped: true };
    const newFlipped = [...flipped, index];

    setCards(updatedCards);
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setIsProcessing(true);
      const [id1, id2] = newFlipped;
      const c1 = updatedCards[id1];
      const c2 = updatedCards[id2];

      if (c1.icon === c2.icon) {
        playMatchSound(soundOn);
        setTimeout(() => {
          const newer = [...updatedCards];
          newer[id1] = { ...newer[id1], isMatched: true };
          newer[id2] = { ...newer[id2], isMatched: true };
          setCards(newer);
          setFlipped([]);
          setMatchedPairs((prev) => {
            const next = prev + 1;
            if (typeof window !== "undefined") {
              const el1 = document.getElementById(
                `card-container-${id1}`
              ) as HTMLElement | null;
              const el2 = document.getElementById(
                `card-container-${id2}`
              ) as HTMLElement | null;
              if (el1) createMiniBurstFromElement(el1);
              if (el2) createMiniBurstFromElement(el2);
            }
            if (next === 6) {
              setTimeout(() => endGame(true), 600);
            }
            return next;
          });
          setIsProcessing(false);
        }, 500);
      } else {
        setTimeout(() => {
          const newer = [...updatedCards];
          newer[id1] = { ...newer[id1], isFlipped: false };
          newer[id2] = { ...newer[id2], isFlipped: false };
          setCards(newer);
          setFlipped([]);
          setIsProcessing(false);
          playErrorSound(soundOn);
        }, 800);
      }
    }
  };

  const endGame = (win: boolean) => {
    setIsGameActive(false);
    isGameActiveRef.current = false;
    isGameActiveRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setModalWin(win);
    setShowModal(true);

    if (win) {
      setPrizeText("Đang chờ voucher...");
      setPrizeCode("");
      setVoucherFetched(false);
      setCopied(false);
      startVoucherPolling(phone.trim());

      const duration = 3000;
      const end = Date.now() + duration;
      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#fbbf24", "#ef4444", "#ffffff"]
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#fbbf24", "#22c55e", "#ffffff"]
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();

      playWinSound(soundOn);
    } else {
      setPrizeText("");
      setPrizeCode("");
    }

    submitResult(phone.trim(), win ? "win" : "lose");
  };

  const handleResetGame = async () => {
    // Re-check attempts from sheet before allowing replay
    try {
      const { left } = await updateAttemptsFromSheet(phone.trim());
      if (left <= 0) {
        setAttemptsError("Hết lượt chơi hôm nay. Vui lòng quay lại sau 0h.");
        setShowModal(false);
        setShowGameArea(false);
        setStep("phone");
        return;
      }
      setShowModal(false);
      initBoard();
      startTimer();
    } catch (err) {
      setAttemptsError("Hệ thống lỗi");
      setShowModal(false);
      setShowGameArea(false);
      setStep("phone");
    }
  };

  const backToLanding = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setShowModal(false);
    setIsGameActive(false);
    isGameActiveRef.current = false;
    setIsProcessing(false);
    setCards([]);
    setFlipped([]);
    setMatchedPairs(0);
    setTimer(GAME_DURATION);
    setShowGameArea(false);
    setStep("landing");
    setAttemptsError("");
    setAttemptsStatus("Nhấn Bắt đầu để tham gia.");
  };

  const critical = (timer / GAME_DURATION) * 100 <= 30;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#011574]">
      <div className="aurora-layer" />
      <div className="glow-layer" />
      <div className="ambient-light" />
      <SnowLayer />
      <SparkleLayer />
      <ChristmasDecorations />
      {!isEmbed && (
        <img
          id="mv-logo"
          src="https://file.hstatic.net/200000689681/file/logo_footer-01_b5cfb9c3472547eeafc85fada2b7963f.png"
          alt="Mắt Việt"
        />
      )}

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 p-4">
        <div className="fixed bottom-4 left-4 z-20 flex items-center gap-2 text-xs text-yellow-100">
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/20 bg-black/30 px-3 py-1 text-[11px] hover:bg-white/10"
            onClick={() => setSoundOn((v) => !v)}
          >
            <i className={`fa-solid ${soundOn ? "fa-volume-high" : "fa-volume-xmark"} mr-1`} />
            Âm thanh
          </Button>
        </div>

        {step !== "game" && (
          <>
            {step === "landing" && (
              <>
                <div className="hero-banner">
                  <img
                    src={BANNER_URL}
                    alt="Vui Giáng Sinh – Khui Voucher Khủng"
                    loading="lazy"
                  />
                </div>
                <div className="relative space-y-1 text-center">
                  <h1 className="holiday-title">Trí Nhớ Giáng Sinh</h1>
                  <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-100 drop-shadow-md">
                    <i className="fa-solid fa-star text-yellow-400" />
                    Lật hình nhận voucher đến 200K
                    <i className="fa-solid fa-star text-yellow-400" />
                  </p>
                </div>

                <div className="glass-panel w-full rounded-2xl border border-white/20 p-6 transition-all duration-500">
                  <p className="text-center text-sm text-slate-100/90">
                    Bạn có <b>2 lượt/ngày</b>. Chơi minigame để nhận voucher giảm thêm đến <b>200.000đ</b>.
                  </p>

                  <div className="mt-4 flex flex-col gap-3">
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        setAttemptsStatus("Nhập SĐT để kiểm tra lượt chơi hôm nay.");
                        setStep("phone");
                      }}
                    >
                      BẮT ĐẦU
                    </Button>
                  </div>

                  <details className="info-card mt-4 space-y-2 text-sm leading-relaxed">
                    <summary className="font-semibold text-white">
                      Thông tin chương trình & thể lệ
                    </summary>
                    <div className="space-y-2 text-slate-100/90">
                      <p>
                        “Vui Giáng Sinh – Khui Voucher Khủng”: lật hình nhận voucher giảm thêm đến 200.000đ.
                      </p>
                      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-200">
                        <li>Voucher: 50K (đơn 500K), 100K (700K), 150K (900K), 200K (1.1M).</li>
                        <li>Ưu đãi thêm: -15% tròng kính chính hãng; -10% gọng & kính mát nguyên giá.</li>
                        <li>Áp dụng tại: 183B CMT8, Quốc Hương, Hoàng Hoa Thám, 3 Tháng 2, Hoàng Diệu 2.</li>
                        <li>Mỗi SĐT 2 lượt/ngày. Số lượng voucher có hạn.</li>
                      </ul>
                    </div>
                  </details>
                </div>
              </>
            )}

            {step === "phone" && (
              <div className="w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-4 text-slate-400 hover:text-white hover:bg-white/10"
                  onClick={() => setStep("landing")}
                >
                  <i className="fa-solid fa-arrow-left mr-2" />
                  Quay lại
                </Button>

                <div className="glass-panel w-full rounded-2xl border border-white/10 p-6 transition-all duration-500">
                  <div className="mb-5 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500">
                      <i className="fa-solid fa-mobile-screen-button text-xl text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">Nhập số điện thoại</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Để kiểm tra lượt chơi và nhận voucher qua SMS
                    </p>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-center text-xl tracking-[0.2em] text-white placeholder-gray-500 transition-all focus:outline-none focus:border-yellow-400/50"
                      placeholder="0912345678"
                    />

                    <Button
                      size="lg"
                      className="w-full py-5"
                      onClick={handleStartGame}
                      disabled={isCheckingAttempts || phone.trim().length < 9}
                    >
                      {isCheckingAttempts ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin mr-2" />
                          Đang kiểm tra...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-gamepad mr-2" />
                          VÀO GAME
                        </>
                      )}
                    </Button>

                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Lượt chơi hôm nay:</span>
                        <span className="flex items-center gap-2">
                          <span className="dot-pulse" />
                          <span className="font-semibold text-yellow-400">{attemptsLeft}/{ATTEMPTS_PER_DAY}</span>
                        </span>
                      </div>
                      {attemptsStatus && !attemptsError && (
                        <p className="mt-2 text-center text-xs text-slate-500">
                          {attemptsStatus}
                        </p>
                      )}
                    </div>

                    {attemptsError && (
                      <div className="rounded-lg border border-red-500/20 bg-red-900/20 p-3 text-center">
                        <i className="fa-solid fa-circle-exclamation text-red-400 mr-2 text-sm" />
                        <span className="text-xs text-red-300">{attemptsError}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {showGameArea && (
          <div className="slide-up-in flex w-full flex-col items-center">
            <div className="mb-3 flex w-full items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="border border-white/15 bg-black/20 px-3 py-2 text-[11px] hover:bg-white/10"
                onClick={backToLanding}
              >
                <i className="fa-solid fa-arrow-left mr-2" />
                Trang chủ
              </Button>
            </div>
            <div className="mb-2 flex w-full items-center justify-between rounded-full border border-yellow-500/40 bg-gradient-to-r from-black/60 via-black/40 to-black/60 px-4 py-2 backdrop-blur-md shadow-[0_0_25px_rgba(250,204,21,0.25)]">
              <div className="flex flex-col items-start text-xs font-semibold uppercase tracking-[0.18em] text-yellow-200">
                <span className="opacity-80">Thời gian</span>
                <span className="flex items-center gap-2 text-base font-bold text-yellow-300">
                  <i className="fa-solid fa-hourglass-half animate-pulse" />
                  <span className="font-mono text-lg">{timer}s</span>
                </span>
              </div>
              <div className="flex flex-col items-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                <span className="opacity-80">Cặp trùng</span>
                <span className="text-lg font-bold text-white">{matchedPairs}/6</span>
              </div>
              <div className="flex flex-col items-end text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                <span className="opacity-80">Lượt chơi</span>
                <span className="flex items-center gap-1 text-sm">
                  <i className="fa-solid fa-bolt" />
                  <span className="font-mono text-base">
                    {attemptsLeft}/{ATTEMPTS_PER_DAY}
                  </span>
                </span>
              </div>
            </div>
            <div
              className={`timer-container mb-6 ${critical ? "critical" : ""}`}
            >
              <div
                className="timer-fill"
                style={{ width: `${(timer / GAME_DURATION) * 100}%` }}
              />
            </div>

            <div className="game-grid" id="grid-container-react">
              {cards.map((card, index) => (
                <div
                  key={card.id}
                  id={`card-container-${index}`}
                  className="card-container pop-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => handleCardClick(index)}
                >
                  <div
                    className={`card ${
                      card.isFlipped || card.isMatched ? "flipped" : ""
                    } ${card.isMatched ? "vanish-anim vanished" : ""}`}
                  >
                    <div className="face face-back" />
                    <div className="face face-front">
                      <i className={`fa-solid ${card.icon}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="glass-panel relative w-full max-w-sm scale-100 rounded-3xl border-2 border-white/20 p-8 text-center">
            <div className="absolute -top-10 -right-10 text-8xl opacity-10 rotate-12">
              ✨
            </div>
            <div className="absolute -bottom-10 -left-10 text-8xl opacity-10 -rotate-12">
              ✨
            </div>

            <div
              className={`mx-auto -mt-20 mb-4 flex h-24 w-24 items-center justify-center rounded-full ring-4 ring-white shadow-2xl ${
                modalWin
                  ? "bg-gradient-to-br from-yellow-300 to-yellow-600"
                  : "bg-gray-700"
              }`}
            >
              <i
                className={`fa-solid text-4xl text-white ${
                  modalWin ? "fa-crown" : "fa-hourglass-end"
                }`}
              />
            </div>

            <h2 className="mb-2 text-3xl font-bold holiday-font text-white drop-shadow-lg">
              {modalWin ? "🎉 Chúc mừng!" : "Hết giờ"}
            </h2>
            <p className="mb-4 text-sm text-slate-300">
              {modalWin
                ? `Bạn đã hoàn thành trong ${GAME_DURATION - timer}s`
                : "Thời gian đã hết. Hãy thử lại nhé!"}
            </p>

            {modalWin && (
              <div className="mb-6 space-y-4">
                {!voucherFetched ? (
                  <div className="rounded-xl border border-yellow-500/30 bg-black/50 p-5">
                    <div className="flex items-center justify-center gap-3">
                      <i className="fa-solid fa-spinner fa-spin text-2xl text-yellow-400" />
                      <span className="text-lg text-yellow-200">Đang lấy voucher...</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Vui lòng chờ trong giây lát</p>
                  </div>
                ) : voucherError ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border-2 border-red-500/50 bg-gradient-to-b from-red-900/40 to-black/60 p-5">
                      <p className="text-xs uppercase tracking-wider text-red-300/80 mb-1">Có lỗi xảy ra</p>
                      <div className="text-2xl font-bold text-red-400">
                        {prizeText}
                      </div>
                      <p className="mt-3 text-sm text-slate-400">{prizeCode}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border-2 border-yellow-500/50 bg-gradient-to-b from-yellow-900/40 to-black/60 p-5">
                      <p className="text-xs uppercase tracking-wider text-yellow-300/80 mb-1">🎁 Phần thưởng của bạn</p>
                      <div className="text-3xl font-black text-yellow-400 drop-shadow-lg">
                        {prizeText || "Voucher"}
                      </div>
                      {prizeCode && (
                        <>
                          <p className="mt-3 text-xs text-slate-400">Mã voucher:</p>
                          <div className="mt-1 inline-block rounded-lg border border-yellow-500/30 bg-black/60 px-4 py-2 font-mono text-xl font-bold tracking-wider text-white">
                            {prizeCode}
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-900/20 p-4">
                      <div className="flex items-center justify-center gap-2 text-emerald-300">
                        <i className="fa-solid fa-message-sms text-lg" />
                        <span className="text-sm font-medium">Voucher sẽ được gửi qua SMS đến số {phone}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!modalWin && (
              <div className="mb-6 rounded-xl border border-slate-500/30 bg-slate-900/30 p-4">
                <p className="text-sm text-slate-300">
                  Đừng nản chí! Hãy thử lại nhé.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {modalWin && voucherFetched && !voucherError && prizeCode && (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(prizeCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"} mr-2`} />
                  {copied ? "Đã sao chép!" : "Sao chép mã"}
                </Button>
              )}

              {attemptsLeft === 1 && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20"
                  onClick={handleResetGame}
                >
                  <i className="fa-solid fa-rotate-right mr-2" />
                  Chơi lại
                </Button>
              )}

              <Button
                variant="ghost"
                size="lg"
                className="w-full text-slate-300 hover:text-white hover:bg-white/10"
                onClick={backToLanding}
              >
                <i className="fa-solid fa-home mr-2" />
                Về trang chủ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



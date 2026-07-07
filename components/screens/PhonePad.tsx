"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { checkPhone } from "../../lib/gas";
import { formatPhoneDisplay, isValidVietnamesePhone, normalizePhone } from "../../lib/phone";
import { playErrorSound, playKeyTap, playMatchSound } from "../../lib/audio";
import Ambient from "../Ambient";

interface PhonePadProps {
  onAllowed: (phone: string, isTester: boolean) => void;
  onCancel: () => void;
}

const MAX_DIGITS = 11;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"] as const;

type ErrorKind = "invalid" | "already_won" | "network" | null;

const ERROR_COPY: Record<Exclude<ErrorKind, null>, string> = {
  invalid: "Số điện thoại không hợp lệ — vui lòng kiểm tra lại.",
  already_won: "Số điện thoại này đã tham gia. Hẹn gặp lại bạn lần sau!",
  network: "Không kết nối được hệ thống. Vui lòng thử lại.",
};

export default function PhonePad({ onAllowed, onCancel }: PhonePadProps) {
  const [digits, setDigits] = useState<string>("");
  const [error, setError] = useState<ErrorKind>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);

  const onKey = useCallback(
    (key: string) => {
      if (submitting) return;
      setError(null);
      if (key === "back") {
        setDigits((d) => d.slice(0, -1));
        playKeyTap();
        return;
      }
      if (key === "ok") return;
      if (digits.length >= MAX_DIGITS) return;
      setDigits((d) => (d + key).slice(0, MAX_DIGITS));
      playKeyTap();
    },
    [digits.length, submitting],
  );

  const triggerError = useCallback((kind: Exclude<ErrorKind, null>) => {
    setError(kind);
    setShake(true);
    playErrorSound();
    window.setTimeout(() => setShake(false), 520);
  }, []);

  const clearAll = useCallback(() => {
    if (submitting) return;
    setDigits("");
    setError(null);
    playKeyTap();
  }, [submitting]);

  const submit = useCallback(async () => {
    if (submitting) return;
    const normalized = normalizePhone(digits);
    if (!isValidVietnamesePhone(normalized)) {
      triggerError("invalid");
      return;
    }
    setSubmitting(true);
    try {
      const res = await checkPhone(normalized);
      if (res.allowed) {
        playMatchSound();
        onAllowed(normalized, res.isTester);
      } else {
        triggerError("already_won");
      }
    } catch {
      triggerError("network");
    } finally {
      setSubmitting(false);
    }
  }, [digits, onAllowed, submitting, triggerError]);

  // Physical keyboard support (DevTools / QA).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Backspace") onKey("back");
      else if (e.key === "Delete") clearAll();
      else if (e.key === "Enter") submit();
      else if (e.key === "Escape") onCancel();
      else if (/^\d$/.test(e.key)) onKey(e.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey, submit, onCancel, clearAll]);

  const display = digits.length === 0 ? "0••• ••• ••••" : formatPhoneDisplay(digits);
  const canSubmit = isValidVietnamesePhone(normalizePhone(digits)) && !submitting;

  return (
    <div className="fullscreen-portrait relative">
      <Ambient particles={12} />

      {/* Faint brand watermark */}
      <div
        className="absolute -top-[6vh] left-1/2 -translate-x-1/2 z-[1] pointer-events-none"
        style={{ width: "min(48vw, 760px)", opacity: 0.06 }}
      >
        <Image src="/asset/Artboard 9.png" alt="" width={600} height={460} className="w-full h-auto" />
      </div>

      {/* Top chrome — anchored */}
      <div className="absolute z-20 flex items-center justify-between top-[clamp(18px,3vh,60px)] left-[clamp(24px,3.5vw,110px)] right-[clamp(24px,3.5vw,110px)]">
        <button
          type="button"
          onClick={onCancel}
          className="cta-ghost !min-h-0 !py-[1.4vh] !px-[2vw] text-label"
        >
          <i className="fa-solid fa-arrow-left mr-3" />
          <span>Trở về</span>
        </button>
        <div className="pill pill-gold">
          <i className="fa-solid fa-shield-halved" />
          <span>Mỗi SĐT chơi 1 lần duy nhất</span>
        </div>
      </div>

      {/* Bottom teaser — anchored */}
      <div className="absolute left-0 right-0 z-20 flex justify-center bottom-[clamp(18px,3vh,60px)]">
        <div className="pill">
          <i className="fa-solid fa-gift text-gold-light" />
          <span>Chơi để nhận 1 trong 8 phần quà hấp dẫn từ Mắt Việt</span>
        </div>
      </div>

      {/* Centered content cluster */}
      <div className="screen-stack">
        <div className="zone gap-3 slide-up-in">
          <p className="text-eyebrow text-gold-light">Mắt Việt Anniversary Event</p>
          <h2 className="text-h1 font-black tracking-tight text-center text-balance">
            Nhập <span className="text-gold-light">số điện thoại</span> để chơi
          </h2>
        </div>

        {/* Phone display */}
        <div
          className={`w-full max-w-[1100px] glass-panel-strong px-12 py-[2.4vh] flex flex-col items-center gap-2 overflow-hidden ${
            shake ? "animate-shake" : ""
          }`}
        >
          <p className="text-caption uppercase tracking-[0.32em] text-white/55">
            Số điện thoại
          </p>
          <div
            className="flex items-center justify-center gap-[0.35em]"
            style={{ fontSize: "clamp(2.4rem, 5.4vw, 5.4rem)" }}
          >
            <span
              className={`phone-display transition-colors ${
                error ? "text-red-300" : "text-white"
              }`}
            >
              {display}
            </span>
            {digits.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                aria-label="Xóa hết"
                className="flex items-center justify-center text-white/35 transition-all active:scale-90 hover:text-white/70 fade-in"
                style={{ fontSize: "0.58em" }}
              >
                <i className="fa-solid fa-circle-xmark" />
              </button>
            )}
          </div>
          <div className="h-[clamp(28px,4vh,60px)] flex items-center">
            {error && (
              <p className="text-body text-red-300 text-center fade-in">{ERROR_COPY[error]}</p>
            )}
            {submitting && !error && (
              <p className="text-body text-white/70 flex items-center gap-3">
                <span className="dot-pulse" /> Đang kiểm tra…
              </p>
            )}
          </div>
        </div>

        {/* Numpad */}
        <div className="w-full max-w-[920px] grid grid-cols-3 gap-[1.6vw]">
          {KEYS.map((k) => {
            if (k === "ok") {
              return (
                <button
                  key={k}
                  type="button"
                  className="numpad-key confirm"
                  onClick={submit}
                  aria-disabled={!canSubmit}
                  disabled={!canSubmit}
                >
                  {submitting ? <i className="fa-solid fa-spinner fa-spin" /> : "BẮT ĐẦU"}
                </button>
              );
            }
            if (k === "back") {
              return (
                <button
                  key={k}
                  type="button"
                  className="numpad-key action"
                  onClick={() => onKey("back")}
                  aria-label="Xoá"
                >
                  <i className="fa-solid fa-delete-left" />
                </button>
              );
            }
            return (
              <button
                key={k}
                type="button"
                className="numpad-key"
                onClick={() => onKey(k)}
                disabled={digits.length >= MAX_DIGITS}
              >
                {k}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

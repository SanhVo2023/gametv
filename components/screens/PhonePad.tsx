"use client";

import { useCallback, useEffect, useState } from "react";
import { checkPhone } from "../../lib/gas";
import { formatPhoneDisplay, isValidVietnamesePhone, normalizePhone } from "../../lib/phone";
import { playErrorSound, playKeyTap, playMatchSound } from "../../lib/audio";

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

  // Physical keyboard support for QA (DevTools, debugging).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Backspace") onKey("back");
      else if (e.key === "Enter") submit();
      else if (e.key === "Escape") onCancel();
      else if (/^\d$/.test(e.key)) onKey(e.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey, submit, onCancel]);

  const display = digits.length === 0 ? "0••• ••• •••" : formatPhoneDisplay(digits);
  const canSubmit = isValidVietnamesePhone(normalizePhone(digits)) && !submitting;

  return (
    <div className="fullscreen-portrait relative">
      <div className="aurora-layer" />
      <div className="ambient-light" />

      <div className="absolute top-12 left-12 right-12 flex items-center justify-between z-20">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-3 px-6 py-4 rounded-full border border-white/15 bg-white/5 text-label text-white/80 active:scale-95 transition-all"
        >
          <i className="fa-solid fa-arrow-left" />
          <span>Trở về</span>
        </button>
        <div className="pill pill-gold">
          <i className="fa-solid fa-shield-halved" />
          <span>Mỗi SĐT tham gia 1 lần duy nhất</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 pt-32 pb-12">
        <div className="w-full max-w-[820px] flex flex-col items-center gap-12 slide-up-in">
          <div className="text-center flex flex-col items-center gap-6">
            <p className="text-eyebrow text-gold-light">VISION CARE + ELITE DAY</p>
            <h2 className="text-display font-black tracking-tight text-balance">
              Nhập <span className="text-gold-light">số điện thoại</span><br />để bắt đầu
            </h2>
          </div>

          <div
            className={`w-full glass-panel-strong px-10 py-8 flex flex-col items-center gap-2 ${
              shake ? "animate-shake" : ""
            }`}
          >
            <p className="text-caption uppercase tracking-[0.32em] text-white/55">Số điện thoại</p>
            <div
              className={`numeric-display text-[5.5rem] font-black tracking-[0.12em] leading-none transition-colors ${
                error ? "text-red-300" : "text-white"
              }`}
            >
              {display}
            </div>
            <div className="h-10 mt-2">
              {error && (
                <p className="text-body text-red-300 text-center fade-in">{ERROR_COPY[error]}</p>
              )}
              {submitting && !error && (
                <p className="text-body text-white/70 text-center flex items-center gap-3 justify-center">
                  <span className="dot-pulse" /> Đang kiểm tra…
                </p>
              )}
            </div>
          </div>

          <div className="w-full grid grid-cols-3 gap-5">
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
    </div>
  );
}

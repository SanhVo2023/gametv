"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearDrawForce,
  getDrawForce,
  getDrawLog,
  setDrawForce,
  type DrawForce,
} from "../../lib/gas";
import { TOTAL_NUMBERS } from "../../lib/luckyDraw";

const REFRESH_MS = 5000;

type Toast = { kind: "ok" | "err"; text: string } | null;

/**
 * Secret admin page (phone): submit a ticket number and the TV's next spin
 * lands on it. Open as /spin-admin?key=<spin_admin_key from the Config sheet>.
 */
export default function LuckyDrawAdmin() {
  const [key, setKey] = useState<string | null>(null);
  const [pending, setPending] = useState<DrawForce | null>(null);
  const [taken, setTaken] = useState<{ received: Set<number>; absent: Set<number> }>({
    received: new Set(),
    absent: new Set(),
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    // "" = no key in URL (shows instructions); null = not read yet.
    setKey(new URLSearchParams(window.location.search).get("key") ?? "");
  }, []);

  // The kiosk locks body scrolling globally — this page runs on a phone and
  // is taller than the viewport, so re-enable scrolling while mounted.
  useEffect(() => {
    document.body.classList.add("allow-scroll");
    return () => document.body.classList.remove("allow-scroll");
  }, []);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  const refresh = useCallback(async () => {
    const [force, log] = await Promise.all([
      getDrawForce(4000),
      getDrawLog().catch(() => ({ received: [], absent: [] })),
    ]);
    setPending(force);
    setTaken({ received: new Set(log.received), absent: new Set(log.absent) });
  }, []);

  useEffect(() => {
    if (!key) return;
    refresh();
    const id = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [key, refresh]);

  const submit = useCallback(async () => {
    if (selected === null || !key) return;
    setBusy(true);
    try {
      await setDrawForce(selected, key);
      setPending({ number: selected, at: Date.now() });
      showToast({ kind: "ok", text: `Đã gửi số ${selected} — lượt quay tiếp theo sẽ ra số này.` });
      setSelected(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast({
        kind: "err",
        text:
          msg === "bad_key"
            ? "Sai khóa admin — kiểm tra lại ?key= trên URL."
            : msg === "admin_key_not_configured"
              ? "Sheet chưa có dòng Config spin_admin_key."
              : `Gửi thất bại: ${msg}`,
      });
    } finally {
      setBusy(false);
    }
  }, [selected, key, showToast]);

  const cancelPending = useCallback(() => {
    clearDrawForce();
    setPending(null);
    showToast({ kind: "ok", text: "Đã hủy số chờ — lượt quay tiếp theo là ngẫu nhiên." });
  }, [showToast]);

  if (key === null) return null; // first client render

  if (!key) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-panel-strong max-w-md p-8 text-center">
          <h1 className="text-2xl font-black text-gold-light mb-4">Trang admin rút thăm</h1>
          <p className="text-white/75">
            Thiếu khóa truy cập. Mở trang này kèm khóa admin:
            <br />
            <code className="text-gold-light">/spin-admin?key=…</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center gap-5 px-4 pt-6 pb-32">
      <h1 className="text-2xl font-black text-gold-light">Điều khiển rút thăm</h1>

      {/* Pending force banner */}
      {pending ? (
        <div className="w-full max-w-md glass-panel-strong border border-gold/60 px-5 py-4 flex items-center justify-between gap-4">
          <span className="text-white/90">
            Đang chờ: <span className="text-gold-light font-black text-2xl">số {pending.number}</span>
          </span>
          <button
            type="button"
            onClick={cancelPending}
            className="cta-ghost !min-h-0 !py-2 !px-4 text-sm"
          >
            Hủy số chờ
          </button>
        </div>
      ) : (
        <p className="text-white/55 text-sm">Chưa có số chờ — lượt quay tiếp theo là ngẫu nhiên.</p>
      )}

      {/* Number grid */}
      <div className="grid grid-cols-5 gap-2.5 w-full max-w-md">
        {Array.from({ length: TOTAL_NUMBERS }, (_, i) => {
          const n = i + 1;
          const isTaken = taken.received.has(n) || taken.absent.has(n);
          const isSelected = selected === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setSelected(isSelected ? null : n)}
              className={`h-14 rounded-xl font-black text-lg transition-colors border ${
                isSelected
                  ? "bg-gold text-navy-deep border-gold"
                  : isTaken
                    ? "bg-white/5 text-white/25 border-white/10 line-through"
                    : "bg-white/10 text-white/85 border-white/20 active:bg-white/25"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p className="text-white/40 text-xs text-center max-w-md">
        Số gạch ngang đã trúng hoặc vắng mặt (cập nhật mỗi 5 giây). Vẫn có thể gửi — TV sẽ tự bỏ qua
        nếu số không còn hợp lệ.
      </p>

      {/* Submit — sticky bottom bar, always thumb-reachable */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pt-3 pb-5"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(0,16,51,0.92) 35%)",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={submit}
          disabled={selected === null || busy}
          className="cta-gold !min-h-0 w-full max-w-md !py-4 disabled:opacity-40"
          style={{ fontSize: "1.3rem" }}
        >
          {busy ? "Đang gửi…" : selected === null ? "Chọn một số" : `Gửi số ${selected}`}
        </button>
      </div>

      {toast && (
        <div
          className={`fixed bottom-28 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl px-5 py-4 text-center font-semibold shadow-xl ${
            toast.kind === "ok" ? "bg-gold text-navy-deep" : "bg-red-600 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

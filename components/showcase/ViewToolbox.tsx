"use client";

import { useEffect, useRef, useState } from "react";

export type ToolboxView = "home" | "stores" | "brands" | "company";

interface ViewToolboxProps {
  current: ToolboxView;
}

const ITEMS: { view: ToolboxView | "standby"; href: string; icon: string; label: string }[] = [
  { view: "home", href: "/", icon: "fa-house", label: "Trang chính" },
  { view: "stores", href: "/stores", icon: "fa-shop", label: "Cửa hàng" },
  { view: "brands", href: "/brands", icon: "fa-gem", label: "Thương hiệu" },
  { view: "company", href: "/company", icon: "fa-cake-candles", label: "Sinh nhật 37 năm" },
  { view: "standby", href: "/standby", icon: "fa-moon", label: "Màn hình chờ" },
];

const AUTO_CLOSE_MS = 6000;

/**
 * Discreet staff navigation between the TV views. Collapsed it is a dim
 * circular button at the bottom-left; a tap expands a compact menu that
 * auto-collapses after a few seconds or on an outside tap.
 */
export default function ViewToolbox({ current }: ViewToolboxProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    closeTimer.current = window.setTimeout(() => setOpen(false), AUTO_CLOSE_MS);
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, [open]);

  const navigate = (href: string, view: string) => {
    if (view === current) {
      setOpen(false);
      return;
    }
    window.location.href = href;
  };

  return (
    <>
      {open && (
        // Above everything (including the landing's lucky-draw button) so an
        // outside tap only closes the menu.
        <div
          className="fixed inset-0 z-[55]"
          onPointerDown={() => setOpen(false)}
          aria-hidden
        />
      )}
      <div className="fixed bottom-8 left-8 z-[60] flex flex-col items-start gap-3">
        {open && (
          <div className="toolbox-panel">
            {ITEMS.map((item) => {
              const active = item.view === current;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => navigate(item.href, item.view)}
                  className={`toolbox-item ${active ? "active" : ""}`}
                >
                  <i className={`fa-solid ${item.icon} w-8 text-center`} />
                  <span>{item.label}</span>
                  {active && <i className="fa-solid fa-check ml-auto text-gold-light/80" />}
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Chuyển màn hình trình chiếu"
          className={`corner-fab flex items-center justify-center rounded-full border transition-opacity ${
            open
              ? "opacity-90 border-gold/60 bg-navy-deep/80 text-gold-light"
              : "opacity-40 border-white/25 bg-navy-deep/50 text-white/80"
          }`}
        >
          <i className={`fa-solid ${open ? "fa-xmark" : "fa-layer-group"}`} />
        </button>
      </div>
    </>
  );
}

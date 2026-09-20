"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { Prize } from "../lib/types";
import { isVoucher, prizeImage, voucherAmount } from "../lib/prizeImages";

/** Static fallback so the showcase always has content even before GAS responds. */
const FALLBACK: { id: string; name: string }[] = [
  { id: "NONMOLSION", name: "Nón kết Molsion" },
  { id: "PENBL00001", name: "Bút bi Bolon" },
  { id: "VICARDBOLON", name: "Ví đựng card Bolon" },
  { id: "HK-2204-1", name: "Hộp kính lông vũ" },
  { id: "HK-BD117", name: "Hộp kính Mắt Việt" },
  { id: "BONUOCRUA3C", name: "Bộ nước rửa kính" },
];

const CHIP_STYLE = {
  width: "clamp(190px, 17vw, 320px)",
  height: "clamp(230px, 21vw, 380px)",
} as const;

function Chip({ id, name }: { id: string; name: string }) {
  const img = prizeImage(id);

  if (isVoucher(id) || !img) {
    return (
      <div className="prize-chip-voucher shrink-0" style={CHIP_STYLE}>
        <span className="text-eyebrow opacity-70">Voucher</span>
        <span
          className="font-black leading-none mt-1"
          style={{ fontSize: "clamp(1.9rem, 3.2vw, 3.6rem)" }}
        >
          {voucherAmount(name)}
        </span>
        <span className="text-caption font-bold opacity-70">VNĐ</span>
        <span className="text-caption font-extrabold mt-4 tracking-wide">Mắt Việt</span>
      </div>
    );
  }

  return (
    <div className="prize-chip shrink-0 flex-col p-5" style={CHIP_STYLE}>
      <div className="relative flex-1 w-full">
        <Image src={img} alt={name} fill sizes="320px" style={{ objectFit: "contain" }} />
      </div>
      <span
        className="text-navy-deep font-bold text-center mt-2 leading-tight"
        style={{ fontSize: "clamp(0.85rem, 1.2vw, 1.3rem)" }}
      >
        {name}
      </span>
    </div>
  );
}

export default function PrizeMarquee({ prizes }: { prizes: Prize[] }) {
  const items = useMemo(() => {
    // The wheel may repeat a gift on several wedges — the showcase lists each
    // distinct gift once (dedupe by name).
    const seen = new Set<string>();
    const unique = prizes.filter((p) => !seen.has(p.name) && !!seen.add(p.name));
    const live = unique.map((p) => ({ id: p.id, name: p.name }));
    const liveNames = new Set(live.map((p) => p.name));
    const supplemental = FALLBACK.filter((p) => !liveNames.has(p.name));
    const base = live.length > 0 ? [...live, ...supplemental] : FALLBACK;
    return [...base, ...base]; // doubled for a seamless loop
  }, [prizes]);

  return (
    <div className="marquee">
      <div className="marquee-track">
        {items.map((it, i) => (
          <Chip key={`${it.id}-${i}`} id={it.id} name={it.name} />
        ))}
      </div>
    </div>
  );
}

"use client";

/**
 * Official brand logos used as memory-card faces. The sources live in
 * /public/brand/ (the operator's full logo library, huge print-resolution
 * files); the card-sized copies the game actually loads are the ~800px
 * dark-variant PNGs in /public/brand-cards/, one per BrandKey.
 */

export type BrandKey =
  | "cartier"
  | "miumiu"
  | "montblanc"
  | "gucci"
  | "bolon"
  | "molsion"
  | "rayban"
  | "oakley"
  | "prada"
  | "essilor";

export const BRAND_KEYS: BrandKey[] = [
  "cartier",
  "miumiu",
  "montblanc",
  "gucci",
  "bolon",
  "molsion",
  "rayban",
  "oakley",
  "prada",
  "essilor",
];

export function brandLogoSrc(name: BrandKey): string {
  return `/brand-cards/${name}.png`;
}

/** Warm the cache so the first flips don't wait on image fetches. */
export function preloadBrandLogos(): void {
  if (typeof window === "undefined") return;
  BRAND_KEYS.forEach((k) => {
    const img = new window.Image();
    img.src = brandLogoSrc(k);
  });
}

export function BrandLogo({
  name,
  className,
}: {
  name: BrandKey;
  className?: string;
}) {
  return (
    <img
      src={brandLogoSrc(name)}
      alt=""
      className={className}
      draggable={false}
    />
  );
}

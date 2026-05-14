import type { ReactNode } from "react";

/**
 * Custom vision-care icon set — rounded line art, two-tone.
 * Brand-blue stroke + gold accents, sized for the white memory-card front.
 * 8 deliberately distinct silhouettes for fast at-a-glance matching.
 */

const BLUE = "#1138c4";
const BLUE_SOFT = "#2156e8";
const GOLD = "#f5c842";
const INK = "#001033";

export type VisionIconKey =
  | "glasses"
  | "eye"
  | "chart"
  | "dropper"
  | "magnifier"
  | "lens"
  | "sunglasses"
  | "sun";

export const VISION_ICON_KEYS: VisionIconKey[] = [
  "glasses",
  "eye",
  "chart",
  "dropper",
  "magnifier",
  "lens",
  "sunglasses",
  "sun",
];

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke={BLUE}
      strokeWidth={5.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

const ICON_PATHS: Record<VisionIconKey, ReactNode> = {
  glasses: (
    <>
      <circle cx="30" cy="56" r="17" />
      <circle cx="70" cy="56" r="17" />
      <path d="M44 52 Q50 45 56 52" />
      <path d="M13 52 L5 43" />
      <path d="M87 52 L95 43" />
      <circle cx="24" cy="49" r="3.6" fill={GOLD} stroke="none" />
      <circle cx="64" cy="49" r="3.6" fill={GOLD} stroke="none" />
    </>
  ),
  eye: (
    <>
      <path d="M9 50 Q50 15 91 50 Q50 85 9 50 Z" />
      <circle cx="50" cy="50" r="16" fill={BLUE_SOFT} stroke={BLUE} />
      <circle cx="50" cy="50" r="6.5" fill={INK} stroke="none" />
      <circle cx="44" cy="44" r="3.4" fill={GOLD} stroke="none" />
    </>
  ),
  chart: (
    <>
      <rect x="22" y="22" width="56" height="60" rx="7" />
      <path d="M50 22 L50 13" />
      <circle cx="50" cy="11" r="2.6" fill={BLUE} stroke="none" />
      <path
        d="M40 38 L62 38 M40 38 L40 66 M40 52 L57 52 M40 66 L62 66"
        stroke={GOLD}
        strokeWidth={6}
      />
    </>
  ),
  dropper: (
    <>
      <rect x="42" y="12" width="16" height="12" rx="4" />
      <path d="M37 24 L63 24 L63 58 Q63 72 50 76 Q37 72 37 58 Z" />
      <path d="M44 41 L56 41" stroke={GOLD} />
      <path d="M50 82 Q55 89 50 94 Q45 89 50 82 Z" fill={GOLD} stroke="none" />
    </>
  ),
  magnifier: (
    <>
      <circle cx="42" cy="42" r="25" />
      <path d="M60 60 L85 85" strokeWidth={9} />
      <path
        d="M48 30 L50.5 37 L57.5 39.5 L50.5 42 L48 49 L45.5 42 L38.5 39.5 L45.5 37 Z"
        fill={GOLD}
        stroke="none"
      />
    </>
  ),
  lens: (
    <>
      <ellipse cx="50" cy="50" rx="36" ry="24" />
      <path d="M20 44 Q50 70 80 44" />
      <path d="M30 40 Q40 31 55 35" stroke={GOLD} strokeWidth={5} />
    </>
  ),
  sunglasses: (
    <>
      <path
        d="M10 40 Q10 36 15 36 L43 36 Q47 36 46 42 L43 58 Q41 64 33 64 L22 64 Q12 64 11 53 Z"
        fill={BLUE_SOFT}
        stroke={BLUE}
      />
      <path
        d="M90 40 Q90 36 85 36 L57 36 Q53 36 54 42 L57 58 Q59 64 67 64 L78 64 Q88 64 89 53 Z"
        fill={BLUE_SOFT}
        stroke={BLUE}
      />
      <path d="M46 41 Q50 38 54 41" />
      <path d="M10 39 L3 34" />
      <path d="M90 39 L97 34" />
      <path d="M18 44 L29 56" stroke={GOLD} strokeWidth={4} />
      <path d="M62 44 L73 56" stroke={GOLD} strokeWidth={4} />
    </>
  ),
  sun: (
    <>
      <circle cx="50" cy="50" r="17" fill={GOLD} stroke={BLUE} />
      <path d="M50 23 L50 13" />
      <path d="M50 77 L50 87" />
      <path d="M23 50 L13 50" />
      <path d="M77 50 L87 50" />
      <path d="M31 31 L24 24" />
      <path d="M69 31 L76 24" />
      <path d="M31 69 L24 76" />
      <path d="M69 69 L76 76" />
    </>
  ),
};

export function VisionIcon({
  name,
  className,
}: {
  name: VisionIconKey;
  className?: string;
}) {
  return <Svg className={className}>{ICON_PATHS[name]}</Svg>;
}

import dynamic from "next/dynamic";

const LuckyDraw = dynamic(() => import("../components/luckydraw/LuckyDraw"), { ssr: false });

export default function SpinPage() {
  return <LuckyDraw />;
}

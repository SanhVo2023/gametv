import dynamic from "next/dynamic";

const LuckyDrawAdmin = dynamic(() => import("../components/luckydraw/LuckyDrawAdmin"), {
  ssr: false,
});

export default function SpinAdminPage() {
  return <LuckyDrawAdmin />;
}

import dynamic from "next/dynamic";

const KioskApp = dynamic(() => import("../components/KioskApp"), { ssr: false });

export default function Home() {
  return <KioskApp />;
}

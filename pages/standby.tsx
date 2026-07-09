import dynamic from "next/dynamic";

const StandbyView = dynamic(() => import("../components/showcase/StandbyView"), {
  ssr: false,
});

export default function StandbyPage() {
  return <StandbyView />;
}

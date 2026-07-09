import dynamic from "next/dynamic";

const StoreShowcase = dynamic(() => import("../components/showcase/StoreShowcase"), {
  ssr: false,
});

export default function StoresPage() {
  return <StoreShowcase />;
}

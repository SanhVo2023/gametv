import dynamic from "next/dynamic";

const BrandShowcase = dynamic(() => import("../components/showcase/BrandShowcase"), {
  ssr: false,
});

export default function BrandsPage() {
  return <BrandShowcase />;
}

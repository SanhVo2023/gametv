import dynamic from "next/dynamic";

const CompanyShowcase = dynamic(
  () => import("../components/showcase/CompanyShowcase"),
  { ssr: false }
);

export default function CompanyPage() {
  return <CompanyShowcase />;
}

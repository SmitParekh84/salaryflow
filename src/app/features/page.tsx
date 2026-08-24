import { FeaturesView } from "@/features/site/features-view";
import { MarketingStructuredData } from "@/features/site/page-structured-data";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

const DESCRIPTION = `Every part of ${BRAND.name}: the daily number, salary plan, bills, goals, investments, shared spending, statement import, analytics and ${BRAND.assistantName} — all of it feeding one figure.`;

export const metadata: Metadata = {
  title: "Features",
  description: DESCRIPTION,
  alternates: { canonical: "/features" },
  openGraph: { title: `${BRAND.name} features`, description: DESCRIPTION, url: "/features" },
};

export default function FeaturesPage() {
  return (
    <>
      <MarketingStructuredData path="/features" name="Features" description={DESCRIPTION} />
      <FeaturesView />
    </>
  );
}

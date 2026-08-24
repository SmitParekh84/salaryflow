import { MarketingStructuredData } from "@/features/site/page-structured-data";
import { HowItWorksView } from "@/features/site/how-it-works-view";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

const DESCRIPTION = `How ${BRAND.name} turns your salary into one number for today: payday opens the cycle, bills and savings come out first, and what is left is divided by the days until you are paid again.`;

export const metadata: Metadata = {
  title: "How it works",
  description: DESCRIPTION,
  alternates: { canonical: "/how-it-works" },
  openGraph: { title: `How ${BRAND.name} works`, description: DESCRIPTION, url: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <>
      <MarketingStructuredData
        path="/how-it-works"
        name="How it works"
        description={DESCRIPTION}
      />
      <HowItWorksView />
    </>
  );
}

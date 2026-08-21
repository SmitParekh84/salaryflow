import { MarketingStructuredData } from "@/features/marketing/page-structured-data";
import { PricingView } from "@/features/marketing/pricing-view";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

const DESCRIPTION = `${BRAND.name} is free while it is in early access: every feature, no card, no tier. What free means here, what it does not mean, and what holds if a paid plan ever arrives.`;

export const metadata: Metadata = {
  title: "Pricing",
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `Pricing - ${BRAND.name}`,
    description: DESCRIPTION,
    url: "/pricing",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `Pricing - ${BRAND.name}`,
    description: DESCRIPTION,
  },
};

export default function PricingPage() {
  return (
    <>
      <MarketingStructuredData
        path="/pricing"
        name={`${BRAND.name} pricing`}
        description={DESCRIPTION}
        breadcrumbName="Pricing"
        freeOffer
      />
      <PricingView />
    </>
  );
}

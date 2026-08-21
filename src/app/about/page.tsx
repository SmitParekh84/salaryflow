import { AboutView } from "@/features/marketing/about-view";
import { MarketingStructuredData } from "@/features/marketing/page-structured-data";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

const DESCRIPTION = `Why ${BRAND.name} reduces your salary, bills, savings and investments to one safe-to-spend number a day, who it is built for, and why it never connects to your bank.`;

export const metadata: Metadata = {
  title: "About",
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `About ${BRAND.name}`,
    description: DESCRIPTION,
    url: "/about",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: `About ${BRAND.name}`, description: DESCRIPTION },
};

export default function AboutPage() {
  return (
    <>
      <MarketingStructuredData
        type="AboutPage"
        path="/about"
        name={`About ${BRAND.name}`}
        description={DESCRIPTION}
        breadcrumbName="About"
      />
      <AboutView />
    </>
  );
}

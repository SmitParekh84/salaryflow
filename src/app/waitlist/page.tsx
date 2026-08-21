import { MarketingStructuredData } from "@/features/marketing/page-structured-data";
import { WaitlistView } from "@/features/marketing/waitlist-view";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

const DESCRIPTION = `Join the ${BRAND.name} early-access waitlist. Leave your email and get a link when your turn comes: one number a day for what is safe to spend, built around your salary cycle.`;

export const metadata: Metadata = {
  title: "Join the waitlist",
  description: DESCRIPTION,
  alternates: { canonical: "/waitlist" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `Join the waitlist - ${BRAND.name}`,
    description: DESCRIPTION,
    url: "/waitlist",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `Join the waitlist - ${BRAND.name}`,
    description: DESCRIPTION,
  },
};

export default function WaitlistPage() {
  return (
    <>
      <MarketingStructuredData
        path="/waitlist"
        name={`Join the ${BRAND.name} waitlist`}
        description={DESCRIPTION}
        breadcrumbName="Join the waitlist"
      />
      <WaitlistView />
    </>
  );
}

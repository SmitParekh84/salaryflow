import { ContactView } from "@/features/marketing/contact-view";
import { MarketingStructuredData } from "@/features/marketing/page-structured-data";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

const DESCRIPTION = `How to reach ${BRAND.name}: where to send product questions and feedback, privacy and data requests, and security reports, and how long a reply takes.`;

export const metadata: Metadata = {
  title: "Contact",
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `Contact - ${BRAND.name}`,
    description: DESCRIPTION,
    url: "/contact",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `Contact - ${BRAND.name}`,
    description: DESCRIPTION,
  },
};

export default function ContactPage() {
  return (
    <>
      <MarketingStructuredData
        type="ContactPage"
        path="/contact"
        name={`Contact ${BRAND.name}`}
        description={DESCRIPTION}
        breadcrumbName="Contact"
      />
      <ContactView />
    </>
  );
}

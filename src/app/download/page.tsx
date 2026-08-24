import { DownloadView } from "@/features/site/download-view";
import { MarketingStructuredData } from "@/features/site/page-structured-data";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

const DESCRIPTION = `Install ${BRAND.name} on your iPhone, Android phone or desktop straight from the browser. Step-by-step instructions per device, no app store and no download.`;

export const metadata: Metadata = {
  title: "Install the app",
  description: DESCRIPTION,
  // Without this the page inherits the root canonical pointing at "/", telling
  // crawlers this page is a duplicate of the home page.
  alternates: { canonical: "/download" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `Install the app - ${BRAND.name}`,
    description: DESCRIPTION,
    url: "/download",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `Install the app - ${BRAND.name}`,
    description: DESCRIPTION,
  },
};

export default function DownloadPage() {
  return (
    <>
      <MarketingStructuredData
        path="/download"
        name={`Install ${BRAND.name}`}
        description={DESCRIPTION}
        breadcrumbName="Install the app"
      />
      <DownloadView />
    </>
  );
}

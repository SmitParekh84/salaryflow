import { DownloadView } from "@/features/download/download-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install the app",
  description:
    "Install Aartha on your iPhone, Android phone, or desktop straight from the browser — no app store required.",
  // Without this the page inherits the root canonical pointing at "/", telling
  // crawlers this page is a duplicate of the home page.
  alternates: { canonical: "/download" },
  openGraph: {
    title: "Install the app — Aartha",
    description: "Install Aartha on your phone or desktop straight from the browser.",
    url: "/download",
  },
};

export default function DownloadPage() {
  return <DownloadView />;
}

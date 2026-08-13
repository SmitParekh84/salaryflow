import { DownloadView } from "@/features/download/download-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install the app",
  description:
    "Install Aartha on your iPhone, Android phone, or desktop straight from the browser — no app store required.",
};

export default function DownloadPage() {
  return <DownloadView />;
}

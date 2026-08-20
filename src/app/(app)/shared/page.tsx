import { SharedSpendingView } from "@/features/shared/shared-spending-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared spending",
};

export default function SharedSpendingPage() {
  return <SharedSpendingView />;
}

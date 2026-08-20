import { InvestmentsView } from "@/features/investments/investments-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investments",
};

export default function InvestmentsPage() {
  return <InvestmentsView />;
}

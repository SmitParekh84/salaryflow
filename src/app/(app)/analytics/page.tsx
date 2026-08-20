import { CashFlowView } from "@/features/reports/cash-flow-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
};

export default function AnalyticsPage() {
  return <CashFlowView />;
}

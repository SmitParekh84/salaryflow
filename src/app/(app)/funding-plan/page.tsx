import { FundingPlanView } from "@/features/funding/funding-plan-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Salary plan",
};

export default function FundingPlanPage() {
  return <FundingPlanView />;
}

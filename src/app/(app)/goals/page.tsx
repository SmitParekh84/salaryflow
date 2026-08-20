import { GoalsView } from "@/features/goals/goals-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goals",
};

export default function GoalsPage() {
  return <GoalsView />;
}

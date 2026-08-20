import { RulesView } from "@/features/rules/rules-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Budget rules",
};

export default function RulesPage() {
  return <RulesView />;
}

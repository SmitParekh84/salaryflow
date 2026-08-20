import { DashboardView } from "@/features/dashboard/dashboard-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return <DashboardView />;
}

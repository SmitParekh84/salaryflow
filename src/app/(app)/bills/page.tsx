import { BillsView } from "@/features/bills/bills-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bills",
};

export default function BillsPage() {
  return <BillsView />;
}

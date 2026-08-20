import { ExpensesView } from "@/features/expenses/expenses-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Expenses",
};

export default function ExpensesPage() {
  return <ExpensesView />;
}

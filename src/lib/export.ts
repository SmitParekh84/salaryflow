import type { Expense } from "./types";

export function exportExpensesCsv(expenses: Expense[]): string {
  const header = [
    "Date",
    "Amount",
    "Category",
    "Merchant",
    "Payment Method",
    "Note",
    "Recurring",
  ];
  const rows = expenses.map((e) => [
    new Date(e.date).toISOString().slice(0, 10),
    String(e.amount),
    e.category,
    e.merchant ?? "",
    e.paymentMethod,
    (e.note ?? "").replace(/"/g, '""'),
    e.recurring ? "yes" : "no",
  ]);
  return [header, ...rows]
    .map((r) => r.map((c) => `"${c}"`).join(","))
    .join("\n");
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

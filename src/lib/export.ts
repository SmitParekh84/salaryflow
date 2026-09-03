import type { Expense } from "./types";
import { localDateInputValue, parseFinancialDate } from "./utils";

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
    /*
     * The local calendar day, not the UTC one.
     *
     * `toISOString().slice(0, 10)` reports the day in UTC, which is a different
     * day from the one on screen whenever the stored time falls on the far side
     * of midnight UTC — before 05:30 for IST, and in the evening for anywhere
     * west of UTC. Rows the forms wrote are safe either way, because those are
     * anchored at local noon; it is imported rows and anything stamped with a
     * real `new Date()` that could export a day off from what the app displays,
     * moving a row into the wrong month at a boundary. Reading the date the way
     * the rest of the app reads it makes the column timezone-independent.
     */
    localDateInputValue(parseFinancialDate(e.date)),
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

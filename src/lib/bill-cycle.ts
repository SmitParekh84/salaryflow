import type { Bill, Expense } from "./types";
import { parseFinancialDate } from "./utils";

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sourceDate(bill: Bill, now: Date): Date {
  return bill.dueDate ? parseFinancialDate(bill.dueDate) : new Date(now.getFullYear(), 0, bill.dueDay);
}

export function billOccurrenceDate(bill: Bill, now = new Date()): Date {
  const source = sourceDate(bill, now);
  if (bill.frequency === "yearly") {
    const day = Math.min(source.getDate(), new Date(now.getFullYear(), source.getMonth() + 1, 0).getDate());
    return new Date(now.getFullYear(), source.getMonth(), day);
  }

  if (bill.frequency === "weekly") {
    const occurrence = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    occurrence.setDate(occurrence.getDate() + ((source.getDay() - occurrence.getDay() + 7) % 7));
    return occurrence;
  }

  const day = Math.min(source.getDate(), new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
  return new Date(now.getFullYear(), now.getMonth(), day);
}

export function billCycle(bill: Bill, expenses: Expense[], now = new Date()) {
  const occurrenceDate = billOccurrenceDate(bill, now);
  const billedMonth =
    bill.category === "Utilities"
      ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
  const billingMonth = monthKey(billedMonth);
  const linkedExpenses = expenses.filter(
    (expense) => expense.billId === bill.id && expense.billingMonth === billingMonth,
  );
  const hasLinkedHistory = expenses.some((expense) => expense.billId === bill.id);
  const paidAmount = linkedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const isPaid = paidAmount > 0 || (!hasLinkedHistory && bill.paid);
  const amount = bill.category === "Utilities" && paidAmount > 0 ? paidAmount : bill.amount;

  return {
    amount,
    billingMonth,
    billedMonth,
    occurrenceDate,
    paidAmount: isPaid ? paidAmount || amount : 0,
    isPaid,
    overdue: !isPaid && occurrenceDate < new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  };
}
import type { Bill, Expense } from "./types";
import { parseFinancialDate } from "./utils";

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sourceDate(bill: Bill, now: Date): Date {
  return bill.dueDate
    ? parseFinancialDate(bill.dueDate)
    : new Date(now.getFullYear(), now.getMonth(), bill.dueDay, 12);
}

export function billOccurrenceDate(bill: Bill, now = new Date()): Date {
  const source = sourceDate(bill, now);
  if (bill.frequency === "interval") {
    const intervalDays = Math.max(1, bill.intervalDays ?? 90);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    if (source >= today) return source;
    const elapsedDays = Math.floor((today.getTime() - source.getTime()) / 86_400_000);
    const elapsedIntervals = Math.floor(elapsedDays / intervalDays);
    const occurrence = new Date(source);
    occurrence.setDate(source.getDate() + elapsedIntervals * intervalDays);
    return occurrence;
  }
  if (bill.frequency === "yearly") {
    const day = Math.min(
      source.getDate(),
      new Date(now.getFullYear(), source.getMonth() + 1, 0).getDate(),
    );
    return new Date(now.getFullYear(), source.getMonth(), day);
  }

  if (bill.frequency === "weekly") {
    const occurrence = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    occurrence.setDate(occurrence.getDate() + ((source.getDay() - occurrence.getDay() + 7) % 7));
    return occurrence;
  }

  const day = Math.min(
    source.getDate(),
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
  );
  return new Date(now.getFullYear(), now.getMonth(), day);
}

export function billCycle(bill: Bill, expenses: Expense[], now = new Date()) {
  let occurrenceDate = billOccurrenceDate(bill, now);
  let billedMonth =
    bill.category === "Utilities"
      ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
      : bill.frequency === "interval"
        ? new Date(occurrenceDate.getFullYear(), occurrenceDate.getMonth(), 1)
        : new Date(now.getFullYear(), now.getMonth(), 1);
  let billingMonth = monthKey(billedMonth);
  let linkedExpenses = expenses.filter(
    (expense) => expense.billId === bill.id && expense.billingMonth === billingMonth,
  );
  const hasLinkedHistory = expenses.some((expense) => expense.billId === bill.id);
  let paidAmount = linkedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const amount = bill.category === "Utilities" && paidAmount > 0 ? paidAmount : bill.amount;
  let isPaid = paidAmount >= amount || (!hasLinkedHistory && bill.paid);
  if (bill.frequency === "interval" && isPaid) {
    occurrenceDate = new Date(occurrenceDate);
    occurrenceDate.setDate(occurrenceDate.getDate() + Math.max(1, bill.intervalDays ?? 90));
    billedMonth = new Date(occurrenceDate.getFullYear(), occurrenceDate.getMonth(), 1);
    billingMonth = monthKey(billedMonth);
    linkedExpenses = expenses.filter(
      (expense) => expense.billId === bill.id && expense.billingMonth === billingMonth,
    );
    paidAmount = linkedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    isPaid = paidAmount >= bill.amount;
  }
  const remainingAmount = isPaid ? 0 : Math.max(0, amount - paidAmount);
  const isDueThisMonth =
    occurrenceDate.getFullYear() === now.getFullYear() &&
    occurrenceDate.getMonth() === now.getMonth();

  return {
    amount,
    billingMonth,
    billedMonth,
    occurrenceDate,
    paidAmount: paidAmount || (!hasLinkedHistory && bill.paid ? amount : 0),
    recordedAmount: paidAmount,
    remainingAmount,
    isPaid,
    isDueThisMonth,
    overdue: !isPaid && occurrenceDate < new Date(now.getFullYear(), now.getMonth(), now.getDate()),
  };
}

export function monthlyBillReserve(bill: Bill): number {
  if (bill.frequency !== "interval") return bill.amount;
  const salaryCycles = Math.max(1, Math.round((bill.intervalDays ?? 90) / 30));
  return bill.amount / salaryCycles;
}

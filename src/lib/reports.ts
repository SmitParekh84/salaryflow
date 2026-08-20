import { countsAsEarnedIncome, cycleInfo } from "./calculations";
import { currentFinancialYearStart } from "./financial-year";
import type { BankAccount, Expense, Income, SalaryHistoryEntry, SalaryProfile } from "./types";
import { parseFinancialDate } from "./utils";

export type ReportRangeKey = "cycle" | "month" | "quarter" | "fy";
export type BucketKey = "incoming" | "investments" | "spends" | "unlinked";

export const BUCKET_KEYS: BucketKey[] = ["incoming", "investments", "spends", "unlinked"];

export const BUCKET_LABELS: Record<BucketKey, string> = {
  incoming: "Incoming",
  investments: "Investments",
  spends: "Spends",
  unlinked: "Unlinked",
};

export interface ReportRange {
  start: Date;
  end: Date;
  label: string;
  key: ReportRangeKey;
}

export interface ReportInput {
  profile: SalaryProfile;
  expenses: Expense[];
  incomes: Income[];
  salaryHistory: SalaryHistoryEntry[];
  accounts: BankAccount[];
  /** Undefined means every account. */
  accountId?: string;
}

export interface CashFlow {
  range: ReportRange;
  buckets: { key: BucketKey; label: string; amount: number; perMonth: number }[];
  bankBalance: number;
}

const DAY_MS = 86_400_000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function rangeLabel(start: Date, end: Date): string {
  const format = (date: Date) =>
    date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  return `${format(start)} – ${format(end)}`;
}

/**
 * The window a report covers.
 *
 * Every range ends today rather than at the end of its calendar period. A
 * report describes what has happened, and a month range running to the 31st
 * would divide this month's spending by a period that has not occurred.
 */
export function reportRange(
  profile: SalaryProfile,
  key: ReportRangeKey,
  now = new Date(),
): ReportRange {
  const end = endOfDay(now);
  let start: Date;

  switch (key) {
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case "fy":
      start = new Date(profile.financialYearStart ?? currentFinancialYearStart(now), 3, 1);
      break;
    default:
      start = startOfDay(cycleInfo(profile, now).cycleStart);
  }

  return { start, end, label: rangeLabel(start, end), key };
}

function inRange(date: string, range: ReportRange): boolean {
  const time = parseFinancialDate(date).getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

function isInvestment(expense: Expense): boolean {
  return expense.category === "Investment";
}

/** Expenses inside the range that the active account filter admits. */
export function scopedExpenses(input: ReportInput, range: ReportRange): Expense[] {
  return input.expenses.filter(
    (expense) =>
      inRange(expense.date, range) &&
      (input.accountId === undefined || expense.accountId === input.accountId),
  );
}

export function bucketOf(expense: Expense): Exclude<BucketKey, "incoming"> {
  if (isInvestment(expense)) return "investments";
  // An expense either names an account or it does not, so these two can never
  // both claim the same amount.
  return expense.accountId ? "spends" : "unlinked";
}

function sum(values: { amount: number }[]): number {
  return values.reduce((running, value) => running + value.amount, 0);
}

function incomingRecords(input: ReportInput, range: ReportRange) {
  const salary = input.salaryHistory.filter(
    (entry) => entry.confirmed && inRange(entry.date, range),
  );
  const earned = input.incomes.filter(
    (item) =>
      countsAsEarnedIncome(item) &&
      inRange(item.date, range) &&
      (input.accountId === undefined || item.accountId === input.accountId),
  );
  return { salary, earned };
}

export function cashFlow(input: ReportInput, range: ReportRange): CashFlow {
  const expenses = scopedExpenses(input, range);
  const { salary, earned } = incomingRecords(input, range);

  const totals: Record<BucketKey, number> = {
    incoming: sum(salary) + sum(earned),
    investments: 0,
    spends: 0,
    unlinked: 0,
  };
  for (const expense of expenses) totals[bucketOf(expense)] += expense.amount;

  // At least one month, so a short range does not multiply its own total.
  const months = Math.max(1, (range.end.getTime() - range.start.getTime()) / DAY_MS / 30.44);

  return {
    range,
    buckets: BUCKET_KEYS.map((key) => ({
      key,
      label: BUCKET_LABELS[key],
      amount: totals[key],
      perMonth: totals[key] / months,
    })),
    bankBalance: input.accounts
      .filter((account) => account.status === "active")
      .reduce((running, account) => running + account.balance, 0),
  };
}

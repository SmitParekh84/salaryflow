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

export interface BreakdownRow {
  /** Stable id, and the level 3 route segment. */
  key: string;
  label: string;
  amount: number;
  percent: number;
}

/**
 * One row of the level 3 list, already flattened.
 *
 * A union of `Expense[] | Income[]` would push a discriminated check into the
 * component for every field it renders, and level 3 draws all four buckets
 * identically.
 */
export interface ReportTransaction {
  id: string;
  label: string;
  sublabel: string;
  amount: number;
  date: string;
}

export interface CategoryDetail {
  label: string;
  total: number;
  monthly: { label: string; amount: number; current: boolean }[];
  average: number;
  transactions: ReportTransaction[];
}

const SALARY_KEY = "salary";

function expenseGroupKey(expense: Expense, bucket: BucketKey): string {
  if (bucket === "investments") return expense.merchant?.trim() || "Investment";
  return expense.category;
}

/** Every transaction that belongs to a bucket, already flattened and grouped. */
function bucketRows(
  input: ReportInput,
  range: ReportRange,
  bucket: BucketKey,
): { key: string; transaction: ReportTransaction }[] {
  if (bucket === "incoming") {
    const { salary, earned } = incomingRecords(input, range);
    return [
      ...salary.map((entry, index) => ({
        key: SALARY_KEY,
        transaction: {
          id: entry._id ?? `salary-${index}`,
          label: entry.source || "Salary",
          sublabel: "Salary",
          amount: entry.amount,
          date: entry.date,
        },
      })),
      ...earned.map((item) => ({
        key: item.type,
        transaction: {
          id: item.id,
          label: item.source || item.type,
          sublabel: item.type,
          amount: item.amount,
          date: item.date,
        },
      })),
    ];
  }

  return scopedExpenses(input, range)
    .filter((expense) => bucketOf(expense) === bucket)
    .map((expense) => ({
      key: expenseGroupKey(expense, bucket),
      transaction: {
        id: expense.id,
        label: expense.merchant?.trim() || expense.category,
        sublabel: expense.category,
        amount: expense.amount,
        date: expense.date,
      },
    }));
}

/**
 * A bucket split into its parts, largest first.
 *
 * Percentages are exact here and rounded only for display. Nudging the largest
 * row so the printed figures total 100 would show a percentage that disagrees
 * with its own amount.
 */
export function bucketBreakdown(
  input: ReportInput,
  range: ReportRange,
  bucket: BucketKey,
): BreakdownRow[] {
  const rows = bucketRows(input, range, bucket);
  const total = rows.reduce((running, row) => running + row.transaction.amount, 0);
  if (total <= 0) return [];

  const grouped = new Map<string, number>();
  for (const row of rows) {
    grouped.set(row.key, (grouped.get(row.key) ?? 0) + row.transaction.amount);
  }

  return Array.from(grouped.entries())
    .map(([key, amount]) => ({
      key,
      label: key === SALARY_KEY ? "Salary" : key,
      amount,
      percent: (amount / total) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}

const MONTHS_SHOWN = 6;

function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

/**
 * One line of a breakdown, with six months of history behind it.
 *
 * The chart always covers six calendar months regardless of the active range:
 * its job is to place the current period against recent history, which a chart
 * clipped to the range could not do.
 */
export function categoryDetail(
  input: ReportInput,
  range: ReportRange,
  bucket: BucketKey,
  key: string,
  now = new Date(),
): CategoryDetail | null {
  const inRangeRows = bucketRows(input, range, bucket).filter((row) => row.key === key);

  // Six months of history needs a window wider than the active range.
  const historyStart = new Date(now.getFullYear(), now.getMonth() - (MONTHS_SHOWN - 1), 1);
  const historyRange: ReportRange = {
    start: historyStart,
    end: endOfDay(now),
    label: "",
    key: range.key,
  };
  const historyRows = bucketRows(input, historyRange, bucket).filter((row) => row.key === key);

  if (inRangeRows.length === 0 && historyRows.length === 0) return null;

  const byMonth = new Map<string, number>();
  for (const row of historyRows) {
    const monthKey = monthKeyOf(parseFinancialDate(row.transaction.date));
    byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + row.transaction.amount);
  }

  const monthly = Array.from({ length: MONTHS_SHOWN }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (MONTHS_SHOWN - 1 - index), 1);
    return {
      label: month.toLocaleDateString("en-US", { month: "short" }),
      amount: byMonth.get(monthKeyOf(month)) ?? 0,
      current: index === MONTHS_SHOWN - 1,
    };
  });

  return {
    label: key === SALARY_KEY ? "Salary" : key,
    total: inRangeRows.reduce((running, row) => running + row.transaction.amount, 0),
    monthly,
    // Divided by every month shown, including the empty ones — an average that
    // skipped them would describe only the months you happened to spend in.
    average: monthly.reduce((running, month) => running + month.amount, 0) / MONTHS_SHOWN,
    transactions: inRangeRows
      .map((row) => row.transaction)
      .sort((a, b) => parseFinancialDate(b.date).getTime() - parseFinancialDate(a.date).getTime()),
  };
}

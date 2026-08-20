# Reports Drill-Down Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Analytics page with a three-level drill-down — cash flow, then a bucket broken down by category, then one category's transactions.

**Architecture:** Every figure comes from one pure module, `src/lib/reports.ts`, with no React, no store and no fetch. Levels are real routes under `/analytics` so the phone back gesture works and any level is linkable; filters ride in the query string.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Zustand, Recharts, Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-reports-drilldown-design.md`

## Global Constraints

- **All arithmetic lives in `src/lib/reports.ts`.** No figure is computed inside a component. The repo has no DOM test environment, so anything computed in a component cannot be tested at all.
- **`spends` and `unlinked` partition non-investment expenses**: an expense has an `accountId` or it does not. No amount may appear in both — invariant 1, money is counted once.
- **`investments` is `Investment`-category expenses only.** `Investment` records are undated holdings. This matches `investedThisCycle` in `src/lib/calculations.ts`.
- **Credit-card expenses count as `spends`** and never alter the bank-balance figure — invariant 6.
- **Every range ends today, never in the future.** A report covers what has happened.
- Dates are local calendar dates via `parseFinancialDate` / `localDateInputValue` from `src/lib/utils.ts`.
- Money renders through `formatMoney(amount, currency)`.
- Percentages are rounded for display only and are **not** forced to total 100.
- Bucket keys are exactly `"incoming" | "investments" | "spends" | "unlinked"`.
- Range keys are exactly `"cycle" | "month" | "quarter" | "fy"`.
- Run `pnpm test`, `pnpm typecheck`, `pnpm lint` before every commit.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/reports.ts` (create) | Ranges, buckets, breakdowns, category detail. Pure |
| `src/lib/reports.test.ts` (create) | Enforces the spec |
| `src/features/reports/use-report-input.ts` (create) | Store → `ReportInput`, and query-string filter state |
| `src/features/reports/report-filters.tsx` (create) | Range + account pickers, shared by all levels |
| `src/features/reports/cash-flow-view.tsx` (create) | L1 |
| `src/features/reports/bucket-view.tsx` (create) | L2 |
| `src/features/reports/category-view.tsx` (create) | L3 |
| `src/features/analytics/charts.tsx` (modify) | `CashFlowBars`, `CategoryMonthlyBars`; remove `MonthlyBars`, `IncomeExpenseBars` |
| `src/features/analytics/lazy-charts.tsx` (modify) | Matching lazy exports |
| `src/app/(app)/analytics/page.tsx` (modify) | Renders L1 |
| `src/app/(app)/analytics/[bucket]/page.tsx` (create) | L2 route |
| `src/app/(app)/analytics/[bucket]/[category]/page.tsx` (create) | L3 route |
| `src/features/analytics/analytics-view.tsx` (delete) | Replaced by L1 |

---

### Task 1: Ranges and buckets

**Files:**
- Create: `src/lib/reports.ts`
- Test: `src/lib/reports.test.ts`

**Interfaces:**
- Consumes: `cycleInfo` from `src/lib/calculations.ts`, `countsAsEarnedIncome` from the same, `currentFinancialYearStart` from `src/lib/financial-year.ts`, `parseFinancialDate` from `src/lib/utils.ts`.
- Produces: `ReportRangeKey`, `BucketKey`, `ReportRange`, `ReportInput`, `CashFlow`, `BUCKET_LABELS`, `reportRange()`, `cashFlow()`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/reports.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cashFlow, reportRange } from "./reports";
import type { ReportInput } from "./reports";
import type { Expense, Income, SalaryProfile } from "./types";

const profile: SalaryProfile = {
  amount: 50_000,
  salaryDay: 6,
  cycle: "monthly",
  currency: "INR",
  country: "India",
  savingsGoal: 0,
  emergencyFundGoal: 0,
  investmentAmount: 0,
};

/** Local Y/M/D so the suite gives the same answer in every timezone. */
function iso(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 12, 0).toISOString();
}

function expense(over: Partial<Expense> & { id: string; amount: number }): Expense {
  return {
    category: "Food",
    paymentMethod: "UPI",
    date: iso(2026, 8, 10),
    ...over,
  } as Expense;
}

function income(over: Partial<Income> & { id: string; amount: number }): Income {
  return { type: "Side Income", source: "Freelance", date: iso(2026, 8, 10), ...over } as Income;
}

const NOW = new Date(2026, 7, 20, 12, 0);

function input(over: Partial<ReportInput> = {}): ReportInput {
  return {
    profile,
    expenses: [],
    incomes: [],
    salaryHistory: [],
    accounts: [],
    ...over,
  };
}

describe("reportRange", () => {
  it("defaults the cycle to the salary cycle and ends today", () => {
    const range = reportRange(profile, "cycle", NOW);

    expect(range.start.getDate()).toBe(6);
    expect(range.start.getMonth()).toBe(7);
    expect(range.end.getDate()).toBe(20);
  });

  it("never ends in the future for any range", () => {
    for (const key of ["cycle", "month", "quarter", "fy"] as const) {
      expect(reportRange(profile, key, NOW).end.getTime()).toBeLessThanOrEqual(
        new Date(2026, 7, 20, 23, 59, 59, 999).getTime(),
      );
    }
  });

  it("starts the month range on the first", () => {
    const range = reportRange(profile, "month", NOW);
    expect(range.start.getDate()).toBe(1);
    expect(range.start.getMonth()).toBe(7);
  });

  it("reaches back three months for the quarter range", () => {
    const range = reportRange(profile, "quarter", NOW);
    expect(range.start.getMonth()).toBe(4); // May
    expect(range.start.getDate()).toBe(1);
  });
});

describe("cashFlow", () => {
  const range = reportRange(profile, "cycle", NOW);

  it("splits spends from unlinked and never counts one twice", () => {
    const data = input({
      expenses: [
        expense({ id: "a", amount: 500, accountId: "icici" }),
        expense({ id: "b", amount: 300 }), // no account
      ],
      accounts: [
        { id: "icici", bankName: "ICICI", accountType: "Savings", balance: 1_000, status: "active" },
      ],
    });
    const flow = cashFlow(data, range);
    const amount = (key: string) => flow.buckets.find((b) => b.key === key)!.amount;

    expect(amount("spends")).toBe(500);
    expect(amount("unlinked")).toBe(300);
  });

  it("puts an Investment expense in investments and nowhere else", () => {
    const data = input({
      expenses: [expense({ id: "sip", amount: 2_000, category: "Investment", accountId: "icici" })],
    });
    const flow = cashFlow(data, range);
    const amount = (key: string) => flow.buckets.find((b) => b.key === key)!.amount;

    expect(amount("investments")).toBe(2_000);
    expect(amount("spends")).toBe(0);
    expect(amount("unlinked")).toBe(0);
  });

  it("counts confirmed salary and earned income as incoming", () => {
    const data = input({
      incomes: [income({ id: "free", amount: 3_000 })],
      salaryHistory: [{ amount: 50_000, date: iso(2026, 8, 6), confirmed: true }],
    });
    const flow = cashFlow(data, range);

    expect(flow.buckets.find((b) => b.key === "incoming")!.amount).toBe(53_000);
  });

  it("leaves out unconfirmed salary and income that is not earnings", () => {
    const data = input({
      incomes: [income({ id: "cb", amount: 200, type: "Cashback" })],
      salaryHistory: [{ amount: 50_000, date: iso(2026, 8, 6), confirmed: false }],
    });

    expect(cashFlow(data, range).buckets.find((b) => b.key === "incoming")!.amount).toBe(0);
  });

  it("excludes records outside the range at both ends", () => {
    const data = input({
      expenses: [
        expense({ id: "before", amount: 100, accountId: "icici", date: iso(2026, 8, 5) }),
        expense({ id: "inside", amount: 200, accountId: "icici", date: iso(2026, 8, 6) }),
        expense({ id: "after", amount: 400, accountId: "icici", date: iso(2026, 8, 25) }),
      ],
    });

    expect(cashFlow(data, range).buckets.find((b) => b.key === "spends")!.amount).toBe(200);
  });

  it("sums only the selected account, leaving unlinked empty", () => {
    const data = input({
      accountId: "icici",
      expenses: [
        expense({ id: "a", amount: 500, accountId: "icici" }),
        expense({ id: "b", amount: 700, accountId: "hdfc" }),
        expense({ id: "c", amount: 300 }),
      ],
    });
    const flow = cashFlow(data, range);
    const amount = (key: string) => flow.buckets.find((b) => b.key === key)!.amount;

    expect(amount("spends")).toBe(500);
    // An expense with no account cannot belong to a specific one.
    expect(amount("unlinked")).toBe(0);
  });

  it("reports the total balance of active accounts", () => {
    const data = input({
      accounts: [
        { id: "icici", bankName: "ICICI", accountType: "Savings", balance: 1_000, status: "active" },
        { id: "old", bankName: "Old", accountType: "Savings", balance: 900, status: "closed" },
      ],
    });

    expect(cashFlow(data, range).bankBalance).toBe(1_000);
  });

  it("always returns all four buckets, at zero when empty", () => {
    const flow = cashFlow(input(), range);
    expect(flow.buckets.map((b) => b.key)).toEqual([
      "incoming",
      "investments",
      "spends",
      "unlinked",
    ]);
    expect(flow.buckets.every((b) => b.amount === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/reports.test.ts`
Expected: FAIL — `Failed to resolve import "./reports"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/reports.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/reports.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports.ts src/lib/reports.test.ts
git commit -m "feat(reports): split a range of records into four cash-flow buckets"
```

---

### Task 2: Breakdown and category detail

**Files:**
- Modify: `src/lib/reports.ts`
- Modify: `src/lib/reports.test.ts`

**Interfaces:**
- Consumes: `ReportInput`, `ReportRange`, `BucketKey`, `scopedExpenses`, `bucketOf` from Task 1.
- Produces: `BreakdownRow`, `ReportTransaction`, `CategoryDetail`, `bucketBreakdown()`, `categoryDetail()`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/reports.test.ts`, extending the import to
`import { bucketBreakdown, cashFlow, categoryDetail, reportRange } from "./reports";`:

```ts
describe("bucketBreakdown", () => {
  const range = reportRange(profile, "cycle", NOW);

  it("groups spends by category, largest first, with percentages", () => {
    const data = input({
      expenses: [
        expense({ id: "a", amount: 300, category: "Food", accountId: "icici" }),
        expense({ id: "b", amount: 700, category: "Fuel", accountId: "icici" }),
      ],
    });
    const rows = bucketBreakdown(data, range, "spends");

    expect(rows.map((row) => row.key)).toEqual(["Fuel", "Food"]);
    expect(rows[0].percent).toBeCloseTo(70, 5);
    expect(rows[1].percent).toBeCloseTo(30, 5);
  });

  it("sums its rows back to the bucket amount", () => {
    const data = input({
      expenses: [
        expense({ id: "a", amount: 300, category: "Food", accountId: "icici" }),
        expense({ id: "b", amount: 155, category: "Fuel", accountId: "icici" }),
        expense({ id: "c", amount: 42, category: "Food", accountId: "icici" }),
      ],
    });
    const rows = bucketBreakdown(data, range, "spends");
    const bucket = cashFlow(data, range).buckets.find((b) => b.key === "spends")!;

    expect(rows.reduce((total, row) => total + row.amount, 0)).toBe(bucket.amount);
  });

  it("returns no rows for an empty bucket rather than dividing by zero", () => {
    expect(bucketBreakdown(input(), range, "spends")).toEqual([]);
  });

  it("groups incoming by type and gives confirmed salary its own row", () => {
    const data = input({
      incomes: [income({ id: "free", amount: 3_000, type: "Freelance" })],
      salaryHistory: [{ amount: 50_000, date: iso(2026, 8, 6), confirmed: true }],
    });
    const rows = bucketBreakdown(data, range, "incoming");

    expect(rows.find((row) => row.key === "salary")?.amount).toBe(50_000);
    expect(rows.find((row) => row.key === "Freelance")?.amount).toBe(3_000);
  });

  it("groups investments by merchant, falling back when there is none", () => {
    const data = input({
      expenses: [
        expense({ id: "a", amount: 2_000, category: "Investment", merchant: "Groww" }),
        expense({ id: "b", amount: 500, category: "Investment" }),
      ],
    });
    const rows = bucketBreakdown(data, range, "investments");

    expect(rows.find((row) => row.key === "Groww")?.amount).toBe(2_000);
    expect(rows.find((row) => row.key === "Investment")?.amount).toBe(500);
  });
});

describe("categoryDetail", () => {
  const range = reportRange(profile, "cycle", NOW);

  it("returns six months with the current one flagged", () => {
    const data = input({
      expenses: [expense({ id: "a", amount: 300, category: "Food", accountId: "icici" })],
    });
    const detail = categoryDetail(data, range, "spends", "Food", NOW)!;

    expect(detail.monthly).toHaveLength(6);
    expect(detail.monthly[5].current).toBe(true);
    expect(detail.monthly.filter((month) => month.current)).toHaveLength(1);
  });

  it("keeps empty months as zero bars so the axis stays even", () => {
    const data = input({
      expenses: [expense({ id: "a", amount: 300, category: "Food", accountId: "icici" })],
    });
    const detail = categoryDetail(data, range, "spends", "Food", NOW)!;

    expect(detail.monthly.filter((month) => month.amount === 0)).toHaveLength(5);
  });

  it("averages across every month shown, not only the active ones", () => {
    const data = input({
      expenses: [
        expense({ id: "a", amount: 600, category: "Food", accountId: "icici" }),
        expense({
          id: "b",
          amount: 600,
          category: "Food",
          accountId: "icici",
          date: iso(2026, 7, 10),
        }),
      ],
    });
    const detail = categoryDetail(data, range, "spends", "Food", NOW)!;

    expect(detail.average).toBeCloseTo(1_200 / 6, 5);
  });

  it("totals and lists only what is inside the range", () => {
    const data = input({
      expenses: [
        expense({ id: "in", amount: 300, category: "Food", accountId: "icici" }),
        expense({
          id: "out",
          amount: 900,
          category: "Food",
          accountId: "icici",
          date: iso(2026, 7, 10),
        }),
      ],
    });
    const detail = categoryDetail(data, range, "spends", "Food", NOW)!;

    expect(detail.total).toBe(300);
    expect(detail.transactions.map((row) => row.id)).toEqual(["in"]);
  });

  it("flattens an incoming row into the same transaction shape", () => {
    const data = input({ incomes: [income({ id: "free", amount: 3_000, type: "Freelance" })] });
    const detail = categoryDetail(data, range, "incoming", "Freelance", NOW)!;

    expect(detail.transactions[0]).toMatchObject({ id: "free", amount: 3_000 });
  });

  it("returns null for a key that is not in the bucket", () => {
    expect(categoryDetail(input(), range, "spends", "Nonsense", NOW)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/reports.test.ts`
Expected: FAIL — `bucketBreakdown is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/reports.ts`:

```ts
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
      .sort(
        (a, b) => parseFinancialDate(b.date).getTime() - parseFinancialDate(a.date).getTime(),
      ),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/reports.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`

```bash
git add src/lib/reports.ts src/lib/reports.test.ts
git commit -m "feat(reports): break a bucket into categories and one category into months"
```

---

### Task 3: Charts

**Files:**
- Modify: `src/features/analytics/charts.tsx`
- Modify: `src/features/analytics/lazy-charts.tsx`

**Interfaces:**
- Consumes: `CashFlow`, `CategoryDetail` from Tasks 1–2.
- Produces: `CashFlowBars`, `CategoryMonthlyBars`, plus lazy re-exports of both. Removes `MonthlyBars` and `IncomeExpenseBars`.

- [ ] **Step 1: Add the two charts**

Append to `src/features/analytics/charts.tsx`, adding `Cell` and `ReferenceLine` to the existing `recharts` import if absent, and `import type { CashFlow, CategoryDetail } from "@/lib/reports";`:

```tsx
const BUCKET_FILL: Record<string, string> = {
  incoming: "var(--primary)",
  investments: CHART_COLORS.goal,
  spends: CHART_COLORS.expense,
  unlinked: "var(--warning)",
};

export function CashFlowBars({ flow, currency }: { flow: CashFlow; currency: string }) {
  const data = useMemo(
    () => flow.buckets.map((bucket) => ({ ...bucket, value: Math.round(bucket.amount) })),
    [flow],
  );

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "color-mix(in srgb, var(--muted) 10%, transparent)" }}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(value) => formatMoney(Number(value), currency)}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((bucket) => (
            <Cell key={bucket.key} fill={BUCKET_FILL[bucket.key] ?? "var(--primary)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Six months of one category, with the current one picked out.
 *
 * The average line is drawn across every month shown, so a category with gaps
 * is compared against the whole window rather than only the months it appeared
 * in.
 */
export function CategoryMonthlyBars({
  detail,
  currency,
}: {
  detail: CategoryDetail;
  currency: string;
}) {
  const data = useMemo(
    () => detail.monthly.map((month) => ({ ...month, value: Math.round(month.amount) })),
    [detail],
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "color-mix(in srgb, var(--muted) 10%, transparent)" }}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(value) => formatMoney(Number(value), currency)}
        />
        <ReferenceLine
          y={Math.round(detail.average)}
          stroke="var(--success)"
          strokeDasharray="4 4"
          label={{
            value: `AVG ${formatMoney(detail.average, currency)}`,
            position: "insideTopLeft",
            fontSize: 10,
            fill: "var(--success)",
          }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((month) => (
            <Cell
              key={month.label}
              fill={month.current ? "var(--primary)" : "color-mix(in srgb, var(--muted) 25%, transparent)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 2: Remove the two charts nothing will use**

Delete `MonthlyBars` and `IncomeExpenseBars` from `src/features/analytics/charts.tsx` and their entries in `src/features/analytics/lazy-charts.tsx`. Both are imported only by `analytics-view.tsx`, which Task 6 deletes. `CashFlowChart`, `SpendTrendChart`, `CategoryDonut` and `MileageTrendChart` all stay — the dashboard and the fuel report use them.

- [ ] **Step 3: Add the lazy exports**

In `src/features/analytics/lazy-charts.tsx`:

```tsx
export const CashFlowBars = dynamic(() => import("./charts").then((m) => m.CashFlowBars), {
  ssr: false,
  loading: () => <ChartFallback height={240} />,
});

export const CategoryMonthlyBars = dynamic(
  () => import("./charts").then((m) => m.CategoryMonthlyBars),
  { ssr: false, loading: () => <ChartFallback height={220} /> },
);
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: errors only in `analytics-view.tsx`, which Task 6 replaces. Leave them until then.

- [ ] **Step 5: Commit**

```bash
git add src/features/analytics/charts.tsx src/features/analytics/lazy-charts.tsx
git commit -m "feat(reports): add the cash-flow and category-history charts"
```

---

### Task 4: Filter state and store adapter

**Files:**
- Create: `src/features/reports/use-report-input.ts`
- Create: `src/features/reports/report-filters.tsx`

**Interfaces:**
- Consumes: `ReportInput`, `ReportRangeKey`, `reportRange` from Task 1; `useFinanceStore`.
- Produces: `useReportInput()` returning `{ input, range, setRange, setAccount, currency }`, and `<ReportFilters />`.

- [ ] **Step 1: Build the adapter**

Create `src/features/reports/use-report-input.ts`:

```ts
"use client";

import { type ReportInput, type ReportRangeKey, reportRange } from "@/lib/reports";
import { useFinanceStore } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

const RANGE_KEYS: ReportRangeKey[] = ["cycle", "month", "quarter", "fy"];

export const RANGE_LABELS: Record<ReportRangeKey, string> = {
  cycle: "This cycle",
  month: "This month",
  quarter: "Last 3 months",
  fy: "Financial year",
};

/**
 * Filters live in the query string, not in component state.
 *
 * Every level reads them the same way, they survive a refresh, and a link to a
 * filtered report opens filtered. Holding them in state would reset the filter
 * on every drill-down.
 */
export function useReportInput() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useFinanceStore((state) => state.profile);
  const expenses = useFinanceStore((state) => state.expenses);
  const incomes = useFinanceStore((state) => state.incomes);
  const salaryHistory = useFinanceStore((state) => state.salaryHistory);
  const accounts = useFinanceStore((state) => state.accounts);

  const rangeKey = (params.get("range") ?? "cycle") as ReportRangeKey;
  const safeRangeKey = RANGE_KEYS.includes(rangeKey) ? rangeKey : "cycle";

  const requestedAccount = params.get("account") ?? "all";
  // A filter naming an account that has since been deleted would silently show
  // an empty report, so it falls back to showing everything.
  const accountId =
    requestedAccount !== "all" && accounts.some((account) => account.id === requestedAccount)
      ? requestedAccount
      : undefined;

  const input: ReportInput = useMemo(
    () => ({ profile, expenses, incomes, salaryHistory, accounts, accountId }),
    [profile, expenses, incomes, salaryHistory, accounts, accountId],
  );

  const range = useMemo(() => reportRange(profile, safeRangeKey), [profile, safeRangeKey]);

  const setParam = useCallback(
    (name: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value === "" || value === "all") next.delete(name);
      else next.set(name, value);
      const query = next.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [params, router],
  );

  return {
    input,
    range,
    accountId,
    currency: profile.currency,
    setRange: (key: ReportRangeKey) => setParam("range", key),
    setAccount: (id: string) => setParam("account", id),
  };
}

/** Carries the active filters onto a drill-down link. */
export function withFilters(href: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${href}?${query}` : href;
}
```

- [ ] **Step 2: Build the filter bar**

Create `src/features/reports/report-filters.tsx`:

```tsx
"use client";

import { Select } from "@/components/ui/input";
import { RANGE_LABELS, useReportInput } from "@/features/reports/use-report-input";
import type { ReportRangeKey } from "@/lib/reports";
import { useFinanceStore } from "@/lib/store";

export function ReportFilters() {
  const accounts = useFinanceStore((state) => state.accounts);
  const { range, accountId, setRange, setAccount } = useReportInput();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Accounts"
        className="w-auto"
        value={accountId ?? "all"}
        onChange={(event) => setAccount(event.target.value)}
      >
        <option value="all">All accounts</option>
        {accounts
          .filter((account) => account.status === "active")
          .map((account) => (
            <option key={account.id} value={account.id}>
              {account.bankName}
            </option>
          ))}
      </Select>
      <Select
        aria-label="Date range"
        className="w-auto"
        value={range.key}
        onChange={(event) => setRange(event.target.value as ReportRangeKey)}
      >
        {(Object.keys(RANGE_LABELS) as ReportRangeKey[]).map((key) => (
          <option key={key} value={key}>
            {RANGE_LABELS[key]}
          </option>
        ))}
      </Select>
      <span className="text-xs text-muted">{range.label}</span>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `pnpm lint`
Expected: no errors from the two new files.

- [ ] **Step 4: Commit**

```bash
git add src/features/reports/use-report-input.ts src/features/reports/report-filters.tsx
git commit -m "feat(reports): keep the range and account filters in the URL"
```

---

### Task 5: Level 1 — cash flow

**Files:**
- Create: `src/features/reports/cash-flow-view.tsx`
- Modify: `src/app/(app)/analytics/page.tsx`
- Delete: `src/features/analytics/analytics-view.tsx`

**Interfaces:**
- Consumes: `cashFlow`, `BUCKET_LABELS` (Tasks 1–2), `CashFlowBars` (Task 3), `useReportInput`, `ReportFilters` (Task 4), `FuelReport`.
- Produces: `CashFlowView`.

- [ ] **Step 1: Build the view**

Create `src/features/reports/cash-flow-view.tsx`:

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CashFlowBars } from "@/features/analytics/lazy-charts";
import { FuelReport } from "@/features/fuel/fuel-report";
import { ReportFilters } from "@/features/reports/report-filters";
import { useReportInput } from "@/features/reports/use-report-input";
import { cashFlow } from "@/lib/reports";
import { formatMoney } from "@/lib/utils";
import { ChevronRight, Receipt } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function CashFlowView() {
  const { input, range, currency } = useReportInput();
  const params = useSearchParams();
  const flow = useMemo(() => cashFlow(input, range), [input, range]);
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  const anyActivity = flow.buckets.some((bucket) => bucket.amount > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Your cash flow</h1>
        <div className="mt-3">
          <ReportFilters />
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          {anyActivity ? (
            <CashFlowBars flow={flow} currency={currency} />
          ) : (
            <EmptyState
              icon={Receipt}
              title="Nothing recorded in this range"
              description="Pick a wider range, or add an expense to see it here."
            />
          )}
          <p className="text-xs font-medium text-primary">
            Current bank balance is {formatMoney(flow.bankBalance, currency)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {flow.buckets.map((bucket) => (
            <Link
              key={bucket.key}
              href={`/analytics/${bucket.key}${suffix}`}
              className="flex items-center gap-3 px-5 py-4 hover:bg-surface-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{bucket.label}</span>
                <span className="mt-0.5 block text-xs text-success">
                  Avg per month {formatMoney(bucket.perMonth, currency)}
                </span>
              </span>
              <span className="text-sm font-bold tabular-nums">
                {formatMoney(bucket.amount, currency)}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <FuelReport />
    </div>
  );
}
```

- [ ] **Step 2: Point the route at it and delete the old view**

Replace `src/app/(app)/analytics/page.tsx`:

```tsx
import { CashFlowView } from "@/features/reports/cash-flow-view";

export default function AnalyticsPage() {
  return <CashFlowView />;
}
```

Delete `src/features/analytics/analytics-view.tsx`.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: all pass. The Task 3 errors clear here.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(reports): show where the money went as the analytics landing"
```

---

### Task 6: Level 2 — bucket breakdown

**Files:**
- Create: `src/features/reports/bucket-view.tsx`
- Create: `src/app/(app)/analytics/[bucket]/page.tsx`

**Interfaces:**
- Consumes: `bucketBreakdown`, `BUCKET_KEYS`, `BUCKET_LABELS` (Tasks 1–2), `CategoryDonut`, `useReportInput`, `ReportFilters`.
- Produces: `BucketView`.

- [ ] **Step 1: Build the view**

Create `src/features/reports/bucket-view.tsx`:

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ReportFilters } from "@/features/reports/report-filters";
import { useReportInput } from "@/features/reports/use-report-input";
import { BUCKET_LABELS, type BucketKey, bucketBreakdown } from "@/lib/reports";
import { CHART_COLORS } from "@/lib/theme";
import { formatMoney } from "@/lib/utils";
import { ArrowLeft, ChevronRight, Receipt } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

const SLICE_TINTS = [1, 0.8, 0.62, 0.46, 0.32, 0.2];

export function BucketView({ bucket }: { bucket: BucketKey }) {
  const { input, range, currency } = useReportInput();
  const params = useSearchParams();
  const rows = useMemo(() => bucketBreakdown(input, range, bucket), [input, range, bucket]);
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  const total = rows.reduce((running, row) => running + row.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/analytics${suffix}`} aria-label="Back to cash flow">
          <ArrowLeft className="h-5 w-5 text-muted" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{BUCKET_LABELS[bucket]}</h1>
      </div>

      <ReportFilters />

      <Card>
        <CardContent className="space-y-4 p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {range.label}
          </p>
          <p className="text-3xl font-bold tracking-tight">{formatMoney(total, currency)}</p>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={`No ${BUCKET_LABELS[bucket].toLowerCase()} in this range`}
          description="Try a wider range from the filter above."
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {rows.map((row, index) => (
              <Link
                key={row.key}
                href={`/analytics/${bucket}/${encodeURIComponent(row.key)}${suffix}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-surface-2"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{
                    background: CHART_COLORS.expense,
                    opacity: SLICE_TINTS[Math.min(index, SLICE_TINTS.length - 1)],
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{row.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {row.percent.toFixed(1)}%
                  </span>
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {formatMoney(row.amount, currency)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the route**

Create `src/app/(app)/analytics/[bucket]/page.tsx`:

```tsx
import { BucketView } from "@/features/reports/bucket-view";
import { BUCKET_KEYS, type BucketKey } from "@/lib/reports";
import { notFound } from "next/navigation";

export default async function BucketPage({ params }: { params: Promise<{ bucket: string }> }) {
  const { bucket } = await params;
  if (!BUCKET_KEYS.includes(bucket as BucketKey)) notFound();

  return <BucketView bucket={bucket as BucketKey} />;
}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/reports/bucket-view.tsx "src/app/(app)/analytics/[bucket]/page.tsx"
git commit -m "feat(reports): break a bucket into its categories"
```

---

### Task 7: Level 3 — category detail

**Files:**
- Create: `src/features/reports/category-view.tsx`
- Create: `src/app/(app)/analytics/[bucket]/[category]/page.tsx`

**Interfaces:**
- Consumes: `categoryDetail` (Task 2), `CategoryMonthlyBars` (Task 3), `useReportInput`, `ReportFilters`.
- Produces: `CategoryView`.

- [ ] **Step 1: Build the view**

Create `src/features/reports/category-view.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryMonthlyBars } from "@/features/analytics/lazy-charts";
import { ReportFilters } from "@/features/reports/report-filters";
import { useReportInput } from "@/features/reports/use-report-input";
import { BUCKET_LABELS, type BucketKey, categoryDetail } from "@/lib/reports";
import { formatDate, formatMoney, parseFinancialDate } from "@/lib/utils";
import { ArrowLeft, Receipt } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export function CategoryView({ bucket, category }: { bucket: BucketKey; category: string }) {
  const { input, range, currency } = useReportInput();
  const params = useSearchParams();
  const [highToLow, setHighToLow] = useState(true);
  const detail = useMemo(
    () => categoryDetail(input, range, bucket, category),
    [input, range, bucket, category],
  );
  const query = params.toString();
  const suffix = query ? `?${query}` : "";

  const transactions = useMemo(() => {
    if (!detail) return [];
    return [...detail.transactions].sort((a, b) =>
      highToLow
        ? b.amount - a.amount
        : parseFinancialDate(b.date).getTime() - parseFinancialDate(a.date).getTime(),
    );
  }, [detail, highToLow]);

  const back = (
    <div className="flex items-center gap-3">
      <Link href={`/analytics/${bucket}${suffix}`} aria-label={`Back to ${BUCKET_LABELS[bucket]}`}>
        <ArrowLeft className="h-5 w-5 text-muted" />
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">{detail?.label ?? category}</h1>
    </div>
  );

  // A key that no longer matches anything is not a 404: it was valid until the
  // record behind it was deleted or the range moved past it.
  if (!detail) {
    return (
      <div className="space-y-5">
        {back}
        <EmptyState
          icon={Receipt}
          title="Nothing here"
          description="This category has no records in the selected range."
          action={
            <Link href={`/analytics/${bucket}${suffix}`}>
              <Button size="sm" variant="secondary">
                Back to {BUCKET_LABELS[bucket]}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {back}
      <ReportFilters />

      <Card>
        <CardContent className="p-5">
          <CategoryMonthlyBars detail={detail} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Total amount
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight">
                {formatMoney(detail.total, currency)}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setHighToLow((now) => !now)}>
              {highToLow ? "High to low" : "Newest first"}
            </Button>
          </div>

          <div className="mt-4 divide-y divide-border">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{transaction.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{transaction.sublabel}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold tabular-nums">
                    {formatMoney(transaction.amount, currency)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {formatDate(transaction.date)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Add the route**

Create `src/app/(app)/analytics/[bucket]/[category]/page.tsx`:

```tsx
import { CategoryView } from "@/features/reports/category-view";
import { BUCKET_KEYS, type BucketKey } from "@/lib/reports";
import { notFound } from "next/navigation";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ bucket: string; category: string }>;
}) {
  const { bucket, category } = await params;
  if (!BUCKET_KEYS.includes(bucket as BucketKey)) notFound();

  return <CategoryView bucket={bucket as BucketKey} category={decodeURIComponent(category)} />;
}
```

- [ ] **Step 3: Verify the whole feature**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected: all pass.

Run `pnpm dev` and check:
- `/analytics` shows four bars, the balance line, and four drill rows.
- Tapping Spends opens the donut list; tapping a category opens its six-month chart and transactions.
- Changing the range on any level keeps the filter when drilling in and when going back.
- The browser back button walks L3 → L2 → L1.
- `/analytics/nonsense` is a 404.

- [ ] **Step 4: Commit**

```bash
git add src/features/reports/category-view.tsx "src/app/(app)/analytics/[bucket]/[category]/page.tsx"
git commit -m "feat(reports): show one category's history and its transactions"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| Bucket definitions and disjointness | 1 (`bucketOf`, tests) |
| Investments from expenses only | 1 |
| Credit-card expenses count as spends | 1 (test) |
| Routes and 404 on unknown bucket | 6, 7 |
| Query-string filters, deleted-account fallback | 4 |
| Level 2 generic over buckets | 2 (`bucketRows`), 6 |
| Ranges, never ending in the future | 1 |
| Six-month chart with empty months and average | 2, 3 |
| Percentages not forced to 100 | 2 |
| Removed charts and view | 3, 5 |
| Error-handling table | 4 (account fallback), 6 (404), 7 (missing key), 1–2 (zero totals) |
| Testing list | 1, 2 |

No gaps.

**Type consistency**

`ReportInput`, `ReportRange`, `BucketKey`, `BreakdownRow`, `ReportTransaction`,
`CategoryDetail` and `CashFlow` are defined in Tasks 1–2 and used under those
names in 3–7. `cashFlow(input, range)`, `bucketBreakdown(input, range, bucket)`
and `categoryDetail(input, range, bucket, key, now?)` keep the same argument
order at every call site. `BUCKET_KEYS` is used by both route guards.
`useReportInput()` returns `{ input, range, accountId, currency, setRange,
setAccount }` and every consumer destructures from that set.

**Note for the implementer:** `withFilters` is exported from
`use-report-input.ts` but the views build their suffix inline from
`useSearchParams`. Drop the export if nothing uses it by Task 7 rather than
leaving it dead.

**Deferred, per the spec:** custom date picker, range comparison, export,
inline account attachment from the unlinked bucket.

# Reports Drill-Down — Design

Date: 2026-08-20
Status: Approved

## Purpose

Replace the Analytics page with a three-level drill-down that answers, in order:
where did the money go this cycle, which categories inside that, and which
transactions inside one category.

The current page shows four stat tiles and four charts side by side. It says
everything at once and answers nothing in particular: there is no way to go from
"₹17,940 went out" to "₹9,330 of it was rent" to "₹7,500 of that was the 6 Aug
payment to urbannest".

The shape is taken from four reference screenshots supplied by the user
(`level 1`, `level 1 scroll down`, `level2`, `level3`).

## Non-goals

- **No new money arithmetic.** Buckets are drawn from records that already
  exist. Nothing here changes a balance, a cycle, or a total that
  `FINANCE-CALCULATIONS.md` already defines.
- **No bank-feed import.** The reference app reads live bank transactions; this
  one reports on records the user entered.
- **No editing from the report.** Level 3 lists transactions and links to them.
  Changing one happens where it already happens.
- **No custom date picker in v1.** Four fixed ranges. See "Deferred".
- **No per-category budgets or targets.** Reporting only.

## Core principle: the arithmetic is pure and the pages are thin

Every figure comes from `src/lib/reports.ts` — no React, no store, no fetch. The
three page components read those functions and render.

This is not tidiness. The repo has no DOM test environment, so anything computed
inside a component cannot be tested at all, and this feature is almost entirely
computation. Keeping it in a pure module is the only way its correctness can be
checked. It also means the four bucket definitions live in exactly one place
rather than being re-derived per level and drifting apart.

## Buckets

The four figures on level 1. Stated explicitly because the whole report hangs
off them.

| Bucket | Contents |
|---|---|
| `incoming` | Confirmed salary history in range, plus incomes passing `countsAsEarnedIncome` |
| `investments` | Expenses in category `Investment` |
| `spends` | Every other expense that has an `accountId` |
| `unlinked` | Every other expense with no `accountId` |

`spends` and `unlinked` partition the non-investment expenses: an expense has an
`accountId` or it does not, so no amount can appear in both. This preserves
invariant 1 of `FINANCE-CALCULATIONS.md`, money is counted once.

**Why `unlinked` replaces the reference's "untagged".** Every expense in this app
already carries a category, so a literal untagged bucket would always read zero.
An expense with no account is the real gap: spending the app knows about that
never moved a balance. That gap is what let a mirrored bank balance drift out of
step with the statement, so surfacing it — and letting the user attach an account
from level 2 — has a purpose beyond decoration.

Credit-card expenses carry the card id in `accountId`, so they count as `spends`.
They do not reduce a bank balance, which is invariant 6 and unchanged here.

**Investments are drawn only from expenses.** An `Investment` record is a
holding — name, invested total, current value — with no dates on it, so there is
no dated contribution to place in a range. `computeSummary` already derives
`investedThisCycle` the same way, from `Investment`-category expenses alone, and
this report matches it rather than inventing a second definition. A holding's
growth is not a cash flow and does not belong on this page at all.

## Routes

```text
/analytics                        L1  cash flow
/analytics/[bucket]               L2  one bucket, broken down
/analytics/[bucket]/[category]    L3  one line of that breakdown
```

`bucket` is one of `spends`, `incoming`, `investments`, `unlinked`. Anything
else is a 404.

Filters travel in the query string:

```text
?range=cycle|month|quarter|fy   default cycle
&account=all|<accountId>        default all
```

**Why routes rather than in-page state.** On a phone the back gesture is the
primary way out of a screen. With in-page levels it would leave Analytics
altogether from three levels deep, losing the user's place. Routes also make any
level linkable and survive a refresh, which in-page state does not.

## Level 2 is generic

The same component serves all four buckets; only the grouping key changes.

| Bucket | Grouped by |
|---|---|
| `spends` | Expense category |
| `unlinked` | Expense category |
| `incoming` | Income type, with confirmed salary as its own `salary` row |
| `investments` | Merchant on the expense, falling back to `Investment` when it has none |

One component with a grouping function beats four near-identical pages, and it
means a fix to sorting or percentage rounding lands everywhere at once.

## Modules

| Module | Path | Responsibility |
|---|---|---|
| Report arithmetic | `src/lib/reports.ts` | Ranges, buckets, breakdowns, detail. Pure. |
| Tests | `src/lib/reports.test.ts` | Enforces this document. |
| L1 view | `src/features/reports/cash-flow-view.tsx` | Four bars, balance callout, drill rows. |
| L2 view | `src/features/reports/bucket-view.tsx` | Donut, category list. |
| L3 view | `src/features/reports/category-view.tsx` | Monthly bars, total, sort, transactions. |
| Filter bar | `src/features/reports/report-filters.tsx` | Range and account pickers, shared by all three. |
| Charts | `src/features/analytics/charts.tsx` | Gains `CashFlowBars` and `CategoryMonthlyBars`. |

### Interfaces

```ts
export type ReportRangeKey = "cycle" | "month" | "quarter" | "fy";
export type BucketKey = "incoming" | "investments" | "spends" | "unlinked";

export interface ReportRange { start: Date; end: Date; label: string; key: ReportRangeKey }

export interface ReportInput {
  profile: SalaryProfile;
  expenses: Expense[];
  incomes: Income[];
  salaryHistory: SalaryHistoryEntry[];
  accounts: BankAccount[];
  accountId?: string;      // undefined = all accounts
}

export interface CashFlow {
  range: ReportRange;
  buckets: { key: BucketKey; label: string; amount: number; perMonth: number }[];
  bankBalance: number;
}

export interface BreakdownRow {
  key: string;             // stable id for the L3 route segment
  label: string;
  amount: number;
  percent: number;
}

/**
 * One row in the level 3 list, already flattened.
 *
 * A union of `Expense[] | Income[]` would push a discriminated check into the
 * component for every field it renders, and level 3 draws all four buckets
 * identically. Normalising here keeps the view free of type narrowing.
 */
export interface ReportTransaction {
  id: string;
  label: string;      // merchant, income source, or investment name
  sublabel: string;   // category or income type
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

reportRange(profile: SalaryProfile, key: ReportRangeKey, now?: Date): ReportRange
cashFlow(input: ReportInput, range: ReportRange): CashFlow
bucketBreakdown(input: ReportInput, range: ReportRange, bucket: BucketKey): BreakdownRow[]
categoryDetail(input: ReportInput, range: ReportRange, bucket: BucketKey, key: string): CategoryDetail | null
```

## Ranges

| Key | Span |
|---|---|
| `cycle` | `cycleInfo(profile).cycleStart` to today. The default, matching the reference's "Aug 6 to Aug 20" |
| `month` | First of the current calendar month to today |
| `quarter` | Start of the month three months back to today |
| `fy` | `financialYearStart` to today, via the existing `financial-year.ts` |

Every range ends today, never in the future: a report is of what has happened.

## Level 3 monthly chart

Six calendar months ending with the current one, whatever the active range —
the point of that chart is to place the current period against recent history,
which a chart clipped to the range could not do. The current month's bar is
highlighted and the average line covers the months shown. A month with no
activity renders a zero bar rather than being dropped, so the axis stays evenly
spaced.

## Percentages

Computed against the bucket total and rounded to one decimal for display.
Rounded values are not forced to total 100: adjusting the largest row to absorb
the remainder would print a figure that does not match its own amount. The donut
is drawn from the raw amounts, so it is exact regardless.

A bucket total of zero yields no rows and an empty state, never a division by
zero.

## Removed

`analytics-view.tsx` is replaced. `MonthlyBars` and `IncomeExpenseBars` are used
only by it and are deleted with it. `CashFlowChart`, `SpendTrendChart` and
`CategoryDonut` stay — the dashboard uses all three. `FuelReport` keeps its place
at the bottom of level 1.

## Error handling

| Case | Behaviour |
|---|---|
| Unknown `bucket` segment | 404 via `notFound()` |
| Unknown `category` key | Empty state on L3 with a link back to L2, not a 404 — the key may have been valid before a record was deleted |
| Range with no records | Chart hidden, empty state naming the range |
| `account` filter naming a deleted account | Falls back to all accounts |
| Bucket total of zero | Empty state; no donut, no divide by zero |

## Testing

`src/lib/reports.test.ts`, written before the implementation:

- `spends` and `unlinked` never share an expense, and together equal all
  non-investment expenses in range.
- An `Investment`-category expense is in `investments` and in neither of the
  other two.
- A credit-card expense counts as `spends`, and does not alter the bank balance
  figure.
- Records outside the range are excluded at both boundaries.
- A future-dated record never appears.
- `bucketBreakdown` percentages are each amount over the total, and the rows sum
  to the bucket amount.
- An empty bucket returns no rows rather than dividing by zero.
- `categoryDetail` returns six months including empty ones, with the current
  month flagged.
- The average covers the months shown, not only the non-empty ones.
- The account filter restricts every bucket, and `unlinked` is empty whenever a
  specific account is selected — an expense with no account cannot belong to one.
- `reportRange("cycle")` matches `cycleInfo`, and no range ends in the future.

## Deferred

- A custom date-range picker.
- Comparing two ranges side by side.
- Exporting a level from the report.
- Attaching an account to an unlinked expense inline from level 2. The bucket
  surfaces the gap; fixing it happens in the expense form for now.

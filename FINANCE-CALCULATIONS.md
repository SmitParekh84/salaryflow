# Spendly Finance Calculation Contract

This document defines the source of truth for Spendly calculations and UI bindings. Code changes that affect money should preserve these rules and update the focused tests in `src/lib/finance.test.ts`.

## Core Invariants

1. Money is counted once.
2. A target is a plan, not an actual payment.
3. A goal allocation linked to an account is only a label on money already in that account.
4. Linked goal allocations never increase cash saved, never replace the savings-rule target, and never create a second safe-to-spend reserve.
5. A shared expense records only the current user's payment as their expense.
6. Credit-card charges affect card usage; they do not reduce a bank-account balance directly.
7. Investment payments are investments, not spending expenses.
8. Opening or migrated balances are historical money, not current-cycle savings.

## Salary Cycle

The cycle is produced by `cycleInfo` in `src/lib/calculations.ts`.

### Monthly

- Cycle start: the latest salary date on or before today.
- Next salary: the next valid salary date.
- If `salaryDay` is beyond the number of days in a month, the last day of that month is used.

### Weekly and Biweekly

- Weekly length: 7 days.
- Biweekly length: 14 days.
- The persisted salary day is used as a stable calendar anchor.

### Cycle Membership

A record is in the current cycle when:

```text
cycleStart <= recordDate <= now
```

Date-only values are parsed with `parseFinancialDate` so local dates do not shift because of UTC conversion.

## Income

```text
salaryIncome = confirmed salary in current cycle, when present
             = profile salary otherwise

extraIncome = current-cycle Bonus + Side Income + Freelance + Other

totalIncome = salaryIncome + extraIncome
```

Salary income records are excluded because profile or confirmed salary history is the salary source of truth. Reimbursements and cashback are also excluded from earned income. They can settle account or credit-card activity, but they do not increase salary-cycle earning power.

Budget-rule targets use `salaryIncome`, not bonuses or other extra income. This keeps the configured percentage plan bound to regular salary.

## Expenses and Investments

Current-cycle expenses are split into:

```text
fixedExpenses = Rent + EMI + Insurance + Subscriptions + Utilities + Mobile & Internet
variableExpenses = all other non-Investment expenses
totalExpenses = fixedExpenses + variableExpenses
investedThisCycle = current-cycle expenses with category Investment
```

An Investment expense is excluded from `totalExpenses` and included once in `investedThisCycle`.

Dashboard totals, analytics monthly expenses, daily spending charts, and category charts use the same non-Investment spending definition.

## Shared Expenses

For a shared expense:

```text
userPaid + friendPaid = groupTotal
Expense.amount = userPaid
```

Bindings:

- Group total: sum of `shared.totalAmount`.
- You paid: sum of `Expense.amount`.
- Friends paid: sum of `shared.friendPaid`.
- Total spent: includes only `Expense.amount`, never the group total.

### Account Balance

When a shared expense is paid from a bank account:

```text
newAccountBalance = oldAccountBalance - userPaid
```

Only `userPaid` is deducted. The friend's payment is never deducted from the current user's account.

The `balanceApplied` marker records that Spendly performed the deduction. It allows edit, delete, and recycle-bin restore operations to reverse or reapply the amount exactly once.

When the selected source is a credit card, no bank balance is reduced. The expense becomes part of credit-card usage.

Ordinary non-shared expenses keep source-only account behavior unless a dedicated payment workflow explicitly applies a balance mutation.

## Credit Cards

The active statement period begins the day after the previous statement date and ends on the current statement date. It supplies statement timing, but closing a statement does not imply that it was paid. Future-dated records are excluded.

```text
charges = all linked expenses recorded up to today
credits = all linked incomes recorded up to today
outstanding = max(0, charges - credits)
availableCredit = max(0, creditLimit - outstanding)
utilizationPercent = outstanding / creditLimit * 100
```

## Cash Saved This Cycle

Cash saved is evidence of new savings activity, not the current balance of a savings account and not a goal label.

```text
netSavingsAccountFlow =
    completed transfers into savings accounts
  - completed transfers out of savings accounts
  + incomes deposited directly into savings accounts
  - expenses paid from savings accounts

cashSavedThisCycle = max(0, netSavingsAccountFlow)
```

Savings accounts include accounts explicitly marked for savings and accounts that directly back a
goal through `balanceAccountId`. A transfer into an Emergency Fund account therefore counts as cash
saved even when that bank account has no separate savings-purpose tag.

### Explicit Exclusions

The following contribute exactly zero to `cashSavedThisCycle`:

- All goal contributions, whether linked or unlinked.
- Migrated opening goal balances.
- Existing savings-account balances.
- Savings targets from a budget rule.
- Scheduled but incomplete transfers.
- Transfers between two savings accounts, because incoming and outgoing amounts net to zero.

Example:

```text
Savings rule target: Rs 4,825
Existing account money allocated to goals: Rs 11,970
Cash saved from that allocation: Rs 0
```

The Rs 11,970 remains visible inside the goals as allocated money, but it must not appear as cash saved and must not alter the Rs 4,825 rule target.

## Budget Rules

Each target is calculated from regular salary income:

```text
bucketTarget = salaryIncome * bucketPercentage / 100
```

The four buckets are needs, wants, cash savings, and investments.

```text
savingsTarget = salaryIncome * savingsPercentage / 100
investmentTarget = salaryIncome * investmentPercentage / 100
plannedInvestments = max(0, investmentTarget - investedThisCycle)
plannedSavings = savingsTarget
spendingBudget = max(0, totalIncome - savingsTarget - investmentTarget)
```

Actual rule progress uses necessity, not payment frequency. This is separate from fixed-versus-variable reporting:

- Needs used: rent, EMI, insurance, utilities, mobile/internet, groceries, fuel, medical, and education.
- Wants used: all other non-Investment spending, including subscriptions, food, shopping, entertainment, travel, personal care, and custom categories.
- Savings used: cash saved this cycle.
- Investments used: investment payments this cycle.

A target is not displayed as an actual. Goal allocations do not override any target.

An account-backed goal can designate one bank account as its source of truth. Its progress equals
that account's current balance, the full balance is locked to the goal, and manual allocations to
that goal are disabled. Deposits increase progress and withdrawals reduce it automatically. This
still does not count the balance as newly saved in the current cycle; only evidenced account cash
flow affects `savedThisCycle`.

An ordinary goal may also have a preferred account. This is routing metadata only: linking the
account does not claim its existing balance. Goal progress increases only when the user explicitly
allocates an amount already held there or reserves part of a completed transfer into that account.
For a transfer reservation, only the selected goal amount is locked; the rest of the destination
balance remains free.

Rule adherence is directional:

- Needs and Wants percentages are maximum spending limits. Spending below them is healthy and is not penalized.
- Savings and Investments percentages are minimum targets. Saving or investing above them is healthy and is not shown as overspending.
- Only spending above a limit or saving/investing below a target reduces adherence.

## Remaining and Safe to Spend

```text
remaining =
    totalIncome
  - totalExpenses
  - investedThisCycle
  - plannedInvestments
  - plannedSavings
```

Today's expense is already inside `totalExpenses`. To calculate today's opening allowance without charging today's spending twice:

```text
remainingBeforeToday = remaining + spentToday
dailyBudget = max(0, remainingBeforeToday / daysRemaining)
safeToSpendToday = max(0, dailyBudget - spentToday)
```

Status thresholds:

- Green: spent today is at or below 85% of daily budget.
- Yellow: spent today is above 85% and at or below 115%.
- Red: spent today is above 115%.

## Savings Rate and Health Score

```text
savedAndInvested = cashSavedThisCycle + investedThisCycle
savingsRate = savedAndInvested / totalIncome * 100
```

The base health score considers:

- Savings rate.
- Spending pace through the cycle.
- Fixed-expense burden.
- Whether remaining money is negative.

When a budget rule is active:

```text
healthScore = 75% base health + 25% rule adherence
```

Both components are clamped to a 0-100 presentation range.

## Bills

Bill occurrences are calculated by `src/lib/bill-cycle.ts`.

- Monthly legacy bills use the current month and their configured due day.
- Yearly bills preserve the configured month and day.
- Weekly bills use the configured weekday.
- Interval bills advance by their configured interval.
- Invalid end-of-month days clamp to the last valid day.

Linked expenses determine paid amount:

```text
paidAmount = sum of expenses with matching billId and billingMonth
remainingAmount = max(0, billAmount - paidAmount)
```

Utility bills may replace an estimate with the recorded paid amount for that billing month.

## Funding Plan

The salary-day funding plan contains remaining obligations only:

- Credit-card statement outstanding.
- Monthly or interval bill reserves.
- SIP commitments or investment bills.
- Investment target top-up after existing monthly investments.
- Savings-rule target minus cash actually saved this cycle.

```text
fundingPlanTotal = sum(item.remainingAmount)
```

Goal allocations are not funding-plan payments and do not reduce the savings reserve. Only `cashSavedThisCycle` reduces the savings reserve.

## Account Transfers

### Transfer Now

```text
sourceBalance -= amount
destinationBalance += amount
status = completed
balancesApplied = true
```

### Scheduled

No balance changes until completion.

### Already Transferred

The transfer is recorded as completed evidence without applying the balances a second time.

Transfers from one savings account to another do not create new savings.

When a transfer fully empties an account marked as closing, linked goal allocations move to the destination account. Partial transfers leave allocations on the source account because that money has not fully moved.

An account cannot be deleted while expenses, income, bills, investments, goal allocations, transfers, or recycled records still reference it. Recycled expenses, income, bills, investments, and goals retain their account links because they may be restored. Removing a referenced account would change historical classifications or leave money attached to a missing source. The account can be hidden while those records are retained.

## Goals

A goal contribution can be one of two concepts:

1. Linked allocation: has `accountId`; identifies where existing money is reserved.
2. Unlinked contribution: has no `accountId`; records goal progress without an identified account.

Neither concept contributes to `cashSavedThisCycle`. Cash saved requires savings-account cash-flow evidence.

Goal progress is:

```text
goalSaved = sum(all valid goal contributions)
goalRemaining = max(0, target - goalSaved)
monthsToGoal = ceil(goalRemaining / monthlyContribution)
```

New allocations cannot exceed `goalRemaining`. A multi-goal split is rejected as a whole if any
entry would overfund its goal.

Goal progress can include linked allocations while cash-saved actuals exclude them. These are intentionally different views of the same user's money.

A recycled goal can be restored only when every linked account still exists and its restored allocations fit the account's current free balance after live goal claims. A failed restore leaves the goal in the recycle bin and does not alter account balances or allocations.

## UI Binding Map

| UI                      | Source                                  |
| ----------------------- | --------------------------------------- |
| Safe to spend today     | `summary.safeToSpendToday`              |
| Balance left            | `summary.remaining` clamped for display |
| Invested this cycle     | `summary.investedThisCycle`             |
| Total spent             | `summary.totalExpenses`                 |
| Cash saved this cycle   | `summary.savedThisCycle`                |
| Cash savings target     | `summary.savingsTarget`                 |
| Investment target       | `summary.investmentTarget`              |
| Savings rate            | `summary.savingsRate`                   |
| Shared group total      | Sum of `shared.totalAmount`             |
| Shared you paid         | Sum of `Expense.amount`                 |
| Shared friends paid     | Sum of `shared.friendPaid`              |
| Credit-card outstanding | `creditCardUsage(...).outstanding`      |
| Funding plan            | Sum of remaining funding items          |

## Validation Contract

Calculation changes should pass:

```bash
pnpm exec vitest run src/lib/finance.test.ts
pnpm typecheck
pnpm exec eslint src/lib/calculations.ts src/lib/bill-cycle.ts src/lib/funding-plan.ts src/lib/store.ts src/features/dashboard/dashboard-view.tsx src/features/analytics/analytics-view.tsx
```

Important regression cases include:

- Goal allocations linked to accounts produce Rs 0 cash saved.
- Goal allocations do not override the active savings rule.
- Savings-to-savings transfers net to zero.
- Investment expenses are excluded from total spending.
- Today's spending is subtracted exactly once.
- Shared bank payments deduct only the current user's amount.
- Expense delete and restore reverse account mutations exactly once.
- Recycled records prevent deletion of accounts they still reference.
- Goal restore rejects missing accounts and over-allocation.
- Legacy monthly bill dates use the current month.

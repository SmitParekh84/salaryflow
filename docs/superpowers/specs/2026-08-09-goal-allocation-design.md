# Goal Allocation — Design

**Date:** 2026-08-09
**Status:** Approved, ready for implementation planning

## Problem

A goal in Spendly is a number that goes up when the user presses "add". Nothing
connects it to real money. The app cannot answer the question the user actually
has: *"how much of the money in my bank is already promised to something?"*

The disconnect is visible in the code. `computeSummary` in `src/lib/calculations.ts`
carries a field called `savingsEvidence: "account" | "goals"` and picks **one or the
other** as the source of truth, because the two cannot be reconciled. A second
symptom sits in `src/features/goals/goals-view.tsx`, where an Emergency Fund goal
mirrors a savings account balance directly (`saved: savingsAccount.balance`) — a
special case that exists precisely because the general mechanism is missing.

## User scenario

This is the concrete case the design must handle, in the user's words:

- Union Bank holds **₹80**.
- HDFC closes tomorrow; its **₹10,489** moves to Union Bank → **₹10,569** total.
- That money splits: **₹10,000 → Bike**, **₹489 → Mobile**.
- **₹80** stays unassigned.
- On future transfers, the user picks which goals receive the money.

## Solution

Envelope allocation on top of a real balance. A bank account holds one real amount;
goals claim portions of it. What is not claimed is free to spend.

```
Union Bank                    ₹10,569   ← real balance
├─ Bike           locked      ₹10,000
├─ Mobile         locked         ₹489
└─ Free                          ₹80    ← balance − allocated
```

### Core invariant

**For every account: `sum(allocations) <= balance`.**

The app refuses an allocation that would break this. A user cannot promise money
that does not exist. This single rule is what makes the bank total trustworthy.

## Decisions

These were settled with the user during design:

1. **No bank API.** A direct HDFC connection requires India's RBI Account Aggregator
   framework (Setu / Finvu / OneMoney) or a licensed aggregator — a registered
   entity, commercial agreements, per-fetch costs. Out of reach. Balances and
   transfers are entered by the user, as they are today. The model is shaped so a
   real feed can populate it later without a rewrite.
2. **Allocated money is protected.** Money assigned to a goal is removed from
   Safe-to-Spend entirely. Only free money is spendable. This matches the brand
   promise: protect bills, investments and savings *before* discretionary spend.
3. **Allocation is per account, not a global pool.** Required for the bank total to
   reconcile.
4. **`goal.saved` becomes derived**, not hand-entered. Removes the two-truths bug.
5. **Forecasting is per goal** — a finish date and a what-if slider. A
   portfolio-value-over-time chart was explicitly rejected as unwanted.
6. **The what-if slider is display-only** until the user confirms it as their plan.

## Data model

One additive change to `src/lib/types.ts`:

```ts
export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  accountId?: string;    // NEW — which account holds this money
  transferId?: string;   // NEW — set when created by a transfer split
  opening?: boolean;     // NEW — synthetic migration record, see below
}
```

`Goal.saved` becomes **derived** at read time:

```ts
goalSaved(goal) === sum(goal.contributions.map(c => c.amount))
```

`Goal.saved` is **deprecated**: the field stays in the type because the sync
payload (`normalizeServerItems<Goal>`) and older clients still carry it, but after
migration nothing reads it except the migration itself. It is marked
`/** @deprecated use goalSaved() */` so no new code picks it up. A single selector
is the only way the rest of the app reads a goal's total, so the two cannot drift.

### Store actions

`src/lib/store.ts` changes:

- `contributeGoal(id, amount)` → `contributeGoal(id, amount, accountId?)`, and it
  rejects the write if the allocation would break the invariant.
- New `allocate(entries: { goalId, amount }[], accountId, transferId?)` — writes a
  whole split atomically so a partial split can never be persisted.
- New `reassignAllocations(fromAccountId, toAccountId)` for the account-close path.
- `addGoal` / `updateGoal` stop accepting `saved`.

### Derived values

Computed, never stored:

| Value | Definition |
| --- | --- |
| `goalSaved(goal)` | sum of the goal's contribution amounts |
| `accountAllocated(accountId)` | sum of all contributions across all goals tagged to that account |
| `accountFree(accountId)` | `account.balance − accountAllocated(accountId)` |
| `unassignedSaved(goal)` | sum of the goal's contributions with no `accountId` |

### Migration

Existing goals have a stored `saved` with no contributions behind it. On first load
after upgrade, for each goal where `saved > 0` and `sum(contributions) !== saved`,
append one synthetic contribution for the difference:

```ts
{
  id,
  amount: saved - sum(contributions),
  date: now,
  accountId: undefined,
  opening: true,        // ← required, see below
}
```

`Goal` has no `createdAt` field, so the true date of this money is unknowable and
the record is stamped `now`. That creates a trap: a `now`-dated contribution falls
inside the current salary cycle and would be counted as *money saved this cycle*,
inflating `savedThisCycle` for every existing user on upgrade day and distorting
Safe-to-Spend.

The `opening: true` flag prevents this. **Opening contributions are excluded from
all cycle-scoped calculations.** They count toward `goalSaved` and
`accountAllocated` — they are real money — but never toward `savedThisCycle`.

No data is lost. That money appears as **"not linked to an account"** with an
inline action to assign it. The migration is idempotent — a no-op once the sums
agree.

The Emergency Fund special case in `goals-view.tsx` (`saved: savingsAccount.balance`)
is removed; that goal now works like every other one.

## Components

### `AllocationSheet` — the splitter

One component, three entry points. Takes an amount and a source account, writes
contributions.

```
┌────────────────────────────────────────┐
│  ₹10,489 landed in Union Bank          │
│  What is this money for?               │
│                                        │
│  Bike                        [ 10,000 ]│
│      ₹0 → ₹10,000 of ₹85,000           │
│                                        │
│  Mobile                      [    489 ]│
│      ₹0 → ₹489 of ₹25,000              │
│                                        │
│  ─────────────────────────────────     │
│  Left to assign              ₹0  ✓     │
│  Keep as free money          ₹80       │
│                                        │
│  [ Skip for now ]      [ Save split ]  │
└────────────────────────────────────────┘
```

Behaviour:
- Live "left to assign" counter updates on every keystroke.
- Inputs are clamped so the total can never exceed the available amount.
- "Skip for now" leaves the whole amount free — always a valid choice.
- Entry points: after a transfer completes; dashboard `Add → Save to goal`; the
  "assign" action on an account's free balance.

### Dashboard `Add` menu

`src/features/dashboard/dashboard-view.tsx` currently opens `ExpenseForm` directly
from `addOpen`. It becomes a menu:

```
+ Add
  ├─ Expense              existing
  ├─ Income               existing
  ├─ Save to goal         new — opens AllocationSheet
  └─ Transfer money       existing, promoted from the Accounts page
```

### Account card

Gains a segmented bar showing each goal's share plus free money, and a
"₹80 free — assign" action opening the `AllocationSheet`.

### Goal card

Gains three things:

```
Bike                       ₹10,000 / ₹85,000
███░░░░░░░░░░░░░░░░░░  12%
Held in: Union Bank ₹10,000          ← where the money is

At ₹8,000/month  →  done Jun 2027    ← finish date

What if I save more?
₹8,000  ──────●──────────  ₹15,000   ← what-if slider
→ done Feb 2027, 4 months sooner
```

## Safe-to-Spend integration

In `src/lib/calculations.ts`:

- Goal contributions dated in the current cycle are subtracted from the spendable
  pool, in the same position as `investmentTarget` in the existing formula:

  ```
  spendingBudget = income − savingsTarget − investmentTarget − goalContributionsThisCycle
  ```

  They are **not** recorded as expenses and do not appear in the transaction list —
  the money still belongs to the user, it is only committed.
- `savingsEvidence: "account" | "goals"` is **deleted**. With allocations
  reconciling accounts and goals there is one truth, so the either/or choice has no
  reason to exist. Consumers of that field are updated.
- `savedThisCycle` is computed from contributions dated within the cycle,
  **excluding** those flagged `opening`.

Double-counting guard: `savingsTarget` is a *plan* and goal contributions are
*actuals*. Where a contribution satisfies the savings target it must reduce that
target's remaining amount rather than being subtracted twice. The funding plan
already models this with `paidAmount` / `remainingAmount`; the same treatment
applies here.

`buildFundingPlan` in `src/lib/funding-plan.ts` already emits a `savings` item with a
`paidAmount` fed by `savedThisCycle`; it keeps working through the new selector.

## Projection

Extends the existing `projectedGoalDate(goal)` (`calculations.ts:342`):

```
monthsRemaining = ceil((target − saved) / monthlyContribution)
```

- `monthlyContribution <= 0` → no date; show "set a monthly amount to see a date".
- `saved >= target` → goal complete.
- The what-if slider recomputes with a substituted contribution and reports the
  delta in months. It writes nothing until the user taps "make this my plan",
  which sets `monthlyContribution`.

This is deliberately simple: no interest, no inflation, no variable rates. It
matches how the user actually saves.

## Edge cases

| Case | Behaviour |
| --- | --- |
| Allocation exceeds free balance | Blocked at input; the field clamps and the reason is shown |
| Balance edited below allocated total | Account enters an **over-allocated** state with a banner and a "fix" action. Allocations are never silently dropped — destroying the user's records is worse than showing an inconsistency |
| **Account closed with allocations** (the HDFC case) | Closing is blocked until allocations move. The existing `plannedTransferTo` / `completeAccountTransfer` flow reassigns the contributions' `accountId` to the destination account |
| Goal deleted with allocations | Its money returns to free in the accounts that held it; the recycle-bin restore path restores allocations too |
| Legacy contribution with no `accountId` | Shown as "not linked to an account" with an assign action; excluded from `accountAllocated` |
| Goal over-funded | Allowed; surplus shown as "₹X over target" with an action to move it elsewhere |
| Transfer deleted or reversed | Contributions carrying its `transferId` are unwound with it |

## Testing

Extends `src/lib/finance.test.ts` (vitest, 17 tests passing today). Pure functions,
no UI tests needed:

- `goalSaved` sums contributions; a goal with none is 0
- `accountAllocated` / `accountFree` across multiple goals in one account
- The invariant holds: an over-allocating write is rejected
- The user's scenario end to end: ₹80 + ₹10,489 → split 10,000 / 489 → free is ₹80
- Migration creates the opening-balance contribution, and is idempotent on re-run
- Over-allocated state is detected when a balance drops below allocations
- Account close reassigns allocations to the destination
- `projectedGoalDate` — normal, zero contribution, already complete
- What-if delta returns the correct month difference
- Cycle-scoped `savedThisCycle` counts only in-cycle contributions

## Out of scope

Deliberately excluded to keep this shippable:

- Any real bank/Account Aggregator integration
- Bank statement / CSV import
- Portfolio-value-over-time chart (explicitly rejected by the user)
- Interest, inflation or returns in projections
- Auto-allocation rules ("always put 20% into Bike")
- Shared or multi-user goals

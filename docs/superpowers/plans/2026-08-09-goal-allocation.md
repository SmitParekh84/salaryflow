# Goal Allocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect goals to real bank money so allocated funds are protected from Safe-to-Spend and every account balance reconciles as `allocated + free`.

**Architecture:** Goal contributions gain an `accountId`, turning them into envelope allocations against a real account balance. All totals become derived through pure selectors in a new `src/lib/allocations.ts`, replacing the stored `Goal.saved` field and the either/or `savingsEvidence` heuristic. UI work sits on top: one reusable allocation sheet with three entry points.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zustand (persist middleware), Tailwind v4, Radix primitives, framer-motion, vitest.

## Global Constraints

- Package manager is **pnpm**. Never use npm or yarn.
- Verification commands: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. All must pass before any commit.
- Tests live in `src/lib/finance.test.ts` (vitest, `describe`/`it`/`expect` imported from `vitest`). Add new pure-logic tests there unless a task says otherwise.
- All colors come from tokens in `src/app/globals.css` via `src/lib/theme.ts`. Never write a raw hex or a Tailwind palette class (`bg-green-500`) in a component.
- Currency is rendered with `formatMoney(amount, currency, compact?)` from `src/lib/utils.ts`. Never hand-format money.
- The invariant `sum(allocations per account) <= account.balance` must hold after every write.
- `opening: true` contributions are excluded from **all** cycle-scoped calculations.
- Money is stored in whole rupees as `number`. Do not introduce decimals or a money library.
- Follow existing file conventions: `"use client"` on interactive components, named exports, `cn()` for class merging.

---

### Task 1: Allocation selectors

Pure functions. No UI, no store. Everything downstream reads goal and account totals through these.

**Files:**
- Create: `src/lib/allocations.ts`
- Modify: `src/lib/types.ts` (lines 148-153, the `GoalContribution` interface)
- Test: `src/lib/finance.test.ts`

**Interfaces:**
- Consumes: `Goal`, `GoalContribution`, `BankAccount` from `src/lib/types.ts`
- Produces:
  - `goalSaved(goal: Goal): number`
  - `accountAllocated(goals: Goal[], accountId: string): number`
  - `accountFree(goals: Goal[], account: BankAccount): number`
  - `unassignedSaved(goal: Goal): number`
  - `isOverAllocated(goals: Goal[], account: BankAccount): boolean`
  - `goalAccountBreakdown(goal: Goal): { accountId?: string; amount: number }[]`

- [ ] **Step 1: Add the new contribution fields**

In `src/lib/types.ts`, replace the `GoalContribution` interface:

```ts
export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  /** Which bank account holds this money. Undefined = not yet linked. */
  accountId?: string;
  /** Set when this contribution was created by splitting an account transfer. */
  transferId?: string;
  /** Synthetic record created by migration. Excluded from cycle-scoped math. */
  opening?: boolean;
}
```

In the same file, mark the `saved` field on `Goal` as deprecated (leave the field — the sync payload still carries it):

```ts
export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  target: number;
  /** @deprecated Read totals with goalSaved() from src/lib/allocations.ts. */
  saved: number;
  deadline?: string;
  monthlyContribution: number;
  contributions?: GoalContribution[];
}
```

- [ ] **Step 2: Write the failing tests**

Append to `src/lib/finance.test.ts`:

```ts
describe("allocations", () => {
  const goal = (id: string, contributions: GoalContribution[]): Goal => ({
    id,
    name: id,
    type: "Custom",
    target: 100000,
    saved: 0,
    monthlyContribution: 0,
    contributions,
  });

  const account: BankAccount = {
    id: "union",
    bankName: "Union Bank",
    accountType: "Savings",
    balance: 10569,
    status: "active",
  };

  it("sums contributions into a goal total", () => {
    const bike = goal("bike", [
      { id: "c1", amount: 6000, date: "2026-08-01T00:00:00.000Z" },
      { id: "c2", amount: 4000, date: "2026-08-05T00:00:00.000Z" },
    ]);
    expect(goalSaved(bike)).toBe(10000);
  });

  it("treats a goal with no contributions as zero", () => {
    expect(goalSaved(goal("empty", []))).toBe(0);
  });

  it("sums allocations across goals for one account", () => {
    const goals = [
      goal("bike", [{ id: "c1", amount: 10000, date: "2026-08-01", accountId: "union" }]),
      goal("mobile", [{ id: "c2", amount: 489, date: "2026-08-01", accountId: "union" }]),
      goal("other", [{ id: "c3", amount: 5000, date: "2026-08-01", accountId: "hdfc" }]),
    ];
    expect(accountAllocated(goals, "union")).toBe(10489);
    expect(accountAllocated(goals, "hdfc")).toBe(5000);
  });

  it("computes the user scenario: 80 free after a 10489 split", () => {
    const goals = [
      goal("bike", [{ id: "c1", amount: 10000, date: "2026-08-01", accountId: "union" }]),
      goal("mobile", [{ id: "c2", amount: 489, date: "2026-08-01", accountId: "union" }]),
    ];
    expect(accountFree(goals, account)).toBe(80);
  });

  it("excludes contributions with no account from account totals", () => {
    const goals = [goal("bike", [{ id: "c1", amount: 5000, date: "2026-08-01" }])];
    expect(accountAllocated(goals, "union")).toBe(0);
    expect(unassignedSaved(goals[0])).toBe(5000);
  });

  it("detects an over-allocated account", () => {
    const goals = [
      goal("bike", [{ id: "c1", amount: 10000, date: "2026-08-01", accountId: "union" }]),
    ];
    expect(isOverAllocated(goals, account)).toBe(false);
    expect(isOverAllocated(goals, { ...account, balance: 9000 })).toBe(true);
  });

  it("breaks a goal down by the accounts holding it", () => {
    const bike = goal("bike", [
      { id: "c1", amount: 6000, date: "2026-08-01", accountId: "union" },
      { id: "c2", amount: 4000, date: "2026-08-02", accountId: "union" },
      { id: "c3", amount: 500, date: "2026-08-03" },
    ]);
    expect(goalAccountBreakdown(bike)).toEqual([
      { accountId: "union", amount: 10000 },
      { accountId: undefined, amount: 500 },
    ]);
  });
});
```

Add to the existing type import block at the top of the file: `Goal`, `GoalContribution`. Add a new import line:

```ts
import {
  accountAllocated,
  accountFree,
  goalAccountBreakdown,
  goalSaved,
  isOverAllocated,
  unassignedSaved,
} from "./allocations";
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Failed to resolve import "./allocations"`

- [ ] **Step 4: Implement the selectors**

Create `src/lib/allocations.ts`:

```ts
import type { BankAccount, Goal } from "./types";

/** Total money saved into a goal. Replaces the deprecated Goal.saved field. */
export function goalSaved(goal: Goal): number {
  return (goal.contributions ?? []).reduce((sum, entry) => sum + entry.amount, 0);
}

/** Money in this goal that is not yet linked to a bank account. */
export function unassignedSaved(goal: Goal): number {
  return (goal.contributions ?? [])
    .filter((entry) => !entry.accountId)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

/** Total claimed by all goals against one account. */
export function accountAllocated(goals: Goal[], accountId: string): number {
  return goals
    .flatMap((goal) => goal.contributions ?? [])
    .filter((entry) => entry.accountId === accountId)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

/** Balance not claimed by any goal. Negative means over-allocated. */
export function accountFree(goals: Goal[], account: BankAccount): number {
  return account.balance - accountAllocated(goals, account.id);
}

/** True when goals claim more than the account actually holds. */
export function isOverAllocated(goals: Goal[], account: BankAccount): boolean {
  return accountFree(goals, account) < 0;
}

/** Where a goal's money lives, in first-seen order. Undefined accountId = unlinked. */
export function goalAccountBreakdown(goal: Goal): { accountId?: string; amount: number }[] {
  const totals = new Map<string, { accountId?: string; amount: number }>();
  for (const entry of goal.contributions ?? []) {
    const key = entry.accountId ?? "__unassigned__";
    const existing = totals.get(key);
    if (existing) existing.amount += entry.amount;
    else totals.set(key, { accountId: entry.accountId, amount: entry.amount });
  }
  return Array.from(totals.values());
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — 17 original tests plus 7 new ones.

- [ ] **Step 6: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/allocations.ts src/lib/types.ts src/lib/finance.test.ts
git commit -m "feat(goals): add account-linked allocation selectors"
```

---

### Task 2: Opening-balance migration

Existing goals carry a stored `saved` with no contributions behind it. This backfills one synthetic record so derived totals match what users already see.

**Files:**
- Create: `src/lib/goal-migration.ts`
- Test: `src/lib/finance.test.ts`

**Interfaces:**
- Consumes: `goalSaved` from `src/lib/allocations.ts`
- Produces: `migrateGoalOpeningBalances(goals: Goal[], now?: Date): Goal[]`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/finance.test.ts`:

```ts
describe("goal opening-balance migration", () => {
  const legacy: Goal = {
    id: "bike",
    name: "Bike",
    type: "Bike",
    target: 85000,
    saved: 5000,
    monthlyContribution: 2000,
  };

  it("backfills an opening contribution for legacy saved amounts", () => {
    const [migrated] = migrateGoalOpeningBalances([legacy]);
    expect(migrated.contributions).toHaveLength(1);
    expect(migrated.contributions?.[0].amount).toBe(5000);
    expect(migrated.contributions?.[0].opening).toBe(true);
    expect(migrated.contributions?.[0].accountId).toBeUndefined();
    expect(goalSaved(migrated)).toBe(5000);
  });

  it("is idempotent", () => {
    const once = migrateGoalOpeningBalances([legacy]);
    const twice = migrateGoalOpeningBalances(once);
    expect(twice[0].contributions).toHaveLength(1);
    expect(goalSaved(twice[0])).toBe(5000);
  });

  it("backfills only the difference when contributions partly cover saved", () => {
    const partial: Goal = {
      ...legacy,
      contributions: [{ id: "c1", amount: 2000, date: "2026-07-01T00:00:00.000Z" }],
    };
    const [migrated] = migrateGoalOpeningBalances([partial]);
    expect(migrated.contributions).toHaveLength(2);
    expect(goalSaved(migrated)).toBe(5000);
  });

  it("leaves goals with no saved amount untouched", () => {
    const [migrated] = migrateGoalOpeningBalances([{ ...legacy, saved: 0 }]);
    expect(migrated.contributions ?? []).toHaveLength(0);
  });

  it("does not remove money when contributions exceed the stored saved value", () => {
    const richer: Goal = {
      ...legacy,
      saved: 1000,
      contributions: [{ id: "c1", amount: 4000, date: "2026-07-01T00:00:00.000Z" }],
    };
    const [migrated] = migrateGoalOpeningBalances([richer]);
    expect(goalSaved(migrated)).toBe(4000);
    expect(migrated.contributions).toHaveLength(1);
  });
});
```

Add the import:

```ts
import { migrateGoalOpeningBalances } from "./goal-migration";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Failed to resolve import "./goal-migration"`

- [ ] **Step 3: Implement the migration**

Create `src/lib/goal-migration.ts`:

```ts
import { goalSaved } from "./allocations";
import type { Goal } from "./types";

/**
 * Backfills a synthetic "opening" contribution for goals whose legacy stored
 * `saved` value is not yet represented by contribution records.
 *
 * Goal has no createdAt, so the true date of this money is unknowable and the
 * record is stamped with `now`. That date falls inside the current salary cycle,
 * which would wrongly count old savings as saved-this-cycle — so the record is
 * flagged `opening: true` and every cycle-scoped calculation skips it.
 *
 * Idempotent: a no-op once derived and stored totals agree.
 */
export function migrateGoalOpeningBalances(goals: Goal[], now = new Date()): Goal[] {
  return goals.map((goal) => {
    const derived = goalSaved(goal);
    const shortfall = (goal.saved ?? 0) - derived;
    if (shortfall <= 0) return goal;
    return {
      ...goal,
      contributions: [
        ...(goal.contributions ?? []),
        {
          id: `goal-contribution-opening-${goal.id}`,
          amount: shortfall,
          date: now.toISOString(),
          opening: true,
        },
      ],
    };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — 5 new tests.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/goal-migration.ts src/lib/finance.test.ts
git commit -m "feat(goals): backfill opening balances as contributions"
```

---

### Task 3: Store actions

Writes that respect the invariant. `allocate` is atomic so a partial split can never persist.

**Files:**
- Modify: `src/lib/store.ts` (`contributeGoal` at lines 280-294; type block at lines 72-75; hydration paths at lines 641, 673, 733)
- Test: `src/lib/finance.test.ts`

**Interfaces:**
- Consumes: `accountFree` from `src/lib/allocations.ts`, `migrateGoalOpeningBalances` from `src/lib/goal-migration.ts`
- Produces (pure helper, exported for tests):
  - `applyAllocation(goals: Goal[], accounts: BankAccount[], entries: { goalId: string; amount: number }[], accountId: string, transferId: string | undefined, now: Date): { ok: true; goals: Goal[] } | { ok: false; reason: string }`
  - `reassignGoalAccounts(goals: Goal[], fromAccountId: string, toAccountId: string): Goal[]`
- Store actions: `contributeGoal(id, amount, accountId?)`, `allocate(entries, accountId, transferId?)`, `reassignAllocations(from, to)`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/finance.test.ts`:

```ts
describe("allocation writes", () => {
  const union: BankAccount = {
    id: "union",
    bankName: "Union Bank",
    accountType: "Savings",
    balance: 10569,
    status: "active",
  };
  const bike: Goal = {
    id: "bike", name: "Bike", type: "Bike", target: 85000,
    saved: 0, monthlyContribution: 8000, contributions: [],
  };
  const mobile: Goal = {
    id: "mobile", name: "Mobile", type: "Phone", target: 25000,
    saved: 0, monthlyContribution: 2000, contributions: [],
  };
  const when = new Date("2026-08-09T10:00:00.000Z");

  it("splits a transfer across goals atomically", () => {
    const result = applyAllocation(
      [bike, mobile], [union],
      [{ goalId: "bike", amount: 10000 }, { goalId: "mobile", amount: 489 }],
      "union", "transfer-1", when,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(goalSaved(result.goals[0])).toBe(10000);
    expect(goalSaved(result.goals[1])).toBe(489);
    expect(accountFree(result.goals, union)).toBe(80);
    expect(result.goals[0].contributions?.[0].transferId).toBe("transfer-1");
  });

  it("rejects a split that exceeds the free balance", () => {
    const result = applyAllocation(
      [bike, mobile], [union],
      [{ goalId: "bike", amount: 11000 }],
      "union", undefined, when,
    );
    expect(result.ok).toBe(false);
  });

  it("writes nothing at all when one entry breaks the invariant", () => {
    const result = applyAllocation(
      [bike, mobile], [union],
      [{ goalId: "bike", amount: 10000 }, { goalId: "mobile", amount: 5000 }],
      "union", undefined, when,
    );
    expect(result.ok).toBe(false);
    expect(goalSaved(bike)).toBe(0);
    expect(goalSaved(mobile)).toBe(0);
  });

  it("counts money already allocated when checking the invariant", () => {
    const funded = [
      { ...bike, contributions: [{ id: "c1", amount: 10000, date: "2026-08-01", accountId: "union" }] },
      mobile,
    ];
    const result = applyAllocation(
      funded, [union], [{ goalId: "mobile", amount: 500 }], "union", undefined, when,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown account", () => {
    const result = applyAllocation(
      [bike], [union], [{ goalId: "bike", amount: 100 }], "missing", undefined, when,
    );
    expect(result.ok).toBe(false);
  });

  it("moves allocations to the destination when an account closes", () => {
    const funded = [
      { ...bike, contributions: [{ id: "c1", amount: 10000, date: "2026-08-01", accountId: "hdfc" }] },
    ];
    const moved = reassignGoalAccounts(funded, "hdfc", "union");
    expect(accountAllocated(moved, "union")).toBe(10000);
    expect(accountAllocated(moved, "hdfc")).toBe(0);
  });
});
```

Add the import:

```ts
import { applyAllocation, reassignGoalAccounts } from "./allocation-writes";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Failed to resolve import "./allocation-writes"`

- [ ] **Step 3: Implement the pure write helpers**

Create `src/lib/allocation-writes.ts`:

```ts
import { accountAllocated } from "./allocations";
import type { BankAccount, Goal } from "./types";

export type AllocationEntry = { goalId: string; amount: number };

export type AllocationResult =
  | { ok: true; goals: Goal[] }
  | { ok: false; reason: string };

/**
 * Applies a whole split at once. Either every entry lands or none does, so a
 * partial allocation can never be persisted.
 */
export function applyAllocation(
  goals: Goal[],
  accounts: BankAccount[],
  entries: AllocationEntry[],
  accountId: string,
  transferId: string | undefined,
  now: Date,
): AllocationResult {
  const account = accounts.find((candidate) => candidate.id === accountId);
  if (!account) return { ok: false, reason: "That account no longer exists." };

  const positive = entries.filter((entry) => entry.amount > 0);
  if (positive.length === 0) return { ok: false, reason: "Enter an amount to allocate." };

  const requested = positive.reduce((sum, entry) => sum + entry.amount, 0);
  const free = account.balance - accountAllocated(goals, accountId);
  if (requested > free) {
    return { ok: false, reason: `Only ${free} is free in ${account.bankName}.` };
  }

  const unknown = positive.find((entry) => !goals.some((goal) => goal.id === entry.goalId));
  if (unknown) return { ok: false, reason: "That goal no longer exists." };

  const stamp = now.toISOString();
  return {
    ok: true,
    goals: goals.map((goal) => {
      const entry = positive.find((candidate) => candidate.goalId === goal.id);
      if (!entry) return goal;
      return {
        ...goal,
        contributions: [
          ...(goal.contributions ?? []),
          {
            id: `goal-contribution-${goal.id}-${stamp}`,
            amount: entry.amount,
            date: stamp,
            accountId,
            ...(transferId ? { transferId } : {}),
          },
        ],
      };
    }),
  };
}

/** Repoints every allocation from one account to another. Used when an account closes. */
export function reassignGoalAccounts(
  goals: Goal[],
  fromAccountId: string,
  toAccountId: string,
): Goal[] {
  return goals.map((goal) => ({
    ...goal,
    contributions: (goal.contributions ?? []).map((entry) =>
      entry.accountId === fromAccountId ? { ...entry, accountId: toAccountId } : entry,
    ),
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — 6 new tests.

- [ ] **Step 5: Wire the helpers into the store**

In `src/lib/store.ts`, update the action type declarations (near line 74):

```ts
  contributeGoal: (id: string, amount: number, accountId?: string) => boolean;
  allocate: (
    entries: { goalId: string; amount: number }[],
    accountId: string,
    transferId?: string,
  ) => { ok: boolean; reason?: string };
  reassignAllocations: (fromAccountId: string, toAccountId: string) => void;
```

Replace the `contributeGoal` implementation (lines 280-294) with:

```ts
      contributeGoal: (id, amount, accountId) => {
        if (!accountId) {
          set((s) => ({
            goals: s.goals.map((g) =>
              g.id === id
                ? {
                    ...g,
                    contributions: [
                      ...(g.contributions ?? []),
                      { id: uid("goal-contribution"), amount, date: new Date().toISOString() },
                    ],
                  }
                : g,
            ),
          }));
          return true;
        }
        return get().allocate([{ goalId: id, amount }], accountId).ok;
      },

      allocate: (entries, accountId, transferId) => {
        const state = get();
        const result = applyAllocation(
          state.goals,
          state.accounts,
          entries,
          accountId,
          transferId,
          new Date(),
        );
        if (!result.ok) return { ok: false, reason: result.reason };
        set({ goals: result.goals });
        return { ok: true };
      },

      reassignAllocations: (fromAccountId, toAccountId) =>
        set((s) => ({ goals: reassignGoalAccounts(s.goals, fromAccountId, toAccountId) })),
```

Add imports at the top of `store.ts`:

```ts
import { applyAllocation, reassignGoalAccounts } from "./allocation-writes";
import { migrateGoalOpeningBalances } from "./goal-migration";
```

Wrap every goal-hydration path with the migration. At lines 641, 673 and 733 the pattern `normalizeServerItems<Goal>(...)` appears — wrap each call site:

```ts
goals: migrateGoalOpeningBalances(normalizeServerItems<Goal>(d.goals, state.goals)),
```

And the seed path at line 693:

```ts
goals: migrateGoalOpeningBalances(seedGoals()),
```

- [ ] **Step 6: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add src/lib/allocation-writes.ts src/lib/store.ts src/lib/finance.test.ts
git commit -m "feat(goals): add invariant-checked allocation store actions"
```

---

### Task 4: Safe-to-Spend integration

Removes the either/or `savingsEvidence` heuristic and makes committed goal money reduce the spendable pool without double-counting.

**Files:**
- Modify: `src/lib/calculations.ts` (line 92 type field; lines 170-173, 199-203, 213; line 270; `projectedGoalDate` at 342-350)
- Modify: `src/features/dashboard/dashboard-view.tsx:117,188`
- Modify: `src/features/rules/rules-view.tsx:152`
- Test: `src/lib/finance.test.ts`

**Interfaces:**
- Consumes: `goalSaved` from `src/lib/allocations.ts`
- Produces: `FinanceSummary` loses `savingsEvidence`, keeps `savedThisCycle` with new semantics.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/finance.test.ts`. Reuse the existing `profile` fixture already defined at the top of the file:

```ts
describe("goal contributions in the cycle", () => {
  const inCycle = new Date("2026-08-09T00:00:00.000Z");

  const goalWith = (contributions: GoalContribution[]): Goal => ({
    id: "bike", name: "Bike", type: "Bike", target: 85000,
    saved: 0, monthlyContribution: 8000, contributions,
  });

  it("ignores opening contributions when counting this cycle's savings", () => {
    const summary = computeSummary(
      profile, [], [], [],
      [goalWith([{ id: "c1", amount: 5000, date: inCycle.toISOString(), opening: true }])],
      [], undefined, [], [], inCycle,
    );
    expect(summary.savedThisCycle).toBe(0);
  });

  it("counts a real in-cycle contribution", () => {
    const summary = computeSummary(
      profile, [], [], [],
      [goalWith([{ id: "c1", amount: 5000, date: inCycle.toISOString(), accountId: "union" }])],
      [], undefined, [], [], inCycle,
    );
    expect(summary.savedThisCycle).toBe(5000);
  });

  it("no longer exposes savingsEvidence", () => {
    const summary = computeSummary(
      profile, [], [], [], [], [], undefined, [], [], inCycle,
    );
    expect("savingsEvidence" in summary).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `savedThisCycle` is 5000 in the opening test, and `savingsEvidence` is still present.

- [ ] **Step 3: Update the savings computation**

In `src/lib/calculations.ts`, replace the `goalContributionsThisCycle` block (lines 170-173):

```ts
  const cycleContributions = goals
    .flatMap((goal) => goal.contributions ?? [])
    .filter((contribution) => !contribution.opening)
    .filter((contribution) => isInCurrentCycle(contribution.date, profile, now));
  const goalContributionsThisCycle = cycleContributions.reduce(
    (sum, contribution) => sum + contribution.amount,
    0,
  );
```

Replace the `savingsEvidence` / `savedThisCycle` block (lines 199-203):

```ts
  // Contributions created by splitting a transfer are already inside
  // savingsAccountCashFlow; subtracting them keeps the same rupee from counting twice.
  const allocatedFromTransfers = cycleContributions
    .filter((contribution) => contribution.transferId)
    .reduce((sum, contribution) => sum + contribution.amount, 0);
  const unallocatedSavingsFlow = Math.max(0, savingsAccountCashFlow - allocatedFromTransfers);
  const savedThisCycle = Math.max(0, goalContributionsThisCycle + unallocatedSavingsFlow);
```

Update `spendingBudget` (line 213) so committed goal money leaves the spendable pool. `savingsTarget` is a plan and contributions are actuals, so take whichever is larger rather than adding them:

```ts
  const savingsCommitted = Math.max(savingsTarget, goalContributionsThisCycle);
  const spendingBudget = Math.max(0, income - savingsCommitted - investmentTarget);
```

Delete `savingsEvidence: "account" | "goals";` from the `FinanceSummary` interface (line 92) and remove `savingsEvidence,` from the returned object (line 270).

- [ ] **Step 4: Make projectedGoalDate use derived totals**

Replace `projectedGoalDate` (lines 342-350):

```ts
export function projectedGoalDate(goal: Goal): string | null {
  if (goal.monthlyContribution <= 0) return null;
  const remaining = goal.target - goalSaved(goal);
  if (remaining <= 0) return "Achieved";
  const months = Math.ceil(remaining / goal.monthlyContribution);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
```

Add to the imports at the top of `calculations.ts`:

```ts
import { goalSaved } from "./allocations";
```

- [ ] **Step 5: Update the three UI consumers**

`src/features/dashboard/dashboard-view.tsx:117` — replace the conditional with the single truth:

```tsx
            "goal deposits and savings activity"
```

`src/features/dashboard/dashboard-view.tsx:188` — replace with:

```tsx
                    "Saved this cycle",
```

`src/features/rules/rules-view.tsx:149-155` — collapse the nested ternary. Replace:

```tsx
                      <span>
                        {allocation.kind === "savings"
                          ? summary.savingsEvidence === "account"
                            ? "Net moved to savings"
                            : "Goal deposits"
                          : USED_LABELS[allocation.kind]}
                      </span>
```

with:

```tsx
                      <span>
                        {allocation.kind === "savings"
                          ? "Saved this cycle"
                          : USED_LABELS[allocation.kind]}
                      </span>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test && pnpm typecheck`
Expected: PASS. Typecheck confirms no remaining `savingsEvidence` reference.

- [ ] **Step 7: Commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add src/lib/calculations.ts src/features/dashboard/dashboard-view.tsx src/features/rules/rules-view.tsx src/lib/finance.test.ts
git commit -m "feat(goals): protect allocated money from safe-to-spend"
```

---

### Task 5: Goal projection and what-if

**Files:**
- Create: `src/lib/goal-projection.ts`
- Test: `src/lib/finance.test.ts`

**Interfaces:**
- Consumes: `goalSaved` from `src/lib/allocations.ts`
- Produces:
  - `monthsToGoal(goal: Goal, monthlyOverride?: number): number | null`
  - `projectGoal(goal: Goal, monthlyOverride?: number, now?: Date): { months: number; label: string } | null`
  - `whatIfDelta(goal: Goal, monthly: number, now?: Date): { months: number; label: string; monthsSooner: number } | null`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/finance.test.ts`:

```ts
describe("goal projection", () => {
  const now = new Date("2026-08-09T00:00:00.000Z");
  const bike: Goal = {
    id: "bike", name: "Bike", type: "Bike", target: 85000, saved: 0,
    monthlyContribution: 8000,
    contributions: [{ id: "c1", amount: 10000, date: "2026-08-01", accountId: "union" }],
  };

  it("counts the months left at the current rate", () => {
    expect(monthsToGoal(bike)).toBe(10);
  });

  it("returns null with no monthly contribution", () => {
    expect(monthsToGoal({ ...bike, monthlyContribution: 0 })).toBeNull();
  });

  it("returns zero months once the target is reached", () => {
    expect(monthsToGoal({ ...bike, target: 5000 })).toBe(0);
  });

  it("labels the finish month", () => {
    expect(projectGoal(bike, undefined, now)?.label).toBe("Jun 2027");
  });

  it("reports how much sooner a bigger contribution finishes", () => {
    const result = whatIfDelta(bike, 15000, now);
    expect(result?.months).toBe(5);
    expect(result?.monthsSooner).toBe(5);
  });

  it("reports zero sooner when the what-if matches the current plan", () => {
    expect(whatIfDelta(bike, 8000, now)?.monthsSooner).toBe(0);
  });
});
```

Add the import:

```ts
import { monthsToGoal, projectGoal, whatIfDelta } from "./goal-projection";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Failed to resolve import "./goal-projection"`

- [ ] **Step 3: Implement the projection**

Create `src/lib/goal-projection.ts`:

```ts
import { goalSaved } from "./allocations";
import type { Goal } from "./types";

/**
 * Whole months until a goal is funded at a flat monthly rate.
 * Deliberately simple: no interest, no inflation, no variable rates — it matches
 * how the money is actually saved. Returns null when there is no rate to project.
 */
export function monthsToGoal(goal: Goal, monthlyOverride?: number): number | null {
  const monthly = monthlyOverride ?? goal.monthlyContribution;
  if (monthly <= 0) return null;
  const remaining = goal.target - goalSaved(goal);
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / monthly);
}

function monthLabel(months: number, now: Date): string {
  const date = new Date(now);
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function projectGoal(
  goal: Goal,
  monthlyOverride?: number,
  now = new Date(),
): { months: number; label: string } | null {
  const months = monthsToGoal(goal, monthlyOverride);
  if (months === null) return null;
  return { months, label: months === 0 ? "Achieved" : monthLabel(months, now) };
}

/** Projection at a hypothetical rate, plus how many months it saves. Never writes. */
export function whatIfDelta(
  goal: Goal,
  monthly: number,
  now = new Date(),
): { months: number; label: string; monthsSooner: number } | null {
  const proposed = projectGoal(goal, monthly, now);
  if (!proposed) return null;
  const current = monthsToGoal(goal);
  return {
    ...proposed,
    monthsSooner: current === null ? 0 : Math.max(0, current - proposed.months),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — 6 new tests.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck && pnpm lint && pnpm test
git add src/lib/goal-projection.ts src/lib/finance.test.ts
git commit -m "feat(goals): add finish-date and what-if projection"
```

---

### Task 6: AllocationSheet component

The splitter. One component, three entry points.

**Files:**
- Create: `src/features/goals/allocation-sheet.tsx`
- Read first for conventions: `src/components/ui/modal.tsx`, `src/features/expenses/expense-form.tsx`

**Interfaces:**
- Consumes: `useFinanceStore` (`goals`, `accounts`, `allocate`), `accountFree` and `goalSaved` from `src/lib/allocations.ts`, `formatMoney` from `src/lib/utils.ts`
- Produces:
  ```ts
  export function AllocationSheet(props: {
    open: boolean;
    onClose: () => void;
    accountId: string;
    amount?: number;      // omit to allocate the account's whole free balance
    transferId?: string;
    title?: string;
  }): JSX.Element | null
  ```

- [ ] **Step 1: Read the existing modal and form conventions**

Run: `cat src/components/ui/modal.tsx src/features/expenses/expense-form.tsx`

Match the modal wrapper, button placement, and label patterns used there. Do not invent a new dialog.

- [ ] **Step 2: Implement the component**

Create `src/features/goals/allocation-sheet.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { accountFree, goalSaved } from "@/lib/allocations";
import { useFinanceStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";
import { useMemo, useState } from "react";

export function AllocationSheet({
  open,
  onClose,
  accountId,
  amount,
  transferId,
  title,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  amount?: number;
  transferId?: string;
  title?: string;
}) {
  const goals = useFinanceStore((state) => state.goals);
  const accounts = useFinanceStore((state) => state.accounts);
  const allocate = useFinanceStore((state) => state.allocate);
  const currency = useFinanceStore((state) => state.profile.currency);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const account = accounts.find((candidate) => candidate.id === accountId);
  const available = amount ?? (account ? accountFree(goals, account) : 0);
  const assigned = useMemo(
    () => Object.values(draft).reduce((sum, value) => sum + (value || 0), 0),
    [draft],
  );
  const left = available - assigned;

  if (!account) return null;

  function setAmount(goalId: string, next: number) {
    const others = Object.entries(draft)
      .filter(([id]) => id !== goalId)
      .reduce((sum, [, value]) => sum + (value || 0), 0);
    const clamped = Math.max(0, Math.min(next, available - others));
    setDraft((current) => ({ ...current, [goalId]: clamped }));
    setError(null);
  }

  function save() {
    const entries = Object.entries(draft)
      .map(([goalId, value]) => ({ goalId, amount: value || 0 }))
      .filter((entry) => entry.amount > 0);
    const result = allocate(entries, accountId, transferId);
    if (!result.ok) {
      setError(result.reason ?? "Could not save this split.");
      return;
    }
    setDraft({});
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title ?? "What is this money for?"}>
      <p className="text-sm text-muted">
        {formatMoney(available, currency)} available in {account.bankName}
      </p>

      <div className="mt-4 space-y-4">
        {goals.length === 0 && (
          <p className="text-sm text-muted">Create a goal first, then you can assign money to it.</p>
        )}
        {goals.map((goal) => (
          <div key={goal.id}>
            <Label htmlFor={`allocate-${goal.id}`}>{goal.name}</Label>
            <Input
              id={`allocate-${goal.id}`}
              type="number"
              inputMode="numeric"
              min={0}
              value={draft[goal.id] || ""}
              onChange={(event) => setAmount(goal.id, Number(event.target.value))}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted">
              {formatMoney(goalSaved(goal), currency)} of {formatMoney(goal.target, currency)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-1 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">Left to assign</span>
          <span className={left === 0 ? "font-semibold text-success" : "font-semibold"}>
            {formatMoney(left, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">Free in {account.bankName} after this</span>
          <span>{formatMoney(accountFree(goals, account) - assigned, currency)}</span>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Skip for now
        </Button>
        <Button type="button" className="flex-1" onClick={save} disabled={assigned <= 0}>
          Save split
        </Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Confirm the sheet renders**

`Modal` takes `{ open, onClose, title, children, className }` (verified at `src/components/ui/modal.tsx:10-22`), which is exactly what Step 2 uses — no adaptation needed. Do not modify `modal.tsx`.

Run: `pnpm dev` and confirm the file compiles. The sheet has no entry point until Task 7, so there is nothing to click yet.

- [ ] **Step 4: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm build
git add src/features/goals/allocation-sheet.tsx
git commit -m "feat(goals): add allocation splitter sheet"
```

---

### Task 7: Dashboard Add menu

**Files:**
- Modify: `src/features/dashboard/dashboard-view.tsx` (the `addOpen` state at line 50, the Add button at lines 86-88, the trailing `<ExpenseForm>` at line 404)
- Read first: `src/components/topbar.tsx:160-237` for the existing `DropdownMenuPrimitive` pattern

**Interfaces:**
- Consumes: `AllocationSheet` from `src/features/goals/allocation-sheet.tsx`
- Produces: no exports; UI only.

- [ ] **Step 1: Read the existing dropdown pattern**

Run: `sed -n '160,237p' src/components/topbar.tsx`

Reuse `DropdownMenuPrimitive.Root` / `Trigger` / `Portal` / `Content` with the same `className` values so the menu matches the account menu.

- [ ] **Step 2: Replace the Add button with a menu**

In `src/features/dashboard/dashboard-view.tsx`, add state beside the existing `addOpen`:

```tsx
  const [allocateOpen, setAllocateOpen] = useState(false);
  const savingsAccount = accounts.find(
    (account) => account.status === "active" && account.defaultFor?.includes("savings"),
  ) ?? accounts.find((account) => account.status === "active");
```

Replace the Add button (lines 86-88) with:

```tsx
          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                data-slot="dropdown-menu-content"
                align="end"
                sideOffset={8}
                collisionPadding={12}
                className="z-50 min-w-48 rounded-2xl bg-surface p-1.5 text-foreground card-shadow outline-none"
              >
                <DropdownMenuPrimitive.Item asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddOpen(true)}
                    className="w-full justify-start outline-none"
                  >
                    Expense
                  </Button>
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Item asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!savingsAccount}
                    onClick={() => setAllocateOpen(true)}
                    className="w-full justify-start outline-none"
                  >
                    Save to goal
                  </Button>
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Item asChild>
                  <Link
                    href="/accounts"
                    className="flex cursor-pointer rounded-sm px-3 py-2 text-sm outline-none focus:bg-surface-2"
                  >
                    Transfer money
                  </Link>
                </DropdownMenuPrimitive.Item>
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>
```

Add the imports this needs to the top of the file:

```tsx
import { AllocationSheet } from "@/features/goals/allocation-sheet";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
```

`Plus` and `Button` are already imported in this file; confirm before adding duplicates.

Beside the existing `<ExpenseForm ... />` at line 404, render:

```tsx
      {savingsAccount && (
        <AllocationSheet
          open={allocateOpen}
          onClose={() => setAllocateOpen(false)}
          accountId={savingsAccount.id}
          title="Save to a goal"
        />
      )}
```

Income is intentionally **not** in this menu: there is no income form component in the codebase today, and adding one is out of scope for this plan.

- [ ] **Step 3: Verify by hand**

Run: `pnpm dev`, open `http://localhost:3000/dashboard`, click **Add**. Confirm three items appear, **Save to goal** opens the sheet, and the sheet's "Left to assign" counter updates as you type.

- [ ] **Step 4: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add src/features/dashboard/dashboard-view.tsx
git commit -m "feat(dashboard): add menu with save-to-goal entry"
```

---

### Task 8: Account card — free balance, over-allocation, safe close

**Files:**
- Modify: `src/features/accounts/accounts-view.tsx` (account card rendering; the closing-account block at lines 253-300; `completeAccountTransfer` usage at line 417)
- Modify: `src/lib/store.ts` (`completeAccountTransfer`)
- Test: `src/lib/finance.test.ts`

**Interfaces:**
- Consumes: `accountAllocated`, `accountFree`, `isOverAllocated` from `src/lib/allocations.ts`; `reassignAllocations` from the store; `AllocationSheet` from Task 6.

- [ ] **Step 1: Write the failing test for close-time reassignment**

Append to `src/lib/finance.test.ts`:

```ts
describe("closing an account with allocations", () => {
  it("keeps every rupee when allocations move to the destination", () => {
    const goals: Goal[] = [
      {
        id: "bike", name: "Bike", type: "Bike", target: 85000, saved: 0,
        monthlyContribution: 8000,
        contributions: [
          { id: "c1", amount: 10000, date: "2026-08-01", accountId: "hdfc" },
          { id: "c2", amount: 489, date: "2026-08-02", accountId: "union" },
        ],
      },
    ];
    const moved = reassignGoalAccounts(goals, "hdfc", "union");
    expect(accountAllocated(moved, "union")).toBe(10489);
    expect(accountAllocated(moved, "hdfc")).toBe(0);
    expect(goalSaved(moved[0])).toBe(10489);
  });
});
```

- [ ] **Step 2: Run test to verify it passes already**

Run: `pnpm test`
Expected: PASS — `reassignGoalAccounts` was built in Task 3. This test locks in the behaviour the UI depends on.

- [ ] **Step 3: Reassign allocations when a transfer completes**

In `src/lib/store.ts`, find `completeAccountTransfer`. After the balances are applied, when the transfer's **source** account has `status === "closing"`, call the reassignment so goal money follows the money:

```ts
        const source = get().accounts.find((a) => a.id === transfer.sourceAccountId);
        if (source?.status === "closing") {
          get().reassignAllocations(transfer.sourceAccountId, transfer.destinationAccountId);
        }
```

- [ ] **Step 4: Show free and locked money on each account card**

In `src/features/accounts/accounts-view.tsx`, inside the account card, add below the balance:

```tsx
              {(() => {
                const locked = accountAllocated(goals, account.id);
                const free = accountFree(goals, account);
                if (locked <= 0) return null;
                return (
                  <div className="mt-3">
                    <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="bg-primary"
                        style={{ width: `${Math.min(100, (locked / Math.max(account.balance, 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-muted">
                        {formatMoney(locked, currency)} locked to goals
                      </span>
                      <span className={free < 0 ? "font-medium text-danger" : "text-muted"}>
                        {formatMoney(free, currency)} free
                      </span>
                    </div>
                  </div>
                );
              })()}
```

Read the file first to confirm `goals` and `currency` are in scope in that component; if not, pull them from `useFinanceStore` the same way the file already reads `accounts`.

- [ ] **Step 5: Add the over-allocated banner**

Where the account card renders, when `isOverAllocated(goals, account)` is true, show above the balance:

```tsx
                <p role="alert" className="mb-3 rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
                  Goals claim more than this account holds. Lower a goal amount or raise the balance.
                </p>
```

- [ ] **Step 6: Block closing an account that still holds goal money**

In the closing-account block (lines 253-300), when `accountAllocated(goals, account.id) > 0` and no completed transfer has moved it, disable the close action and show:

```tsx
                  <p className="text-xs text-muted">
                    {formatMoney(accountAllocated(goals, account.id), currency)} of goal money is
                    still here. Complete the transfer to {account.plannedTransferTo || "another account"} to
                    move it.
                  </p>
```

- [ ] **Step 7: Verify by hand**

Run: `pnpm dev`, open `http://localhost:3000/accounts`. Create the user's scenario — Union Bank at ₹10,569 with ₹10,000 to Bike and ₹489 to Mobile — and confirm the card reads **₹10,489 locked to goals · ₹80 free**.

- [ ] **Step 8: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add src/features/accounts/accounts-view.tsx src/lib/store.ts src/lib/finance.test.ts
git commit -m "feat(accounts): show locked and free money, guard account close"
```

---

### Task 9: Goal card — held-in, finish date, what-if slider

**Files:**
- Modify: `src/features/goals/goals-view.tsx` (form at lines 60-71 and 166-171; card at lines 213-273)
- Modify: `src/features/dashboard/dashboard-view.tsx` (lines 360-397, the `topGoal` and `emergency` blocks)

**Interfaces:**
- Consumes: `goalSaved`, `goalAccountBreakdown` from `src/lib/allocations.ts`; `projectGoal`, `whatIfDelta` from `src/lib/goal-projection.ts`

- [ ] **Step 1: Remove the hand-entered saved amount**

In `src/features/goals/goals-view.tsx`:
- Delete the "Already saved" `Label` + `Input` (lines 166-171).
- Remove `saved` from the form state and from the `addGoal` / `updateGoal` payloads (lines 60-61, 71). New goals start at zero and are funded by allocating real money.
- Delete the Emergency Fund special case at line 113 (`? { ...g, saved: savingsAccount.balance }`). That goal now behaves like every other one.

- [ ] **Step 2: Read totals through the selector**

Replace every `goal.saved` read in the card (lines 213, 214, 252, 260) with `goalSaved(goal)`. Assign it once at the top of the card component:

```tsx
  const saved = goalSaved(goal);
  const pct = goal.target > 0 ? Math.min(100, (saved / goal.target) * 100) : 0;
  const done = saved >= goal.target;
```

Do the same in `src/features/dashboard/dashboard-view.tsx` at lines 360, 367, 370, 381, 387, 394 and 397 — replace `topGoal.saved` and `emergency.saved` with `goalSaved(topGoal)` and `goalSaved(emergency)`.

- [ ] **Step 3: Show where the money is**

In the goal card, below the progress bar:

```tsx
        {goalAccountBreakdown(goal).map((slice) => {
          const account = accounts.find((candidate) => candidate.id === slice.accountId);
          return (
            <p key={slice.accountId ?? "unassigned"} className="mt-1 text-xs text-muted">
              {account
                ? `Held in ${account.bankName}: ${formatMoney(slice.amount, currency)}`
                : `${formatMoney(slice.amount, currency)} not linked to an account`}
            </p>
          );
        })}
```

Pull `accounts` from `useFinanceStore` in that component if it is not already in scope.

- [ ] **Step 4: Show the finish date**

Replace the existing `goal.monthlyContribution > 0` branch (around line 273) with:

```tsx
        {(() => {
          const projection = projectGoal(goal);
          if (!projection) {
            return (
              <p className="mt-2 text-xs text-muted">
                Set a monthly amount to see a finish date.
              </p>
            );
          }
          return (
            <p className="mt-2 text-xs text-muted">
              At {formatMoney(goal.monthlyContribution, currency)}/month → done {projection.label}
            </p>
          );
        })()}
```

- [ ] **Step 5: Add the what-if slider**

Add local state in the goal card and render below the finish date. It writes nothing until the user confirms:

```tsx
  const [whatIf, setWhatIf] = useState<number | null>(null);
  const proposal = whatIf === null ? null : whatIfDelta(goal, whatIf);
```

```tsx
        {goal.monthlyContribution > 0 && (
          <div className="mt-3">
            <Label htmlFor={`whatif-${goal.id}`}>What if I save more?</Label>
            <input
              id={`whatif-${goal.id}`}
              type="range"
              min={goal.monthlyContribution}
              max={goal.monthlyContribution * 3}
              step={500}
              value={whatIf ?? goal.monthlyContribution}
              onChange={(event) => setWhatIf(Number(event.target.value))}
              className="w-full accent-primary"
            />
            {proposal && proposal.monthsSooner > 0 && (
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-xs text-muted">
                  {formatMoney(whatIf ?? 0, currency)}/month → done {proposal.label},{" "}
                  {proposal.monthsSooner} months sooner
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateGoal(goal.id, { monthlyContribution: whatIf ?? goal.monthlyContribution });
                    setWhatIf(null);
                  }}
                >
                  Make this my plan
                </Button>
              </div>
            )}
          </div>
        )}
```

- [ ] **Step 6: Verify by hand**

Run: `pnpm dev`, open `http://localhost:3000/goals`. Confirm: no "Already saved" field, the card shows which account holds the money, a finish date appears, and dragging the slider shows a sooner date without changing the stored plan until **Make this my plan** is pressed.

- [ ] **Step 7: Verify and commit**

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
git add src/features/goals/goals-view.tsx src/features/dashboard/dashboard-view.tsx
git commit -m "feat(goals): show held-in accounts, finish date and what-if"
```

---

## Deferred from the spec

These spec items are intentionally **not** in the tasks above. Each needs its own plan:

- **Goal deletion returns money to free.** `deleteGoal` already moves the goal to the recycle bin with its contributions intact, so allocations disappear from `accountAllocated` automatically and restore correctly. Verify this during Task 3 review; if the recycle-bin restore path drops contributions, that becomes a follow-up task.
- **Transfer deletion unwinds its contributions.** Requires a `deleteAccountTransfer` path that does not exist in the store today.
- **Over-funded goal surplus move action.** The over-funded state displays correctly through `goalSaved`, but the "move the surplus elsewhere" action is additional scope.

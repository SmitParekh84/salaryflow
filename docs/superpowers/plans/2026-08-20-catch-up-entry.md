# Catch-Up Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Find the days with no expense between a user's last entry and today, and walk them oldest-first with the date pre-filled, so a lapsed week can be caught up in one pass.

**Architecture:** Gap detection is a pure module, `src/lib/catch-up.ts`, taking expenses plus the reviewed-date list and returning a queue. State rides on `SalaryProfile`, which already syncs. The flow drives the existing `ExpenseForm` through one new optional prop and reads the store to learn whether a day got filled.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Zustand (persisted), Mongoose, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-20-catch-up-entry-design.md`

## Global Constraints

- **Days are local calendar days.** Convert with `localDateInputValue(parseFinancialDate(iso))` from `src/lib/utils.ts`. Never `new Date(iso).toISOString().slice(0,10)` — that files a late-night entry under the previous day.
- **Day keys are `YYYY-MM-DD` strings** and are compared with `<` / `<=` directly. Lexical order is chronological order for this format.
- **Only empty days are persisted.** A day with an expense drops out of the queue by itself and must never be written to `catchUpReviewedDates`.
- **`catchUpReviewedDates` is pruned to 90 days on every write.** Unpruned it grows without bound and is resent on every sync.
- **`catchUpDismissedUntil` names the day the card returns.** Hidden while `today < dismissedUntil`.
- **Never propose an amount, merchant, or category to fill a gap.** `PRODUCT.md` forbids inventing completed transactions.
- **The queue is frozen when the flow opens.** Marking a day reviewed changes the live queue; re-reading it mid-walk would shift the indices under the user.
- Default window: **7 days**. Reviewed-date retention: **90 days**.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm lint` before every commit.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/types.ts` (modify) | `SalaryProfile.catchUpReviewedDates` / `.catchUpDismissedUntil` |
| `src/server/models.ts` (modify) | Mongoose fields so they survive sync |
| `src/lib/catch-up.ts` (create) | Gap detection, dismissal, pruning, day labels. Pure |
| `src/lib/catch-up.test.ts` (create) | Enforces the spec |
| `src/lib/store.ts` (modify) | `markDayReviewed`, `dismissCatchUp` |
| `src/features/expenses/expense-form.tsx` (modify) | `defaultDate` prop |
| `src/features/expenses/catch-up-card.tsx` (create) | Dashboard card, dismissal, queue freeze |
| `src/features/expenses/catch-up-flow.tsx` (create) | Per-day modal walk |
| `src/features/dashboard/dashboard-view.tsx` (modify) | Mount the card |

---

### Task 1: Data model

**Files:**
- Modify: `src/lib/types.ts` (`SalaryProfile`)
- Modify: `src/server/models.ts` (`SalaryProfileSchema`)

**Interfaces:**
- Consumes: nothing.
- Produces: `SalaryProfile.catchUpReviewedDates?: string[]`, `SalaryProfile.catchUpDismissedUntil?: string`.

- [ ] **Step 1: Add the fields**

In `src/lib/types.ts`, in `interface SalaryProfile` after `vehicle`:

```ts
  /** Local dates ("2026-08-17") the user marked as no-spend. Pruned to 90 days. */
  catchUpReviewedDates?: string[];
  /** Local date the dashboard catch-up card reappears on. Set by its dismiss control. */
  catchUpDismissedUntil?: string;
```

In `src/server/models.ts`, in `SalaryProfileSchema` after `vehicle`:

```ts
    catchUpReviewedDates: [String],
    catchUpDismissedUntil: String,
```

`src/app/api/sync/route.ts` passes `body.profile` through wholesale minus
`RESERVED`, so both sync with no route change.

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/server/models.ts
git commit -m "feat(catch-up): remember which empty days the user has answered for"
```

---

### Task 2: Gap detection

**Files:**
- Create: `src/lib/catch-up.ts`
- Test: `src/lib/catch-up.test.ts`

**Interfaces:**
- Consumes: `Expense` (existing), `localDateInputValue` / `parseFinancialDate` from `src/lib/utils.ts`.
- Produces:
  - `CATCH_UP_WINDOW_DAYS = 7`, `REVIEWED_RETENTION_DAYS = 90`
  - `interface CatchUpQueue { days: string[]; olderCount: number; lastRecordedDay: string | null }`
  - `dayKey(iso: string): string`
  - `expensesOnDay(expenses: Expense[], day: string): Expense[]`
  - `missingDays(input: { expenses; reviewedDates?; today?; limit? }): CatchUpQueue`
  - `isDismissed(dismissedUntil: string | undefined, today?: Date): boolean`
  - `pruneReviewedDates(dates: string[], today?: Date, keepDays?: number): string[]`
  - `dayLabel(day: string, today?: Date): string`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/catch-up.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  dayKey,
  dayLabel,
  expensesOnDay,
  isDismissed,
  missingDays,
  pruneReviewedDates,
} from "./catch-up";
import type { Expense } from "./types";

/**
 * Built from local Y/M/D so the suite gives the same answer in every timezone.
 * Writing a literal "…T00:25:00.000Z" would pass in IST and fail in UTC-5.
 */
function localIso(year: number, month: number, day: number, hour = 9, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function expense(id: string, iso: string, amount = 100): Expense {
  return { id, amount, category: "Food", paymentMethod: "UPI", date: iso };
}

const AUG_20 = new Date(2026, 7, 20, 10, 0);

describe("dayKey", () => {
  it("files a timestamp under its local day", () => {
    expect(dayKey(localIso(2026, 8, 20, 0, 25))).toBe("2026-08-20");
    expect(dayKey(localIso(2026, 8, 20, 23, 55))).toBe("2026-08-20");
  });

  it("accepts a date-only value unchanged", () => {
    expect(dayKey("2026-08-20")).toBe("2026-08-20");
  });
});

describe("missingDays", () => {
  it("returns nothing when no expense was ever recorded", () => {
    expect(missingDays({ expenses: [], today: AUG_20 })).toEqual({
      days: [],
      olderCount: 0,
      lastRecordedDay: null,
    });
  });

  it("walks the gap oldest first and includes today", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 8, 16))],
      today: AUG_20,
    });

    expect(queue.lastRecordedDay).toBe("2026-08-16");
    expect(queue.days).toEqual(["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20"]);
    expect(queue.olderCount).toBe(0);
  });

  it("leaves out a day that already has an expense", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 8, 16)), expense("b", localIso(2026, 8, 18))],
      today: AUG_20,
    });

    expect(queue.days).toEqual(["2026-08-17", "2026-08-19", "2026-08-20"]);
  });

  it("leaves out a day the user already called empty", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 8, 16))],
      reviewedDates: ["2026-08-17", "2026-08-19"],
      today: AUG_20,
    });

    expect(queue.days).toEqual(["2026-08-18", "2026-08-20"]);
  });

  it("caps a long absence and reports the remainder", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 7, 20))],
      today: AUG_20,
    });

    expect(queue.days).toHaveLength(7);
    expect(queue.days[0]).toBe("2026-07-21");
    expect(queue.olderCount).toBe(24); // 21 Jul – 20 Aug inclusive is 31 days
  });

  it("enumerates across a month boundary", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 7, 30))],
      today: new Date(2026, 7, 2, 10, 0),
    });

    expect(queue.days).toEqual(["2026-07-31", "2026-08-01", "2026-08-02"]);
  });

  it("does not let a post-dated expense collapse the window", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 8, 16)), expense("future", localIso(2026, 9, 30))],
      today: AUG_20,
    });

    expect(queue.lastRecordedDay).toBe("2026-08-16");
    expect(queue.days).toEqual(["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20"]);
  });

  it("returns nothing when the last entry is today", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 8, 20))],
      today: AUG_20,
    });

    expect(queue.days).toEqual([]);
  });

  it("files a late-night expense under its own day, not the one before", () => {
    const queue = missingDays({
      expenses: [expense("a", localIso(2026, 8, 19, 0, 25))],
      today: AUG_20,
    });

    // The 19th is recorded, so only the 20th is outstanding.
    expect(queue.days).toEqual(["2026-08-20"]);
  });
});

describe("expensesOnDay", () => {
  it("matches on the local day", () => {
    const late = expense("a", localIso(2026, 8, 20, 0, 25));
    const other = expense("b", localIso(2026, 8, 21));

    expect(expensesOnDay([late, other], "2026-08-20").map((item) => item.id)).toEqual(["a"]);
  });
});

describe("isDismissed", () => {
  it("hides the card for the rest of the day it was dismissed on", () => {
    expect(isDismissed("2026-08-21", AUG_20)).toBe(true);
  });

  it("shows it again once that date arrives", () => {
    expect(isDismissed("2026-08-20", AUG_20)).toBe(false);
    expect(isDismissed("2026-08-19", AUG_20)).toBe(false);
  });

  it("is not dismissed when nothing was ever set", () => {
    expect(isDismissed(undefined, AUG_20)).toBe(false);
  });
});

describe("pruneReviewedDates", () => {
  it("drops entries older than the retention window and keeps the rest", () => {
    const kept = pruneReviewedDates(["2026-08-17", "2026-01-01"], AUG_20);
    expect(kept).toEqual(["2026-08-17"]);
  });

  it("removes duplicates and sorts", () => {
    expect(pruneReviewedDates(["2026-08-18", "2026-08-17", "2026-08-18"], AUG_20)).toEqual([
      "2026-08-17",
      "2026-08-18",
    ]);
  });
});

describe("dayLabel", () => {
  it("calls today Today rather than dating it", () => {
    expect(dayLabel("2026-08-20", AUG_20)).toBe("Today");
  });

  it("names the weekday for any other day", () => {
    expect(dayLabel("2026-08-17", AUG_20)).toContain("Aug");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/lib/catch-up.test.ts`
Expected: FAIL — `Failed to resolve import "./catch-up"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/catch-up.ts`:

```ts
import type { Expense } from "./types";
import { localDateInputValue, parseFinancialDate } from "./utils";

/** How many missing days one pass through the flow offers. */
export const CATCH_UP_WINDOW_DAYS = 7;
/** How long a "nothing spent" answer is kept before it is forgotten. */
export const REVIEWED_RETENTION_DAYS = 90;

export interface CatchUpQueue {
  /** Missing days, oldest first, capped at the window. */
  days: string[];
  /** Missing days beyond the window. */
  olderCount: number;
  lastRecordedDay: string | null;
}

/**
 * The local calendar day a timestamp belongs to.
 *
 * Going through `parseFinancialDate` matters: slicing an ISO string would file
 * an expense recorded at 00:25 under the previous day for anyone east of UTC,
 * and the whole feature is about which days are empty.
 */
export function dayKey(iso: string): string {
  return localDateInputValue(parseFinancialDate(iso));
}

export function expensesOnDay(expenses: Expense[], day: string): Expense[] {
  return expenses.filter((expense) => dayKey(expense.date) === day);
}

/**
 * Days between the last recorded expense and today that hold nothing.
 *
 * Bounded at `limit` so returning from a month away offers a week's work rather
 * than a wall of thirty prompts; the rest is reported as `olderCount` and
 * offered once the first pass is done.
 */
export function missingDays({
  expenses,
  reviewedDates = [],
  today = new Date(),
  limit = CATCH_UP_WINDOW_DAYS,
}: {
  expenses: Expense[];
  reviewedDates?: string[];
  today?: Date;
  limit?: number;
}): CatchUpQueue {
  const todayKey = localDateInputValue(today);
  const recorded = new Set<string>();
  let lastRecordedDay: string | null = null;

  for (const expense of expenses) {
    const day = dayKey(expense.date);
    recorded.add(day);
    // A post-dated entry is not evidence of a day already handled, and letting
    // it become `lastRecordedDay` would collapse the window to nothing.
    if (day > todayKey) continue;
    if (lastRecordedDay === null || day > lastRecordedDay) lastRecordedDay = day;
  }

  // Someone who has never recorded anything is not behind on anything. Without
  // this, a fresh signup would be asked about days before they joined.
  if (lastRecordedDay === null) return { days: [], olderCount: 0, lastRecordedDay: null };

  const reviewed = new Set(reviewedDates);
  const missing: string[] = [];
  const cursor = parseFinancialDate(lastRecordedDay);
  cursor.setDate(cursor.getDate() + 1);

  // `parseFinancialDate` anchors at midday, so stepping a day at a time crosses
  // a daylight-saving boundary without landing on the wrong date.
  while (localDateInputValue(cursor) <= todayKey) {
    const day = localDateInputValue(cursor);
    if (!recorded.has(day) && !reviewed.has(day)) missing.push(day);
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    days: missing.slice(0, limit),
    olderCount: Math.max(0, missing.length - limit),
    lastRecordedDay,
  };
}

/** The field names the day the card returns, so it is hidden strictly before it. */
export function isDismissed(dismissedUntil: string | undefined, today = new Date()): boolean {
  if (!dismissedUntil) return false;
  return localDateInputValue(today) < dismissedUntil;
}

/**
 * Reviewed dates worth keeping.
 *
 * This list is pushed on every sync. Unpruned it would grow by up to 365 strings
 * a year and be resent in full for the life of the account, to answer a question
 * nobody asks about a day months gone.
 */
export function pruneReviewedDates(
  dates: string[],
  today = new Date(),
  keepDays = REVIEWED_RETENTION_DAYS,
): string[] {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffKey = localDateInputValue(cutoff);

  return Array.from(new Set(dates.filter((date) => date >= cutoffKey))).sort();
}

/** "Today" for the current day, "Mon, 17 Aug" for any other. */
export function dayLabel(day: string, today = new Date()): string {
  if (day === localDateInputValue(today)) return "Today";
  return parseFinancialDate(day).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/lib/catch-up.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/catch-up.ts src/lib/catch-up.test.ts
git commit -m "feat(catch-up): find the days between the last entry and today that hold nothing"
```

---

### Task 3: Store actions

**Files:**
- Modify: `src/lib/store.ts` (the `FinanceState` interface and the store body)

**Interfaces:**
- Consumes: `pruneReviewedDates` (Task 2), `localDateInputValue`.
- Produces: `markDayReviewed(date: string): void`, `dismissCatchUp(): void`.

- [ ] **Step 1: Declare the actions**

In the `FinanceState` interface, after the expenses block:

```ts
  // catch-up
  markDayReviewed: (date: string) => void;
  dismissCatchUp: () => void;
```

- [ ] **Step 2: Implement them**

Add the import:

```ts
import { pruneReviewedDates } from "./catch-up";
```

In the store body, after `toggleFavorite`:

```ts
      markDayReviewed: (date) => {
        set((state) => ({
          profile: {
            ...state.profile,
            catchUpReviewedDates: pruneReviewedDates([
              ...(state.profile.catchUpReviewedDates ?? []),
              date,
            ]),
          },
        }));
        get().queueSync();
      },
      dismissCatchUp: () => {
        // The field names the day the card returns, so dismissing puts it
        // beyond today rather than on it.
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        set((state) => ({
          profile: { ...state.profile, catchUpDismissedUntil: localDateInputValue(tomorrow) },
        }));
        get().queueSync();
      },
```

Add `localDateInputValue` to the existing `./utils` import.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat(catch-up): record a no-spend day and dismiss the prompt"
```

---

### Task 4: `defaultDate` on the expense form

**Files:**
- Modify: `src/features/expenses/expense-form.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ExpenseForm` accepts `defaultDate?: string` (a `YYYY-MM-DD` value).

- [ ] **Step 1: Accept the prop**

Extend the component signature:

```tsx
export function ExpenseForm({
  open,
  onClose,
  editing,
  sharedMode = false,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Expense | null;
  sharedMode?: boolean;
  /** Seeds the date field for a new expense. Still editable — a user who
      realises the spend was actually the next day should not have to start
      over. */
  defaultDate?: string;
}) {
```

- [ ] **Step 2: Use it**

In the non-editing branch of the `reset()` call, replace

```ts
                date: localDateInputValue(),
```

with

```ts
                date: defaultDate ?? localDateInputValue(),
```

Add `defaultDate` to that `useEffect`'s dependency array.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors. Every existing call site omits the prop and is unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/features/expenses/expense-form.tsx
git commit -m "feat(catch-up): let a caller seed the expense date"
```

---

### Task 5: The card and the flow

**Files:**
- Create: `src/features/expenses/catch-up-card.tsx`
- Create: `src/features/expenses/catch-up-flow.tsx`
- Modify: `src/features/dashboard/dashboard-view.tsx`

**Interfaces:**
- Consumes: `missingDays`, `isDismissed`, `dayLabel`, `expensesOnDay` (Task 2); `markDayReviewed`, `dismissCatchUp` (Task 3); `ExpenseForm` `defaultDate` (Task 4).
- Produces: `CatchUpCard`.

- [ ] **Step 1: Build the flow**

Create `src/features/expenses/catch-up-flow.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { dayLabel, expensesOnDay } from "@/lib/catch-up";
import { useFinanceStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";
import { useState } from "react";

/**
 * Walks a frozen list of missing days, oldest first.
 *
 * `days` is a snapshot taken when the flow opened, never the live queue.
 * Marking a day reviewed removes it from the live queue, and re-reading it
 * mid-walk would shift every remaining index under the user.
 */
export function CatchUpFlow({
  days,
  olderCount,
  onContinue,
  onClose,
}: {
  days: string[];
  olderCount: number;
  onContinue: () => void;
  onClose: () => void;
}) {
  const expenses = useFinanceStore((state) => state.expenses);
  const currency = useFinanceStore((state) => state.profile.currency);
  const markDayReviewed = useFinanceStore((state) => state.markDayReviewed);
  const [index, setIndex] = useState(0);
  const [formOpen, setFormOpen] = useState(false);

  const day = days[index];
  const done = day === undefined;
  // Asked of the data rather than tracked in state: ExpenseForm closes the same
  // way whether it saved or was cancelled, and a day filled from anywhere else
  // counts just as much.
  const recorded = day ? expensesOnDay(expenses, day) : [];

  const advance = () => setIndex((current) => current + 1);

  return (
    <>
      <Modal open={!formOpen} onClose={onClose} title={done ? "All caught up" : "Catch up"}>
        {done ? (
          <div className="space-y-4">
            <p className="text-sm">
              Every day up to today is accounted for.
              {olderCount > 0 &&
                ` There ${olderCount === 1 ? "is" : "are"} still ${olderCount} older ${
                  olderCount === 1 ? "day" : "days"
                } further back.`}
            </p>
            <ModalFooter>
              <Button variant="secondary" onClick={onClose}>
                Finish
              </Button>
              {olderCount > 0 && <Button onClick={onContinue}>Keep going</Button>}
            </ModalFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Day {index + 1} of {days.length}
            </p>

            {recorded.length === 0 ? (
              <p className="text-base font-medium">Anything on {dayLabel(day)}?</p>
            ) : (
              <div className="space-y-2">
                <p className="text-base font-medium">{dayLabel(day)} recorded</p>
                <ul className="space-y-1 text-sm text-muted">
                  {recorded.map((expense) => (
                    <li key={expense.id}>
                      {formatMoney(expense.amount, currency)} · {expense.merchant || expense.category}
                    </li>
                  ))}
                </ul>
                <p className="pt-1 text-sm">Anything else on {dayLabel(day)}?</p>
              </div>
            )}

            <ModalFooter>
              <Button variant="secondary" onClick={onClose}>
                Stop for now
              </Button>
              {recorded.length === 0 && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    markDayReviewed(day);
                    advance();
                  }}
                >
                  Nothing spent
                </Button>
              )}
              {recorded.length > 0 && (
                <Button variant="secondary" onClick={advance}>
                  Done
                </Button>
              )}
              <Button onClick={() => setFormOpen(true)}>
                {recorded.length === 0 ? "Add expense" : "Add another"}
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      <ExpenseForm open={formOpen} onClose={() => setFormOpen(false)} defaultDate={day} />
    </>
  );
}
```

- [ ] **Step 2: Build the card**

Create `src/features/expenses/catch-up-card.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CatchUpFlow } from "@/features/expenses/catch-up-flow";
import { isDismissed, missingDays } from "@/lib/catch-up";
import { useFinanceStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { CalendarClock, X } from "lucide-react";
import { useMemo, useState } from "react";

export function CatchUpCard() {
  const expenses = useFinanceStore((state) => state.expenses);
  const reviewedDates = useFinanceStore((state) => state.profile.catchUpReviewedDates);
  const dismissedUntil = useFinanceStore((state) => state.profile.catchUpDismissedUntil);
  const dismissCatchUp = useFinanceStore((state) => state.dismissCatchUp);
  const [session, setSession] = useState<{ days: string[]; olderCount: number } | null>(null);

  const queue = useMemo(
    () => missingDays({ expenses, reviewedDates }),
    [expenses, reviewedDates],
  );

  const open = () => setSession({ days: queue.days, olderCount: queue.olderCount });

  if (queue.days.length === 0 || isDismissed(dismissedUntil)) {
    // The flow stays mounted while it is running: emptying the queue is exactly
    // what finishing looks like, and unmounting mid-walk would close it.
    return session ? (
      <CatchUpFlow
        days={session.days}
        olderCount={session.olderCount}
        onContinue={open}
        onClose={() => setSession(null)}
      />
    ) : null;
  }

  const count = queue.days.length;

  return (
    <>
      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {count} {count === 1 ? "day" : "days"} not recorded
            </p>
            {queue.lastRecordedDay && (
              <p className="mt-0.5 text-xs text-muted">
                Last entry {formatDate(queue.lastRecordedDay)}
              </p>
            )}
            <Button size="sm" className="mt-3" onClick={open}>
              Catch up
            </Button>
          </div>
          <button
            type="button"
            aria-label="Hide until tomorrow"
            className="shrink-0 rounded-lg p-1 text-muted hover:bg-surface-2"
            onClick={dismissCatchUp}
          >
            <X className="h-4 w-4" />
          </button>
        </CardContent>
      </Card>

      {session && (
        <CatchUpFlow
          days={session.days}
          olderCount={session.olderCount}
          onContinue={open}
          onClose={() => setSession(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Mount it**

In `src/features/dashboard/dashboard-view.tsx`, import `CatchUpCard` from
`@/features/expenses/catch-up-card` and render `<CatchUpCard />` immediately
above the stat row, so it is the first thing on the page. It returns `null` on
its own when there is nothing outstanding.

- [ ] **Step 4: Verify the whole feature**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
Expected: all pass.

Run `pnpm dev` and check:
- With an expense dated four days ago and none since, the card offers four days.
- "Nothing spent" advances and, after a reload, that day is not offered again.
- Adding an expense switches the step to "Anything else?", and "Done" moves on.
- "Stop for now" leaves the card in place with the remaining days.
- The dismiss control hides the card, and it stays hidden across a reload.

- [ ] **Step 5: Commit**

```bash
git add src/features/expenses/catch-up-card.tsx src/features/expenses/catch-up-flow.tsx src/features/dashboard/dashboard-view.tsx
git commit -m "feat(catch-up): walk the missing days one at a time"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| Detection rules | 2 (`missingDays`) |
| Guards: no expenses ever, post-dated, dismissal, 7-day cap | 2 |
| Today last, labelled "Today" | 2 (`dayLabel`), 5 |
| State on `SalaryProfile`, 90-day pruning | 1, 2 (`pruneReviewedDates`), 3 |
| Flow: card → per-day → add / nothing spent / stop | 5 |
| Multiple expenses per day, then Done | 5 (`recorded.length > 0` branch) |
| "All caught up" and the older-days offer | 5 |
| Knowing when a day got filled | 5 (`expensesOnDay`) |
| `defaultDate` on `ExpenseForm` | 4 |
| Queue frozen at open | 5 (`session`) |
| Error handling: rejected save leaves the day unreviewed | 5 — `markDayReviewed` is only reached from "Nothing spent", never from a save |
| Testing list | 2 |

No gaps.

**Type consistency**

`CatchUpQueue` is produced by `missingDays` in Task 2 and destructured as
`{ days, olderCount, lastRecordedDay }` in Task 5. `dayLabel(day)` and
`expensesOnDay(expenses, day)` keep their Task 2 argument order at every call
site. `markDayReviewed(date)` takes the day key, matching its single caller.

**Deferred, per the spec:** backfilling income and bills, suggesting a category
from past weekday spending, a calendar heat view.

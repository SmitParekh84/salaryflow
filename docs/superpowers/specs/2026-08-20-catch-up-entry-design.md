# Catch-Up Entry — Design

Date: 2026-08-20
Status: Approved

## Purpose

A user who records expenses irregularly loses days. If their last entry was
16 Aug and they open the app on 20 Aug, nothing tells them the 17th, 18th and
19th are empty, and nothing helps them fill those days in.

Catch-up finds the gap, and walks the missing days oldest-first, one day at a
time, defaulting each new expense to that day's date.

## Non-goals

- **No new way to create an expense.** The flow drives the existing
  `ExpenseForm`; it only hands it a date. Anything the form validates today it
  still validates here.
- **No guessing what was spent.** The app never proposes an amount, a
  merchant, or a recurring entry to fill a gap. `PRODUCT.md` forbids inventing
  completed transactions, and a backfill prompt is exactly where that
  temptation lives.
- **No notifications or emails.** In-app only.
- **Not a streak or habit feature.** No scores, no chains, no shaming copy.

## Core principle: only empty days need remembering

A day with an expense removes itself from the queue — it is no longer missing.
The only state worth persisting is the set of days the user explicitly said
were empty. Without that, "nothing spent on 17 Aug" is unanswerable and the app
asks about the same empty day forever, which is precisely the nagging the
feature exists to avoid.

That keeps the stored state small, self-pruning against real data, and
meaningless to anything except this feature.

## Detection

A **missing day** is a local calendar day that:

1. falls in `[lastExpenseDay + 1, today]`,
2. contains no expense, and
3. is not in `catchUpReviewedDates`.

Days are local calendar days, derived with `parseFinancialDate` like every
other date in the app. This matters directly: a fill recorded at 00:25 on
20 Aug belongs to the 20th, and a UTC-based boundary would file it under the
19th and wrongly mark the 20th as missing.

### Guards

| Condition | Behaviour |
|---|---|
| No expenses ever recorded | Empty queue. A new user is never asked about days before they joined. |
| Expenses dated in the future | Ignored when finding the last recorded day, so a post-dated entry cannot collapse the window to nothing. |
| Today is before `catchUpDismissedUntil` | Card hidden; queue still computed for when it returns. The field names the day the card comes back, so `[×]` sets tomorrow and the card is gone for the rest of today. |
| Gap longer than 7 days | Queue is the 7 oldest missing days. The remainder is reported as a count and offered at the end. |

### Today

Today is the last entry in the queue, as requested. It is labelled "Today"
rather than "not recorded" — the day is not over, so its emptiness is not yet a
lapse. Everything else about the step is identical.

### The 7-day window

Returning after a month should not produce a thirty-step queue. The flow runs
the 7 oldest missing days, then reports how many older ones remain and offers
to continue. Choosing to continue loads the next 7.

## State

Two fields on `SalaryProfile`, which already syncs as `profile` and already
carries app-level settings like `customCategories`:

```ts
  /** Local dates ("2026-08-17") the user marked as no-spend. Pruned to 90 days. */
  catchUpReviewedDates?: string[];
  /** Local date the dashboard card reappears on. Set by the [×] control. */
  catchUpDismissedUntil?: string;
```

Riding the profile avoids introducing a new synced collection, with its own
tombstones and merge rules, for what is a short list of strings.

**Pruning to 90 days is required, not tidiness.** The list is pushed on every
sync; unbounded, it would grow by up to 365 strings a year and be resent in
full on every save for the life of the account.

## Flow

```text
Dashboard
┌────────────────────────────────────┐
│ ⏱  4 days not recorded              │
│    Last entry 16 Aug                │
│    [ Catch up ]             [ × ]   │──→ hidden until tomorrow
└────────────────────────────────────┘
              │ Catch up
              ↓  oldest first
    ┌──────────────────────────────────────┐
    │  Anything on Mon 17 Aug?             │
    │  Day 1 of 4                          │
    │  [ Add expense ]  [ Nothing spent ]  │
    │  [ Stop for now ]                    │
    └──────────────────────────────────────┘
         │                  │
         │ Add              │ Nothing spent
         ↓                  │   → date appended to reviewed list
   ExpenseForm,             │   → advance to 18 Aug
   date defaulted to        │
   17 Aug                   │
         │ saved            │
         ↓                  │
    ┌──────────────────────────────────────┐
    │  17 Aug ✓  ₹120 Lunch                │
    │  Anything else on 17 Aug?            │
    │  [ Add another ]  [ Done → 18 Aug ]  │
    └──────────────────────────────────────┘
         │ Done
         ↓
      18 Aug → 19 Aug → Today
         ↓
    ┌──────────────────────────────────────┐
    │  All caught up ✓                     │
    │  ( >7 missing: "23 older days too —  │
    │    keep going?" )                    │
    └──────────────────────────────────────┘
```

**Stop for now** closes the flow without touching the reviewed list. The
remaining days stay missing and the card stays on the dashboard, so the user
resumes where they left off rather than starting over.

The card is a card, not a modal: opening the app to check a balance must not be
blocked by a backfill prompt.

## Architecture

```text
src/lib/catch-up.ts   (pure)
  missingDays({ expenses, reviewedDates, dismissedUntil, today, limit })
    → { days: string[], olderCount: number, lastRecordedDay: string | null }

  ├─ CatchUpCard   dashboard, renders when days.length > 0
  └─ CatchUpFlow   modal state machine over days[]
        └─ ExpenseForm  defaultDate={currentDay}
```

### Modules

| Module | Path | Responsibility |
|---|---|---|
| Gap detection | `src/lib/catch-up.ts` | Pure. Expenses + reviewed dates + today → the queue. Where the bugs would be, so where the tests are. |
| Tests | `src/lib/catch-up.test.ts` | Enforces this document. |
| Card | `src/features/expenses/catch-up-card.tsx` | Dashboard entry point and dismissal. |
| Flow | `src/features/expenses/catch-up-flow.tsx` | Modal, per-day step, advance and completion. |
| Store actions | `src/lib/store.ts` | `markDayReviewed(date)`, `dismissCatchUp()`. Both write the profile and queue a sync. |

### Knowing when a day got filled

`ExpenseForm` calls `onClose` for both a successful save and a cancel, so a
callback cannot tell the flow which happened. The flow therefore asks the data
instead: after the form closes, a day with at least one expense has been filled.

This is not a workaround for a missing prop — it is the more truthful question.
It also covers a day filled from somewhere else entirely, which a save callback
would miss.

### Change to existing code

One optional prop on `ExpenseForm`:

```ts
defaultDate?: string   // "2026-08-17"
```

It seeds the `date` field in the existing `reset()` in place of
`localDateInputValue()`. The field stays editable — a user who realises the
expense was actually the 18th should not have to cancel out of the flow. When
absent, the form behaves exactly as it does today.

## Error handling

| Case | Behaviour |
|---|---|
| Expense save is rejected (insufficient balance) | The form's existing error shows; the day does not advance; nothing is written to the reviewed list |
| Sync fails after marking a day reviewed | Local state holds it and the standard debounced retry applies. Worst case the day is asked about again on another device — harmless and self-correcting |
| Reviewed date already present | Set semantics; no duplicate appended |
| System clock moves backwards across a day boundary | Queue shortens. No corruption: reviewed dates stay valid and reappear correctly when the clock is right |
| All days reviewed mid-flow on another device | Queue recomputes on next render and the flow closes to the completion step |

## Testing

`src/lib/catch-up.test.ts`, written before the implementation:

- No expenses ever → empty queue, no card.
- Gap of 3 days returns those 3 days plus today, oldest first.
- A day that has an expense is absent from the queue.
- A day in `catchUpReviewedDates` is absent from the queue.
- A 30-day gap returns 7 days and `olderCount` of the remainder.
- A gap spanning a month boundary enumerates correctly.
- `catchUpDismissedUntil` in the future yields a hidden card with a queue still
  computed; a past value yields a visible card.
- Future-dated expenses do not become `lastRecordedDay`.
- An expense timestamped 00:25 local falls on its local day, not the previous
  one.
- Reviewed-date pruning drops entries older than 90 days and keeps the rest.

## Deferred

- Backfilling income and bills through the same flow.
- Suggesting a likely category from what the user usually spends on that
  weekday — deliberately out of scope, see non-goals.
- A calendar heat view of recorded versus missing days.

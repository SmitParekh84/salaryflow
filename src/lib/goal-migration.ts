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

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

export function goalContributionStep(monthlyContribution: number): number {
  return Math.max(1, Math.round(monthlyContribution / 10));
}

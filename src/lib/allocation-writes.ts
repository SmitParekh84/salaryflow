import { accountAllocated } from "./allocations";
import type { BankAccount, Goal } from "./types";
import { uid } from "./utils";

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

  // Merge repeats before validating: the check sums every entry, but the write
  // takes one per goal, so two entries for the same goal would silently drop one.
  const merged = new Map<string, number>();
  for (const entry of entries) {
    if (entry.amount > 0) merged.set(entry.goalId, (merged.get(entry.goalId) ?? 0) + entry.amount);
  }
  const positive: AllocationEntry[] = Array.from(merged, ([goalId, amount]) => ({
    goalId,
    amount,
  }));
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
            id: uid("goal-contribution"),
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

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

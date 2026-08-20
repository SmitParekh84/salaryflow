import type { BankAccount, Goal } from "./types";

/** Total money saved into a goal. Account-backed goals track the live balance. */
export function goalSaved(goal: Goal, accounts: BankAccount[] = []): number {
  if (goal.balanceAccountId) {
    return accounts.find((account) => account.id === goal.balanceAccountId)?.balance ?? 0;
  }
  return (goal.contributions ?? []).reduce((sum, entry) => sum + entry.amount, 0);
}

/**
 * The account a "save to a goal" action should move money out of.
 *
 * The account someone marked as their savings account, or any active one if
 * they never marked it — an allocation has to come from somewhere, and the
 * sheet lets them change it. Returns undefined only when there is no active
 * account at all, which is what the callers disable the action on.
 */
export function defaultSavingsAccount(accounts: BankAccount[]): BankAccount | undefined {
  return (
    accounts.find(
      (account) => account.status === "active" && account.defaultFor?.includes("savings"),
    ) ?? accounts.find((account) => account.status === "active")
  );
}

/** Money in this goal that is not yet linked to a bank account. */
export function unassignedSaved(goal: Goal): number {
  return (goal.contributions ?? [])
    .filter((entry) => !entry.accountId)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

/** Total claimed by all goals against one account. */
export function accountAllocated(
  goals: Goal[],
  accountId: string,
  accounts: BankAccount[] = [],
): number {
  return goals.reduce((sum, goal) => {
    if (goal.balanceAccountId === accountId) {
      return sum + (accounts.find((account) => account.id === accountId)?.balance ?? 0);
    }
    return (
      sum +
      (goal.contributions ?? [])
        .filter((entry) => entry.accountId === accountId)
        .reduce((goalSum, entry) => goalSum + entry.amount, 0)
    );
  }, 0);
}

/** Balance not claimed by any goal. Negative means over-allocated. */
export function accountFree(goals: Goal[], account: BankAccount): number {
  return account.balance - accountAllocated(goals, account.id, [account]);
}

/** True when goals claim more than the account actually holds. */
export function isOverAllocated(goals: Goal[], account: BankAccount): boolean {
  return accountFree(goals, account) < 0;
}

/** Where a goal's money lives, in first-seen order. Undefined accountId = unlinked. */
export function goalAccountBreakdown(
  goal: Goal,
  accounts: BankAccount[] = [],
): { accountId?: string; amount: number }[] {
  if (goal.balanceAccountId) {
    return [{ accountId: goal.balanceAccountId, amount: goalSaved(goal, accounts) }];
  }
  const totals = new Map<string, { accountId?: string; amount: number }>();
  for (const entry of goal.contributions ?? []) {
    const key = entry.accountId ?? "__unassigned__";
    const existing = totals.get(key);
    if (existing) existing.amount += entry.amount;
    else totals.set(key, { accountId: entry.accountId, amount: entry.amount });
  }
  return Array.from(totals.values());
}

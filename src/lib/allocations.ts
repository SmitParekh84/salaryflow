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

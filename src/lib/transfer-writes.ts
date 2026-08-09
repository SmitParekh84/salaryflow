import { applyAllocation, shouldReassignClosingAllocations } from "./allocation-writes";
import type { AccountTransfer, BankAccount, Goal } from "./types";

export type CompletedTransferResult =
  | { ok: true; accounts: BankAccount[]; goals: Goal[] }
  | { ok: false; reason: string };

export function completeTransferWrite(
  transfer: Pick<
    AccountTransfer,
    "id" | "sourceAccountId" | "destinationAccountId" | "amount" | "goalId" | "goalAmount"
  >,
  accounts: BankAccount[],
  goals: Goal[],
  balancesAlreadyReflected: boolean,
  now: Date,
): CompletedTransferResult {
  const source = accounts.find((account) => account.id === transfer.sourceAccountId);
  const destination = accounts.find((account) => account.id === transfer.destinationAccountId);
  if (!source || !destination) return { ok: false, reason: "Choose two valid accounts." };
  if (source.id === destination.id || transfer.amount <= 0) {
    return { ok: false, reason: "Choose two different accounts and enter an amount." };
  }
  if (!balancesAlreadyReflected && source.balance < transfer.amount) {
    return { ok: false, reason: `Only ${source.balance} is available in ${source.bankName}.` };
  }

  const goalAmount = transfer.goalAmount ?? 0;
  if ((transfer.goalId && goalAmount <= 0) || (!transfer.goalId && goalAmount > 0)) {
    return { ok: false, reason: "Choose a goal and enter how much to reserve." };
  }
  if (goalAmount > transfer.amount) {
    return { ok: false, reason: "The reserved amount cannot exceed the transfer." };
  }

  const nextAccounts = balancesAlreadyReflected
    ? accounts
    : accounts.map((account) =>
        account.id === source.id
          ? { ...account, balance: account.balance - transfer.amount }
          : account.id === destination.id
            ? { ...account, balance: account.balance + transfer.amount }
            : account,
      );

  let nextGoals = goals;
  if (transfer.goalId && goalAmount > 0) {
    const goal = goals.find((candidate) => candidate.id === transfer.goalId);
    if (!goal) return { ok: false, reason: "That goal no longer exists." };
    if (goal.preferredAccountId && goal.preferredAccountId !== destination.id) {
      return {
        ok: false,
        reason: `${goal.name} is linked to another bank. Choose its linked destination account.`,
      };
    }
    const allocation = applyAllocation(
      goals,
      nextAccounts,
      [{ goalId: goal.id, amount: goalAmount }],
      destination.id,
      transfer.id,
      now,
    );
    if (!allocation.ok) return allocation;
    nextGoals = allocation.goals;
  }

  if (shouldReassignClosingAllocations(source, transfer.amount) && !balancesAlreadyReflected) {
    nextGoals = nextGoals.map((goal) => ({
      ...goal,
      balanceAccountId:
        goal.balanceAccountId === source.id ? destination.id : goal.balanceAccountId,
      preferredAccountId:
        goal.preferredAccountId === source.id ? destination.id : goal.preferredAccountId,
      contributions: (goal.contributions ?? []).map((entry) =>
        entry.accountId === source.id ? { ...entry, accountId: destination.id } : entry,
      ),
    }));
  }

  return { ok: true, accounts: nextAccounts, goals: nextGoals };
}

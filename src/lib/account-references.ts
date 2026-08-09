import { accountAllocated } from "./allocations";
import type {
  AccountTransfer,
  BankAccount,
  Bill,
  Expense,
  Goal,
  Income,
  Investment,
  RecycleBinItem,
} from "./types";

export function accountDeletionBlocker(
  accountId: string,
  records: {
    expenses: Expense[];
    incomes: Income[];
    bills: Bill[];
    goals: Goal[];
    investments: Investment[];
    transfers: AccountTransfer[];
    recycleBin: RecycleBinItem[];
  },
): string | undefined {
  const linked: string[] = [];
  if (
    records.goals.some((goal) => goal.contributions?.some((item) => item.accountId === accountId))
  ) {
    linked.push("goal allocations");
  }
  if (records.expenses.some((expense) => expense.accountId === accountId)) linked.push("expenses");
  if (records.incomes.some((income) => income.accountId === accountId)) linked.push("income");
  if (records.bills.some((bill) => bill.accountId === accountId)) linked.push("bills");
  if (records.investments.some((investment) => investment.accountId === accountId)) {
    linked.push("investments");
  }
  if (
    records.transfers.some(
      (transfer) =>
        transfer.sourceAccountId === accountId || transfer.destinationAccountId === accountId,
    )
  ) {
    linked.push("transfers");
  }
  if (records.recycleBin.some((item) => recycledItemReferencesAccount(item, accountId))) {
    linked.push("recycled records");
  }
  if (linked.length === 0) return undefined;
  return `Move or remove linked ${linked.join(", ")} before deleting this account. You can hide it instead.`;
}

function recycledItemReferencesAccount(item: RecycleBinItem, accountId: string): boolean {
  if (["expense", "income", "bill", "investment"].includes(item.entityType)) {
    return item.data.accountId === accountId;
  }
  if (item.entityType !== "goal") return false;
  const goal = item.data as unknown as Goal;
  return Boolean(
    goal.contributions?.some((contribution) => contribution.accountId === accountId),
  );
}

export function goalRestoreBlocker(
  goal: Goal,
  accounts: BankAccount[],
  liveGoals: Goal[],
): string | undefined {
  const restoringByAccount = new Map<string, number>();
  for (const contribution of goal.contributions ?? []) {
    if (!contribution.accountId) continue;
    restoringByAccount.set(
      contribution.accountId,
      (restoringByAccount.get(contribution.accountId) ?? 0) + contribution.amount,
    );
  }

  for (const [accountId, restoringAmount] of restoringByAccount) {
    const account = accounts.find((candidate) => candidate.id === accountId);
    if (!account) {
      return "This goal references an account that no longer exists.";
    }
    const freeBalance = account.balance - accountAllocated(liveGoals, accountId);
    if (restoringAmount > freeBalance) {
      return `Only ${Math.max(0, freeBalance)} remains free in ${account.bankName}.`;
    }
  }

  return undefined;
}

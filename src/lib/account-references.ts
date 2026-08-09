import type {
  AccountTransfer,
  Bill,
  Expense,
  Goal,
  Income,
  Investment,
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
  },
): string | undefined {
  const linked: string[] = [];
  if (records.goals.some((goal) => goal.contributions?.some((item) => item.accountId === accountId))) {
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
  if (linked.length === 0) return undefined;
  return `Move or remove linked ${linked.join(", ")} before deleting this account. You can hide it instead.`;
}
import { creditCardUsage } from "./credit-cards";
import type { BankAccount, Bill, CreditCard, Expense, Income, Investment } from "./types";

export type FundingPlanKind =
  | "credit-card"
  | "rent"
  | "subscription"
  | "utility"
  | "investment"
  | "bill";

export interface FundingPlanItem {
  id: string;
  kind: FundingPlanKind;
  label: string;
  amount: number;
  destinationAccountId?: string;
  timing: string;
  billId?: string;
  billingMonth?: string;
  paidAmount: number;
  remainingAmount: number;
}

export interface FundingTransfer {
  accountId?: string;
  accountName: string;
  amount: number;
  items: FundingPlanItem[];
}

export function buildFundingPlan({
  accounts,
  bills,
  creditCards,
  expenses,
  incomes,
  investments,
  now = new Date(),
}: {
  accounts: BankAccount[];
  bills: Bill[];
  creditCards: CreditCard[];
  expenses: Expense[];
  incomes: Income[];
  investments: Investment[];
  now?: Date;
}) {
  const reserveAccount =
    accounts.find(
      (account) => account.status === "active" && account.defaultFor?.includes("obligations"),
    ) ??
    accounts.find(
      (account) => account.status === "active" && account.defaultFor?.includes("subscriptions"),
    );
  const items: FundingPlanItem[] = [];
  const currentBillingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousBillingMonth = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, "0")}`;

  for (const card of creditCards.filter((card) => card.status === "active")) {
    const usage = creditCardUsage(card, expenses, incomes, now);
    if (usage.outstanding <= 0) continue;
    items.push({
      id: `card-${card.id}`,
      kind: "credit-card",
      label: `${card.name} statement reserve`,
      amount: usage.outstanding,
      destinationAccountId: reserveAccount?.id,
      timing: `Statement closes ${usage.end.toLocaleDateString("en-US", { day: "numeric", month: "short" })}`,
      paidAmount: 0,
      remainingAmount: usage.outstanding,
    });
  }

  for (const investment of investments) {
    if (!investment.monthly) continue;
    items.push({
      id: `investment-${investment.id}`,
      kind: "investment",
      label: investment.name,
      amount: investment.monthly,
      destinationAccountId: investment.accountId ?? reserveAccount?.id,
      timing: "Monthly SIP",
      paidAmount: 0,
      remainingAmount: investment.monthly,
    });
  }

  for (const bill of bills) {
    if (bill.frequency !== "monthly" || bill.category === "Investment") continue;
    const kind: FundingPlanKind =
      bill.category === "Rent"
        ? "rent"
        : bill.category === "Subscriptions"
          ? "subscription"
          : bill.category === "Utilities"
            ? "utility"
            : "bill";
    const billingMonth = kind === "utility" ? previousBillingMonth : currentBillingMonth;
    const paidAmount = expenses
      .filter((expense) => expense.billId === bill.id && expense.billingMonth === billingMonth)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const amount = kind === "utility" && paidAmount > 0 ? paidAmount : bill.amount;
    const remainingAmount =
      kind === "utility" && paidAmount > 0 ? 0 : Math.max(0, amount - paidAmount);
    const utilityMonth = previousMonth.toLocaleDateString("en-US", { month: "long" });
    items.push({
      id: `bill-${bill.id}`,
      kind,
      label:
        kind === "utility"
          ? `${bill.name.replace(/\s+Estimate$/i, "")} · ${utilityMonth} bill`
          : bill.name,
      amount,
      destinationAccountId: bill.accountId ?? reserveAccount?.id,
      timing:
        kind === "utility"
          ? paidAmount > 0
            ? `Paid the following month`
            : `Expected the following month · around day ${bill.dueDay}`
          : `Due around day ${bill.dueDay}`,
      billId: bill.id,
      billingMonth,
      paidAmount,
      remainingAmount,
    });
  }

  const transfersByAccount = new Map<string, FundingTransfer>();
  for (const item of items) {
    const account = accounts.find((candidate) => candidate.id === item.destinationAccountId);
    const key = account?.id ?? "unassigned";
    const transfer = transfersByAccount.get(key) ?? {
      accountId: account?.id,
      accountName: account?.bankName ?? "Unassigned reserve",
      amount: 0,
      items: [],
    };
    transfer.amount += item.remainingAmount;
    transfer.items.push(item);
    transfersByAccount.set(key, transfer);
  }

  return {
    items,
    transfers: Array.from(transfersByAccount.values()).sort(
      (first, second) => second.amount - first.amount,
    ),
    plannedTotal: items.reduce((sum, item) => sum + item.amount, 0),
    paidTotal: items.reduce((sum, item) => sum + item.paidAmount, 0),
    total: items.reduce((sum, item) => sum + item.remainingAmount, 0),
  };
}

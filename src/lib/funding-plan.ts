import { creditCardUsage } from "./credit-cards";
import type { BankAccount, Bill, CreditCard, Expense, Income, Investment } from "./types";

export type FundingPlanKind = "credit-card" | "rent" | "subscription" | "utility" | "investment" | "bill";

export interface FundingPlanItem {
  id: string;
  kind: FundingPlanKind;
  label: string;
  amount: number;
  destinationAccountId?: string;
  timing: string;
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
    accounts.find((account) => account.status === "active" && account.defaultFor?.includes("obligations")) ??
    accounts.find((account) => account.status === "active" && account.defaultFor?.includes("subscriptions"));
  const items: FundingPlanItem[] = [];

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
    items.push({
      id: `bill-${bill.id}`,
      kind,
      label: bill.name,
      amount: bill.amount,
      destinationAccountId: bill.accountId ?? reserveAccount?.id,
      timing: `Due around day ${bill.dueDay}`,
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
    transfer.amount += item.amount;
    transfer.items.push(item);
    transfersByAccount.set(key, transfer);
  }

  return {
    items,
    transfers: Array.from(transfersByAccount.values()).sort((first, second) => second.amount - first.amount),
    total: items.reduce((sum, item) => sum + item.amount, 0),
  };
}
import { billCycle, monthlyBillReserve } from "./bill-cycle";
import { creditCardUsage } from "./credit-cards";
import type {
  BankAccount,
  Bill,
  BudgetRule,
  CreditCard,
  Expense,
  Income,
  Investment,
} from "./types";

export type FundingPlanKind =
  | "credit-card"
  | "rent"
  | "subscription"
  | "utility"
  | "investment"
  | "savings"
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
  budgetRule,
  monthlyIncome = 0,
  savedThisCycle = 0,
  now = new Date(),
}: {
  accounts: BankAccount[];
  bills: Bill[];
  creditCards: CreditCard[];
  expenses: Expense[];
  incomes: Income[];
  investments: Investment[];
  budgetRule?: BudgetRule;
  monthlyIncome?: number;
  savedThisCycle?: number;
  now?: Date;
}) {
  const reserveAccount =
    accounts.find(
      (account) => account.status === "active" && account.defaultFor?.includes("obligations"),
    ) ??
    accounts.find(
      (account) => account.status === "active" && account.defaultFor?.includes("subscriptions"),
    );
  const savingsAccount = accounts.find(
    (account) => account.status === "active" && account.defaultFor?.includes("savings"),
  );
  const investmentBills = bills.filter(
    (bill) => bill.frequency === "monthly" && bill.category === "Investment",
  );
  const items: FundingPlanItem[] = [];

  /**
   * A card can owe two different things at once, and they are not due together.
   *
   * A statement that has closed unpaid is owed now; purchases made since belong
   * to the statement still accruing. Reporting one total against the next close
   * told a user that money already overdue could wait another month, and they
   * reserved too little this cycle.
   */
  const closeLabel = (date: Date) =>
    date.toLocaleDateString("en-US", { day: "numeric", month: "short" });

  for (const card of creditCards.filter((card) => card.status === "active")) {
    const usage = creditCardUsage(card, expenses, incomes, now);

    if (usage.billedOutstanding > 0) {
      items.push({
        id: `card-${card.id}-due`,
        kind: "credit-card",
        label: `${card.name} statement due`,
        amount: usage.billedOutstanding,
        destinationAccountId: reserveAccount?.id,
        timing: `Closed ${closeLabel(usage.previousStatementEnd)} · due now`,
        paidAmount: 0,
        remainingAmount: usage.billedOutstanding,
      });
    }

    if (usage.currentOutstanding > 0) {
      items.push({
        id: `card-${card.id}-open`,
        kind: "credit-card",
        label: `${card.name} accruing`,
        amount: usage.currentOutstanding,
        destinationAccountId: reserveAccount?.id,
        timing: `Statement closes ${closeLabel(usage.end)}`,
        paidAmount: 0,
        remainingAmount: usage.currentOutstanding,
      });
    }
  }

  for (const investment of investmentBills.length > 0 ? [] : investments) {
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

  if (budgetRule && monthlyIncome > 0) {
    const savingsPercentage =
      budgetRule.allocations.find((allocation) => allocation.kind === "savings")?.percentage ?? 0;
    const investmentPercentage =
      budgetRule.allocations.find((allocation) => allocation.kind === "investments")?.percentage ??
      0;
    const savingsTarget = (monthlyIncome * savingsPercentage) / 100;
    const investmentTarget = (monthlyIncome * investmentPercentage) / 100;
    const monthlyInvestments =
      investmentBills.length > 0
        ? investmentBills.reduce((sum, bill) => sum + bill.amount, 0)
        : investments.reduce((sum, investment) => sum + (investment.monthly ?? 0), 0);
    const investmentTopUp = Math.max(0, investmentTarget - monthlyInvestments);
    if (investmentTopUp > 0) {
      items.push({
        id: `budget-investments-${budgetRule.id}`,
        kind: "investment",
        label: `${budgetRule.name} investment top-up`,
        amount: investmentTopUp,
        destinationAccountId: reserveAccount?.id,
        timing: `${investmentPercentage}% target · after monthly SIPs`,
        paidAmount: 0,
        remainingAmount: investmentTopUp,
      });
    }
    if (savingsTarget > 0) {
      items.push({
        id: `budget-savings-${budgetRule.id}`,
        kind: "savings",
        label: `${budgetRule.name} savings reserve`,
        amount: savingsTarget,
        destinationAccountId: savingsAccount?.id ?? reserveAccount?.id,
        timing: `${savingsPercentage}% cash savings target`,
        paidAmount: Math.min(savedThisCycle, savingsTarget),
        remainingAmount: Math.max(0, savingsTarget - savedThisCycle),
      });
    }
  }

  for (const bill of bills) {
    if (bill.frequency === "interval") {
      const cycle = billCycle(bill, expenses, now);
      const reserveAmount = monthlyBillReserve(bill);
      items.push({
        id: `bill-reserve-${bill.id}`,
        kind: "bill",
        label: `${bill.name} reserve`,
        amount: reserveAmount,
        destinationAccountId: bill.accountId ?? reserveAccount?.id,
        timing: `${formatInterval(bill.intervalDays ?? 90)} · next due ${cycle.occurrenceDate.toLocaleDateString("en-US", { day: "numeric", month: "short" })}`,
        paidAmount: 0,
        remainingAmount: reserveAmount,
      });
      continue;
    }
    if (bill.frequency !== "monthly") continue;
    const kind: FundingPlanKind =
      bill.category === "Investment"
        ? "investment"
        : bill.category === "Rent"
          ? "rent"
          : bill.category === "Subscriptions"
            ? "subscription"
            : bill.category === "Utilities"
              ? "utility"
              : "bill";
    const cycle = billCycle(bill, expenses, now);
    const utilityMonth = cycle.billedMonth.toLocaleDateString("en-US", { month: "long" });
    items.push({
      id: `bill-${bill.id}`,
      kind,
      label:
        kind === "utility"
          ? `${bill.name.replace(/\s+Estimate$/i, "")} · ${utilityMonth} bill`
          : bill.name,
      amount: cycle.amount,
      destinationAccountId: bill.accountId ?? reserveAccount?.id,
      timing:
        kind === "utility"
          ? cycle.isPaid
            ? `Paid the following month · ${cycle.occurrenceDate.toLocaleDateString("en-US", { day: "numeric", month: "short" })}`
            : `Expected the following month · ${cycle.occurrenceDate.toLocaleDateString("en-US", { day: "numeric", month: "short" })}`
          : cycle.occurrenceDate.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            }),
      billId: bill.id,
      billingMonth: cycle.billingMonth,
      paidAmount: cycle.paidAmount,
      remainingAmount: cycle.remainingAmount,
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

function formatInterval(days: number): string {
  return days === 90 ? "Every 90 days" : `Every ${days} days`;
}

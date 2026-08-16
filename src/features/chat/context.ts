import type { BankAccount, Bill, Expense, Goal, Investment, SalaryProfile } from "@/lib/types";

/* ---------------------------------------------------------------------------
   The assistant's view of a user's finances.

   Everything the model is told about money is computed here, in code. The model
   is never handed raw rows to add up: LLM arithmetic is unreliable, and
   PRODUCT.md forbids inventing figures or hiding assumptions. It receives
   finished numbers and explains them.

   Two rules keep the figures from double-counting:

   - Spending comes from expenses, obligations come from bills. Paying a bill
     also writes an expense row carrying `billId`, so those rows are dropped
     from the spend average and the bill supplies the number instead.
   - `monthlyInsurancePremium` is descriptive, not additive. It overlaps with
     `avgMonthlySpend` and `totalMonthlyBills` by design and must never be
     added to them.
   --------------------------------------------------------------------------- */

/** Facts Aartha does not otherwise store, needed for advice like term cover. */
export type FinancialProfile = {
  age?: number | null;
  dependents?: number | null;
  existingLifeCover?: number | null;
  existingHealthCover?: number | null;
  outstandingLoans?: number | null;
  spouseIncome?: number | null;
};

export type FinancialContext = {
  currency: string;
  monthlyIncome: number;
  avgMonthlySpend: number;
  spendByCategory: { category: string; monthlyAvg: number }[];
  totalMonthlyBills: number;
  monthlyEmi: number;
  monthlyInsurancePremium: number;
  investments: { name: string; type: string; invested: number; currentValue: number; monthly: number }[];
  monthlySipTotal: number;
  goals: { name: string; type: string; target: number; saved: number; monthlyContribution: number }[];
  totalLiquidBalance: number;
  emergencyFundMonths: number | null;
  profile: FinancialProfile;
};

export type FinancialContextInput = {
  salary: SalaryProfile;
  expenses: Expense[];
  bills: Bill[];
  investments: Investment[];
  goals: Goal[];
  accounts: BankAccount[];
  profile: FinancialProfile;
  now?: Date;
};

/** Months of history averaged into the monthly figures. */
const WINDOW_MONTHS = 3;
const WINDOW_DAYS = WINDOW_MONTHS * 30;

const round = (value: number) => Math.round(value);

/**
 * A bill's true cost per month.
 *
 * Deliberately not `monthlyBillReserve` from bill-cycle.ts: that answers "how
 * much to hold back this salary cycle" and returns a yearly bill's full amount.
 * Advice needs the levelised monthly cost instead.
 */
export function monthlyBillCost(bill: Bill): number {
  switch (bill.frequency) {
    case "yearly":
      return bill.amount / 12;
    case "weekly":
      return (bill.amount * 52) / 12;
    case "interval":
      return (bill.amount * 30) / (bill.intervalDays ?? 90);
    default:
      return bill.amount;
  }
}

export function buildFinancialContext(input: FinancialContextInput): FinancialContext {
  const { salary, expenses, bills, investments, goals, accounts, profile } = input;
  const now = input.now ?? new Date();
  const windowStart = now.getTime() - WINDOW_DAYS * 86_400_000;

  const recentSpend = expenses.filter((item) => {
    const at = new Date(item.date).getTime();
    if (Number.isNaN(at) || at < windowStart || at > now.getTime()) return false;
    // Moving money into an investment is not consumption.
    if (item.category === "Investment") return false;
    // A bill's own expense row is counted via the bill, not here.
    if (item.billId) return false;
    return true;
  });

  const byCategory = new Map<string, number>();
  for (const item of recentSpend) {
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.amount);
  }

  const spendByCategory = [...byCategory.entries()]
    .map(([category, total]) => ({ category, monthlyAvg: round(total / WINDOW_MONTHS) }))
    .sort((a, b) => b.monthlyAvg - a.monthlyAvg);

  const avgMonthlySpend = round(
    recentSpend.reduce((sum, item) => sum + item.amount, 0) / WINDOW_MONTHS,
  );

  const billCostFor = (predicate: (bill: Bill) => boolean) =>
    bills.filter(predicate).reduce((sum, bill) => sum + monthlyBillCost(bill), 0);

  const totalMonthlyBills = round(billCostFor(() => true));
  const monthlyEmi = round(billCostFor((bill) => bill.category === "EMI"));

  // Premiums may be modelled as a bill or logged as an ordinary expense. Miss
  // the expense path and an insured user is told they have no cover at all.
  const insuranceFromExpenses = recentSpend
    .filter((item) => item.category === "Insurance")
    .reduce((sum, item) => sum + item.amount, 0);
  const monthlyInsurancePremium = round(
    billCostFor((bill) => bill.category === "Insurance") + insuranceFromExpenses / WINDOW_MONTHS,
  );

  const totalLiquidBalance = round(
    accounts
      .filter((account) => account.status !== "closed")
      .reduce((sum, account) => sum + account.balance, 0),
  );

  const monthlyOutgoings = avgMonthlySpend + totalMonthlyBills;
  const emergencyFundMonths =
    monthlyOutgoings > 0 ? Math.round((totalLiquidBalance / monthlyOutgoings) * 10) / 10 : null;

  return {
    currency: salary.currency,
    monthlyIncome: round(salary.amount),
    avgMonthlySpend,
    spendByCategory,
    totalMonthlyBills,
    monthlyEmi,
    monthlyInsurancePremium,
    investments: investments.map((item) => ({
      name: item.name,
      type: item.type,
      invested: round(item.invested),
      currentValue: round(item.currentValue),
      monthly: round(item.monthly ?? 0),
    })),
    monthlySipTotal: round(investments.reduce((sum, item) => sum + (item.monthly ?? 0), 0)),
    goals: goals.map((goal) => ({
      name: goal.name,
      type: goal.type,
      target: round(goal.target),
      saved: round(goal.saved),
      monthlyContribution: round(goal.monthlyContribution),
    })),
    totalLiquidBalance,
    emergencyFundMonths,
    profile,
  };
}

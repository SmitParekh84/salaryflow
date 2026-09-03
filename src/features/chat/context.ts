import { monthlyBillCost } from "@/lib/bill-cycle";
import { ageOn } from "@/lib/date-of-birth";
import type { BankAccount, Bill, Expense, Goal, Investment, SalaryProfile } from "@/lib/types";
import { parseFinancialDate } from "@/lib/utils";

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

/**
 * Facts Aartha does not otherwise store, needed for advice like term cover.
 *
 * `age` is derived, never asked for: see financialProfileFromDoc below.
 */
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

/** Re-exported so the assistant context keeps its single import surface. */
export { monthlyBillCost };

export function buildFinancialContext(input: FinancialContextInput): FinancialContext {
  const { salary, expenses, bills, investments, goals, accounts, profile } = input;
  const now = input.now ?? new Date();
  const windowStart = now.getTime() - WINDOW_DAYS * 86_400_000;
  /*
   * The window closes at the end of today, and dates are read the way the rest
   * of the app reads them. Stored dates are day values anchored at local noon,
   * so comparing them against `now` asked whether midday had passed: anything
   * recorded this morning was dropped, and the assistant answered questions
   * about today's spending having been told none of it happened.
   */
  const windowEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();

  const recentSpend = expenses.filter((item) => {
    const at = parseFinancialDate(item.date).getTime();
    if (Number.isNaN(at) || at < windowStart || at > windowEnd) return false;
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

/**
 * A stored profile document as the assistant's snapshot.
 *
 * Two jobs. Mongo omits unset optional fields, and a key missing from the
 * prompt reads to the model as zero — "no dependents" instead of "never asked"
 * — so every field is forced present as null. And age is derived from the
 * recorded birthday rather than read from storage: a typed age is right for one
 * year and quietly wrong after that. A stored `age` is still honoured for
 * records written before birthdays were collected.
 */
export function financialProfileFromDoc(
  doc: Record<string, unknown> | null | undefined,
  now: Date,
): FinancialProfile {
  const read = (key: string) => {
    const value = doc?.[key];
    return typeof value === "number" ? value : null;
  };

  const dateOfBirth = typeof doc?.dateOfBirth === "string" ? doc.dateOfBirth : null;

  return {
    age: ageOn(dateOfBirth, now) ?? read("age"),
    dependents: read("dependents"),
    existingLifeCover: read("existingLifeCover"),
    existingHealthCover: read("existingHealthCover"),
    outstandingLoans: read("outstandingLoans"),
    spouseIncome: read("spouseIncome"),
  };
}

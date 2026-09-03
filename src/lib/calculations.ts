import { goalSaved } from "./allocations";
import { billCycle } from "./bill-cycle";
import { budgetAllocationTarget, evaluateBudgetRule } from "./budget-rules";
import type {
  AccountTransfer,
  BankAccount,
  Bill,
  BudgetBucketKind,
  BudgetRule,
  Expense,
  Goal,
  Income,
  Investment,
  SalaryProfile,
  SpendStatus,
} from "./types";
import { parseFinancialDate } from "./utils";

/** Days in the current salary cycle and days remaining until next salary. */
export function cycleInfo(profile: SalaryProfile, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let cycleLength: number;
  let dayInCycle: number;
  let cycleStart: Date;
  let nextSalary: Date;

  switch (profile.cycle) {
    case "weekly":
    case "biweekly": {
      cycleLength = profile.cycle === "weekly" ? 7 : 14;
      const anchor = new Date(1970, 0, Math.max(1, Math.min(31, profile.salaryDay)));
      const daysSinceAnchor = calendarDayDifference(anchor, today);
      dayInCycle = ((daysSinceAnchor % cycleLength) + cycleLength) % cycleLength;
      cycleStart = new Date(today);
      cycleStart.setDate(today.getDate() - dayInCycle);
      nextSalary = new Date(cycleStart);
      nextSalary.setDate(cycleStart.getDate() + cycleLength);
      break;
    }
    default: {
      const salaryDate = (year: number, month: number) =>
        new Date(year, month, Math.min(profile.salaryDay, new Date(year, month + 1, 0).getDate()));
      const thisMonthSalary = salaryDate(today.getFullYear(), today.getMonth());
      cycleStart =
        today >= thisMonthSalary
          ? thisMonthSalary
          : salaryDate(today.getFullYear(), today.getMonth() - 1);
      nextSalary = salaryDate(cycleStart.getFullYear(), cycleStart.getMonth() + 1);
      dayInCycle = calendarDayDifference(cycleStart, today);
      cycleLength = calendarDayDifference(cycleStart, nextSalary);
    }
  }

  const daysElapsed = dayInCycle;
  const daysRemaining = Math.max(1, cycleLength - dayInCycle);

  return { cycleLength, daysElapsed, daysRemaining, cycleStart, nextSalary };
}

function calendarDayDifference(start: Date, end: Date): number {
  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endDay - startDay) / 86_400_000);
}

export function isInCurrentCycle(
  isoDate: string,
  profile: SalaryProfile,
  now = new Date(),
): boolean {
  const { cycleStart } = cycleInfo(profile, now);
  const date = parseFinancialDate(isoDate);
  return date >= cycleStart && date <= now;
}

export interface FinanceSummary {
  income: number;
  salaryIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
  totalExpenses: number;
  investedThisCycle: number;
  savings: number;
  savingsTarget: number;
  plannedSavings: number;
  savedThisCycle: number;
  investmentTarget: number;
  plannedInvestments: number;
  spendingBudget: number;
  needsBudget: number;
  wantsBudget: number;
  remaining: number;
  daysRemaining: number;
  daysElapsed: number;
  cycleLength: number;
  nextSalary: Date;
  safeToSpendPerDay: number;
  safeToSpendToday: number;
  spentToday: number;
  status: SpendStatus;
  healthScore: number;
  savingsRate: number;
  usedConfirmedSalary?: boolean;
  budgetRuleName?: string;
  budgetRuleScore?: number;
  budgetActual?: Record<BudgetBucketKind, number>;
  budgetProgress?: Record<BudgetBucketKind, { target: number; used: number; remaining: number }>;
}

const FIXED: Record<string, boolean> = {
  Rent: true,
  EMI: true,
  Insurance: true,
  Subscriptions: true,
  Utilities: true,
  "Mobile & Internet": true,
};

const NEEDS: Record<string, boolean> = {
  Rent: true,
  EMI: true,
  Insurance: true,
  Utilities: true,
  "Mobile & Internet": true,
  Groceries: true,
  Fuel: true,
  Medical: true,
  Education: true,
};

export function countsAsEarnedIncome(income: Income) {
  return !["Salary", "Reimbursement", "Cashback"].includes(income.type);
}

/**
 * Whether money arriving in a savings account is evidence of new saving.
 *
 * A reimbursement is the back half of a spend that already happened, and the
 * matching outflow usually left a different account — so counting the inflow
 * alone invents savings that were never made. Cashback is likewise never
 * counted as earned income, and crediting it here would inflate the savings
 * rate against an income figure that excludes it.
 *
 * Salary deliberately stays in. It is left out of `countsAsEarnedIncome` only
 * because profile or confirmed salary is the source of truth for earnings, not
 * because a salary paid into a savings account fails to be saved.
 */
export function countsAsSavingsDeposit(income: Income) {
  return !["Reimbursement", "Cashback"].includes(income.type);
}

export function computeSummary(
  profile: SalaryProfile,
  expenses: Expense[],
  incomes: Income[],
  investments: Investment[],
  goals: Goal[],
  salaryHistory: { amount: number; date: string; confirmed?: boolean; source?: string }[] = [],
  budgetRule?: BudgetRule,
  accounts: BankAccount[] = [],
  accountTransfers: AccountTransfer[] = [],
  now = new Date(),
): FinanceSummary {
  const { daysRemaining, daysElapsed, cycleLength, nextSalary } = cycleInfo(profile, now);

  const cycleExpenses = expenses.filter((e) => isInCurrentCycle(e.date, profile, now));
  const spendingCycleExpenses = cycleExpenses.filter(
    (expense) => expense.category !== "Investment",
  );
  const extraIncome = incomes
    .filter((income) => countsAsEarnedIncome(income) && isInCurrentCycle(income.date, profile, now))
    .reduce((s, i) => s + i.amount, 0);

  // use confirmed salary entries in the current cycle if available
  const confirmedSalarySum = (salaryHistory || [])
    .filter((h) => h.confirmed && isInCurrentCycle(h.date, profile, now))
    .reduce((s, h) => s + (h.amount || 0), 0);

  const usedConfirmedSalary = confirmedSalarySum > 0;
  const baseIncome = usedConfirmedSalary ? confirmedSalarySum : profile.amount;
  const income = baseIncome + extraIncome;
  const fixedExpenses = spendingCycleExpenses
    .filter((e) => FIXED[e.category])
    .reduce((s, e) => s + e.amount, 0);
  const variableExpenses = spendingCycleExpenses
    .filter((e) => !FIXED[e.category])
    .reduce((s, e) => s + e.amount, 0);
  const totalExpenses = fixedExpenses + variableExpenses;
  const needsExpenses = spendingCycleExpenses
    .filter((expense) => NEEDS[expense.category])
    .reduce((sum, expense) => sum + expense.amount, 0);
  const wantsExpenses = totalExpenses - needsExpenses;

  const investedThisCycle = cycleExpenses
    .filter((expense) => expense.category === "Investment")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const goalBackedAccountIds = new Set(
    goals.flatMap((goal) => (goal.balanceAccountId ? [goal.balanceAccountId] : [])),
  );
  const savingsAccountIds = new Set(
    accounts
      .filter(
        (account) =>
          account.defaultFor?.includes("savings") || goalBackedAccountIds.has(account.id),
      )
      .map((account) => account.id),
  );
  const completedCycleTransfers = accountTransfers.filter(
    (transfer) => transfer.status === "completed" && isInCurrentCycle(transfer.date, profile, now),
  );
  const savingsAccountCashFlow =
    completedCycleTransfers.reduce((sum, transfer) => {
      const incoming = savingsAccountIds.has(transfer.destinationAccountId) ? transfer.amount : 0;
      const outgoing = savingsAccountIds.has(transfer.sourceAccountId) ? transfer.amount : 0;
      const retainedForGoal =
        outgoing > 0 && incoming === 0 ? Math.min(transfer.goalAmount ?? 0, transfer.amount) : 0;
      return sum + incoming - outgoing + retainedForGoal;
    }, 0) +
    incomes
      .filter(
        (income) =>
          income.accountId &&
          savingsAccountIds.has(income.accountId) &&
          countsAsSavingsDeposit(income) &&
          isInCurrentCycle(income.date, profile, now),
      )
      .reduce((sum, income) => sum + income.amount, 0) -
    cycleExpenses
      .filter((expense) => expense.accountId && savingsAccountIds.has(expense.accountId))
      .reduce((sum, expense) => sum + expense.amount, 0);
  // Goals track purpose and progress, not cash movement. Every goal
  // contribution is excluded; only evidenced savings-account flow counts.
  const savedThisCycle = Math.max(0, savingsAccountCashFlow);

  const savingsTarget = budgetRule
    ? budgetAllocationTarget(budgetRule, "savings", baseIncome)
    : profile.savingsGoal;
  const investmentTarget = budgetRule
    ? budgetAllocationTarget(budgetRule, "investments", baseIncome)
    : investedThisCycle;
  const plannedSavings = Math.max(0, savingsTarget);
  const plannedInvestments = Math.max(0, investmentTarget - investedThisCycle);
  const spendingBudget = Math.max(0, income - savingsTarget - investmentTarget);
  const needsBudget = budgetRule ? budgetAllocationTarget(budgetRule, "needs", baseIncome) : 0;
  const wantsBudget = budgetRule
    ? budgetAllocationTarget(budgetRule, "wants", baseIncome)
    : spendingBudget;
  const remaining =
    income - totalExpenses - investedThisCycle - plannedInvestments - plannedSavings;

  const todayKey = new Date(now).toDateString();
  const spentToday = spendingCycleExpenses
    .filter((expense) => parseFinancialDate(expense.date).toDateString() === todayKey)
    .reduce((s, e) => s + e.amount, 0);
  const remainingBeforeToday = remaining + spentToday;
  const safeToSpendPerDay = Math.max(0, remainingBeforeToday / daysRemaining);
  const safeToSpendToday = Math.max(0, safeToSpendPerDay - spentToday);

  let status: SpendStatus = "green";
  if (spentToday > safeToSpendPerDay * 1.15) status = "red";
  else if (spentToday > safeToSpendPerDay * 0.85) status = "yellow";

  const savings = savedThisCycle + investedThisCycle;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  const baseHealthScore = financialHealthScore({
    savingsRate,
    remaining,
    income,
    fixedExpenses,
    daysElapsed,
    cycleLength,
    totalExpenses,
  });
  const budgetEvaluation = budgetRule
    ? evaluateBudgetRule(
        budgetRule,
        baseIncome,
        needsExpenses,
        wantsExpenses,
        savedThisCycle,
        investedThisCycle,
      )
    : null;
  const healthScore = budgetEvaluation
    ? Math.round(baseHealthScore * 0.75 + budgetEvaluation.score * 0.25)
    : baseHealthScore;

  return {
    income,
    salaryIncome: baseIncome,
    fixedExpenses,
    variableExpenses,
    totalExpenses,
    investedThisCycle,
    savings,
    savingsTarget,
    plannedSavings,
    savedThisCycle,
    investmentTarget,
    plannedInvestments,
    spendingBudget,
    needsBudget,
    wantsBudget,
    remaining,
    daysRemaining,
    daysElapsed,
    cycleLength,
    nextSalary,
    safeToSpendPerDay,
    safeToSpendToday,
    spentToday,
    status,
    healthScore,
    savingsRate,
    usedConfirmedSalary,
    budgetRuleName: budgetRule?.name,
    budgetRuleScore: budgetEvaluation?.score,
    budgetActual: budgetEvaluation?.actual,
    budgetProgress: budgetRule
      ? {
          needs: {
            target: needsBudget,
            used: needsExpenses,
            remaining: needsBudget - needsExpenses,
          },
          wants: {
            target: wantsBudget,
            used: wantsExpenses,
            remaining: wantsBudget - wantsExpenses,
          },
          savings: {
            target: savingsTarget,
            used: savedThisCycle,
            remaining: savingsTarget - savedThisCycle,
          },
          investments: {
            target: investmentTarget,
            used: investedThisCycle,
            remaining: investmentTarget - investedThisCycle,
          },
        }
      : undefined,
  };
}

function financialHealthScore(p: {
  savingsRate: number;
  remaining: number;
  income: number;
  fixedExpenses: number;
  daysElapsed: number;
  cycleLength: number;
  totalExpenses: number;
}): number {
  let score = 50;
  // Savings rate contribution (max +30)
  score += Math.min(30, p.savingsRate * 0.6);
  // Not overspending pace (max +/-20)
  const expectedSpendRatio = p.cycleLength ? p.daysElapsed / p.cycleLength : 0;
  const actualSpendRatio = p.income ? p.totalExpenses / p.income : 0;
  score += (expectedSpendRatio - actualSpendRatio) * 40;
  // Fixed expense burden (max -20 if fixed > 50% income)
  const fixedRatio = p.income ? p.fixedExpenses / p.income : 0;
  if (fixedRatio > 0.5) score -= (fixedRatio - 0.5) * 40;
  // Buffer remaining
  if (p.remaining < 0) score -= 15;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function projectedGoalDate(
  goal: Goal,
  accounts: BankAccount[] = [],
  now = new Date(),
): string | null {
  if (goal.monthlyContribution <= 0) return null;
  const remaining = goal.target - goalSaved(goal, accounts);
  if (remaining <= 0) return "Achieved";
  const months = Math.ceil(remaining / goal.monthlyContribution);
  // Built from year and month rather than `setMonth` on today's date: on the
  // 31st, `setMonth(+1)` overflows a 30-day month and lands in the one after,
  // so a one-month projection made on 31 Jan read "Mar". Day 1 because only
  // the month and year are printed.
  const projected = new Date(now.getFullYear(), now.getMonth() + months, 1);
  return projected.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function upcomingBills(bills: Bill[], expenses: Expense[] = [], now = new Date()): Bill[] {
  return [...bills]
    .filter((bill) => !billCycle(bill, expenses, now).isPaid)
    .sort((a, b) => {
      return (
        billCycle(a, expenses, now).occurrenceDate.getTime() -
        billCycle(b, expenses, now).occurrenceDate.getTime()
      );
    });
}

export function statusColor(status: SpendStatus): string {
  return status === "green"
    ? "var(--success)"
    : status === "yellow"
      ? "var(--warning)"
      : "var(--danger)";
}

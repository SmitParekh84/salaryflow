import { billCycle } from "./bill-cycle";
import { evaluateBudgetRule } from "./budget-rules";
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
  const day = today.getDate();

  let cycleLength: number;
  let dayInCycle: number;
  let cycleStart: Date;
  let nextSalary: Date;

  switch (profile.cycle) {
    case "weekly":
      cycleLength = 7;
      dayInCycle = (((day - profile.salaryDay) % 7) + 7) % 7;
      cycleStart = new Date(today);
      cycleStart.setDate(today.getDate() - dayInCycle);
      nextSalary = new Date(cycleStart);
      nextSalary.setDate(cycleStart.getDate() + cycleLength);
      break;
    case "biweekly":
      cycleLength = 14;
      dayInCycle = (((day - profile.salaryDay) % 14) + 14) % 14;
      cycleStart = new Date(today);
      cycleStart.setDate(today.getDate() - dayInCycle);
      nextSalary = new Date(cycleStart);
      nextSalary.setDate(cycleStart.getDate() + cycleLength);
      break;
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
  fixedExpenses: number;
  variableExpenses: number;
  totalExpenses: number;
  investedThisCycle: number;
  savings: number;
  savingsTarget: number;
  plannedSavings: number;
  savedThisCycle: number;
  savingsEvidence: "account" | "goals";
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
    .filter((i) => isInCurrentCycle(i.date, profile, now))
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

  const investedThisCycle = cycleExpenses
    .filter((expense) => expense.category === "Investment")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const goalContributionsThisCycle = goals
    .flatMap((goal) => goal.contributions ?? [])
    .filter((contribution) => isInCurrentCycle(contribution.date, profile, now))
    .reduce((sum, contribution) => sum + contribution.amount, 0);
  const savingsAccountIds = new Set(
    accounts
      .filter((account) => account.defaultFor?.includes("savings"))
      .map((account) => account.id),
  );
  const completedCycleTransfers = accountTransfers.filter(
    (transfer) => transfer.status === "completed" && isInCurrentCycle(transfer.date, profile, now),
  );
  const savingsAccountCashFlow =
    completedCycleTransfers.reduce((sum, transfer) => {
      const incoming = savingsAccountIds.has(transfer.destinationAccountId) ? transfer.amount : 0;
      const outgoing = savingsAccountIds.has(transfer.sourceAccountId) ? transfer.amount : 0;
      return sum + incoming - outgoing;
    }, 0) +
    incomes
      .filter(
        (income) =>
          income.accountId &&
          savingsAccountIds.has(income.accountId) &&
          isInCurrentCycle(income.date, profile, now),
      )
      .reduce((sum, income) => sum + income.amount, 0) -
    cycleExpenses
      .filter((expense) => expense.accountId && savingsAccountIds.has(expense.accountId))
      .reduce((sum, expense) => sum + expense.amount, 0);
  const savingsEvidence = savingsAccountIds.size > 0 ? "account" : "goals";
  const savedThisCycle = Math.max(
    0,
    savingsEvidence === "account" ? savingsAccountCashFlow : goalContributionsThisCycle,
  );

  const allocationPercentage = (kind: BudgetBucketKind) =>
    budgetRule?.allocations.find((allocation) => allocation.kind === kind)?.percentage ?? 0;
  const savingsTarget = budgetRule
    ? (income * allocationPercentage("savings")) / 100
    : profile.savingsGoal;
  const investmentTarget = budgetRule
    ? (income * allocationPercentage("investments")) / 100
    : investedThisCycle;
  const plannedSavings = Math.max(0, savingsTarget);
  const plannedInvestments = Math.max(0, investmentTarget - investedThisCycle);
  const spendingBudget = Math.max(0, income - savingsTarget - investmentTarget);
  const needsBudget = budgetRule ? (income * allocationPercentage("needs")) / 100 : 0;
  const wantsBudget = budgetRule ? (income * allocationPercentage("wants")) / 100 : spendingBudget;
  const remaining =
    income - totalExpenses - investedThisCycle - plannedInvestments - plannedSavings;

  const safeToSpendPerDay = Math.max(0, remaining / daysRemaining);

  const todayKey = new Date(now).toDateString();
  const spentToday = spendingCycleExpenses
    .filter((e) => new Date(e.date).toDateString() === todayKey)
    .reduce((s, e) => s + e.amount, 0);
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
        income,
        fixedExpenses,
        variableExpenses,
        savedThisCycle,
        investedThisCycle,
      )
    : null;
  const healthScore = budgetEvaluation
    ? Math.round(baseHealthScore * 0.75 + budgetEvaluation.score * 0.25)
    : baseHealthScore;

  return {
    income,
    fixedExpenses,
    variableExpenses,
    totalExpenses,
    investedThisCycle,
    savings,
    savingsTarget,
    plannedSavings,
    savedThisCycle,
    savingsEvidence,
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
            used: fixedExpenses,
            remaining: needsBudget - fixedExpenses,
          },
          wants: {
            target: wantsBudget,
            used: variableExpenses,
            remaining: wantsBudget - variableExpenses,
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

export function projectedGoalDate(goal: Goal): string | null {
  if (goal.monthlyContribution <= 0) return null;
  const remaining = goal.target - goal.saved;
  if (remaining <= 0) return "Achieved";
  const months = Math.ceil(remaining / goal.monthlyContribution);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
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

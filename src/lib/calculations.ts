import type {
  Bill,
  Expense,
  Goal,
  Income,
  Investment,
  SalaryProfile,
  SpendStatus,
} from "./types";

/** Days in the current salary cycle and days remaining until next salary. */
export function cycleInfo(profile: SalaryProfile, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = today.getDate();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();

  let cycleLength: number;
  let dayInCycle: number;

  switch (profile.cycle) {
    case "weekly":
      cycleLength = 7;
      dayInCycle = ((day - profile.salaryDay) % 7 + 7) % 7;
      break;
    case "biweekly":
      cycleLength = 14;
      dayInCycle = ((day - profile.salaryDay) % 14 + 14) % 14;
      break;
    default: {
      cycleLength = daysInMonth;
      const salaryDay = Math.min(profile.salaryDay, daysInMonth);
      dayInCycle = day >= salaryDay ? day - salaryDay : daysInMonth - salaryDay + day;
    }
  }

  const daysElapsed = dayInCycle;
  const daysRemaining = Math.max(1, cycleLength - dayInCycle);
  const nextSalary = new Date(today);
  nextSalary.setDate(today.getDate() + daysRemaining);

  return { cycleLength, daysElapsed, daysRemaining, nextSalary };
}

export function isInCurrentCycle(
  isoDate: string,
  profile: SalaryProfile,
  now = new Date()
): boolean {
  const { daysElapsed } = cycleInfo(profile, now);
  const start = new Date(now);
  start.setDate(start.getDate() - daysElapsed);
  start.setHours(0, 0, 0, 0);
  const d = new Date(isoDate);
  return d >= start && d <= now;
}

export interface FinanceSummary {
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  totalExpenses: number;
  investedThisCycle: number;
  savings: number;
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
}

const FIXED: Record<string, boolean> = {
  Rent: true,
  EMI: true,
  Insurance: true,
  Subscriptions: true,
  Utilities: true,
};

export function computeSummary(
  profile: SalaryProfile,
  expenses: Expense[],
  incomes: Income[],
  investments: Investment[],
  salaryHistory: { amount: number; date: string; confirmed?: boolean; source?: string }[] = [],
  now = new Date()
): FinanceSummary {
  const { daysRemaining, daysElapsed, cycleLength, nextSalary } = cycleInfo(
    profile,
    now
  );

  const cycleExpenses = expenses.filter((e) => isInCurrentCycle(e.date, profile, now));
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
  const fixedExpenses = cycleExpenses
    .filter((e) => FIXED[e.category])
    .reduce((s, e) => s + e.amount, 0);
  const variableExpenses = cycleExpenses
    .filter((e) => !FIXED[e.category])
    .reduce((s, e) => s + e.amount, 0);
  const totalExpenses = fixedExpenses + variableExpenses;

  const investedThisCycle = investments.reduce((s, i) => s + (i.monthly ?? 0), 0);

  const plannedSavings = profile.savingsGoal;
  const remaining = income - totalExpenses - investedThisCycle - plannedSavings;

  const safeToSpendPerDay = Math.max(0, remaining / daysRemaining);

  const todayKey = new Date(now).toDateString();
  const spentToday = cycleExpenses
    .filter((e) => new Date(e.date).toDateString() === todayKey)
    .reduce((s, e) => s + e.amount, 0);
  const safeToSpendToday = Math.max(0, safeToSpendPerDay - spentToday);

  let status: SpendStatus = "green";
  if (spentToday > safeToSpendPerDay * 1.15) status = "red";
  else if (spentToday > safeToSpendPerDay * 0.85) status = "yellow";

  const savings = Math.max(0, income - totalExpenses - investedThisCycle);
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  const healthScore = financialHealthScore({
    savingsRate,
    remaining,
    income,
    fixedExpenses,
    daysElapsed,
    cycleLength,
    totalExpenses,
  });

  return {
    income,
    fixedExpenses,
    variableExpenses,
    totalExpenses,
    investedThisCycle,
    savings,
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
  if (remaining <= 0) return "Achieved 🎉";
  const months = Math.ceil(remaining / goal.monthlyContribution);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function upcomingBills(bills: Bill[], now = new Date()): Bill[] {
  const day = now.getDate();
  return [...bills]
    .filter((b) => !b.paid)
    .sort((a, b) => {
      const da = a.dueDay >= day ? a.dueDay - day : a.dueDay + 31 - day;
      const db = b.dueDay >= day ? b.dueDay - day : b.dueDay + 31 - day;
      return da - db;
    });
}

export function statusColor(status: SpendStatus): string {
  return status === "green"
    ? "var(--success)"
    : status === "yellow"
    ? "var(--warning)"
    : "var(--danger)";
}

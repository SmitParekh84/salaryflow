"use client";

import { CategoryIcon } from "@/components/category-icon";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS } from "@/lib/theme";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { CashFlowChart, CategoryDonut, SpendTrendChart } from "@/features/analytics/charts";
import { SafeToSpendHero } from "@/features/dashboard/safe-to-spend-hero";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { SeedPrompt, TransactionList } from "@/features/expenses/transaction-list";
import { useSummary } from "@/hooks/use-summary";
import { billCycle } from "@/lib/bill-cycle";
import { projectedGoalDate, upcomingBills } from "@/lib/calculations";
import { currentFinancialYearStart, financialYearLabel } from "@/lib/financial-year";
import { buildFundingPlan } from "@/lib/funding-plan";
import { useFinanceStore } from "@/lib/store";
import { formatMoney, newestFirst } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarClock,
  CircleCheck,
  Hand,
  HeartPulse,
  ListChecks,
  PiggyBank,
  Plus,
  Receipt,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function DashboardView() {
  const profile = useFinanceStore((s) => s.profile);
  const expenses = useFinanceStore((s) => s.expenses);
  const goals = useFinanceStore((s) => s.goals);
  const bills = useFinanceStore((s) => s.bills);
  const accounts = useFinanceStore((s) => s.accounts);
  const creditCards = useFinanceStore((s) => s.creditCards);
  const incomes = useFinanceStore((s) => s.incomes);
  const investments = useFinanceStore((s) => s.investments);
  const salaryHistory = useFinanceStore((s) => s.salaryHistory);
  const activeBudgetRule = useFinanceStore((s) => s.budgetRules.find((rule) => rule.active));
  const summary = useSummary();
  const [addOpen, setAddOpen] = useState(false);

  const currency = profile.currency;
  const financialYearStart = profile.financialYearStart ?? currentFinancialYearStart();
  const topGoal = goals[0];
  const nextBills = upcomingBills(bills, expenses).slice(0, 3);
  const emergencyGoal = goals.find((goal) => goal.type === "Emergency Fund");
  const savingsAccount = accounts.find((account) => account.defaultFor?.includes("savings"));
  const emergency =
    emergencyGoal && savingsAccount
      ? { ...emergencyGoal, saved: savingsAccount.balance }
      : emergencyGoal;
  const fundingPlan = buildFundingPlan({
    accounts,
    bills,
    creditCards,
    expenses,
    incomes,
    investments,
    budgetRule: activeBudgetRule,
    monthlyIncome: summary.salaryIncome,
    savedThisCycle: summary.savedThisCycle,
  });
  const insights = buildInsights(summary, nextBills.length);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            Welcome back <Hand className="h-4 w-4" />
          </p>
          <p className="text-xs text-muted">{summary.daysRemaining} days until your next salary</p>
        </div>
        <div className="flex gap-2">
          {expenses.length === 0 && <SeedPrompt />}
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      <SafeToSpendHero summary={summary} currency={currency} />

      <div className="grid gap-px overflow-hidden rounded-2xl bg-border card-shadow sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Invested this cycle"
          value={formatMoney(summary.investedThisCycle, currency, true)}
          icon={TrendingUp}
          accent="var(--primary)"
          hint={`Target ${formatMoney(summary.investmentTarget, currency, true)}`}
          delay={0}
        />
        <StatCard
          label="Total spent"
          value={formatMoney(summary.totalExpenses, currency, true)}
          icon={Receipt}
          accent={CHART_COLORS.expense}
          hint={`Includes card purchases · Fixed ${formatMoney(summary.fixedExpenses, currency, true)}`}
          delay={0.05}
        />
        <StatCard
          label="Cash saved this cycle"
          value={formatMoney(summary.savedThisCycle, currency, true)}
          icon={PiggyBank}
          accent={CHART_COLORS.savings}
          hint={`Target ${formatMoney(summary.savingsTarget, currency, true)} · ${
            summary.savingsEvidence === "account" ? "net savings-account activity" : "goal deposits"
          }`}
          delay={0.1}
        />
        <StatCard
          label="Health score"
          value={`${summary.healthScore}/100`}
          icon={HeartPulse}
          accent={CHART_COLORS.goal}
          hint={healthLabel(summary.healthScore)}
          delay={0.15}
        />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Salary-day funding plan</p>
              <p className="text-xs text-muted">Cards, bills, SIPs, and your active savings rule</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-xl font-bold">{formatMoney(fundingPlan.total, currency)}</p>
            <Link href="/funding-plan" className="text-xs font-medium text-primary hover:underline">
              View transfers
            </Link>
          </div>
        </div>
      </Card>

      {summary.budgetRuleName && summary.budgetRuleScore !== undefined && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ListChecks className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{summary.budgetRuleName}</p>
                <p className="text-xs text-muted">Active budget rule · included in health score</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xl font-bold">{summary.budgetRuleScore}/100</p>
                <p className="text-[10px] text-muted">adherence</p>
              </div>
              <Link href="/rules" className="text-xs font-medium text-primary hover:underline">
                View rule
              </Link>
            </div>
          </div>
          <Progress
            value={summary.budgetRuleScore}
            className="mt-4"
            label={`${summary.budgetRuleName} adherence`}
            valueText={`${summary.budgetRuleScore} out of 100`}
          />
          {summary.budgetProgress && (
            <div className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  ["needs", "Needs", "Spent"],
                  ["wants", "Wants", "Spent"],
                  [
                    "savings",
                    "Cash savings",
                    summary.savingsEvidence === "account" ? "Net moved in" : "Goal deposits",
                  ],
                  ["investments", "Investments", "Invested"],
                ] as const
              ).map(([kind, label, usedLabel]) => {
                const progress = summary.budgetProgress?.[kind];
                const remaining = progress?.remaining ?? 0;
                return (
                  <div key={kind}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">{label}</p>
                      <p className="text-xs text-muted">
                        {formatMoney(progress?.target ?? 0, currency)} limit
                      </p>
                    </div>
                    <p className="mt-2 text-lg font-bold">
                      {formatMoney(progress?.used ?? 0, currency)}
                    </p>
                    <p className="text-[11px] text-muted">{usedLabel} this cycle</p>
                    <p
                      className={`mt-1 text-xs font-medium ${remaining < 0 ? "text-danger" : "text-success"}`}
                    >
                      {formatMoney(Math.abs(remaining), currency)}{" "}
                      {remaining < 0 ? "over" : "remaining"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Cash flow · {financialYearLabel(financialYearStart)}</CardTitle>
            <p className="mt-1 text-xs text-muted">
              Monthly confirmed salary and credits in, recorded spending out
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <CashFlowChart
            expenses={expenses}
            incomes={incomes}
            salaryHistory={salaryHistory}
            currency={currency}
            financialYearStart={financialYearStart}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Spending trend · 14 days</CardTitle>
            <span className="text-xs text-muted">
              {formatMoney(summary.spentToday, currency)} today
            </span>
          </CardHeader>
          <CardContent className="pt-2">
            <SpendTrendChart expenses={expenses} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut expenses={expenses} currency={currency} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent transactions</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {expenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No expenses yet"
                description="Add your first expense to see your safe-to-spend update instantly."
                action={
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4" /> Add expense
                  </Button>
                }
              />
            ) : (
              <TransactionList
                expenses={newestFirst(expenses).slice(0, 6)}
                currency={currency}
                compact
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Smart insights */}
          <Card>
            <CardHeader className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle>Smart insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-2">
              {insights.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex gap-2 rounded-xl bg-surface-2/60 p-3 text-xs"
                >
                  <Activity className="h-4 w-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming bills */}
          <Card>
            <CardHeader className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-warning" />
              <CardTitle>Upcoming bills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {nextBills.length === 0 && (
                <p className="flex items-center justify-center gap-1.5 py-4 text-xs text-muted">
                  <CircleCheck className="h-4 w-4 text-success" /> No pending bills
                </p>
              )}
              {nextBills.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CategoryIcon category={b.category} />
                    <span>{b.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatMoney(b.amount, currency)}</p>
                    <p className="text-[10px] text-muted">
                      {billCycle(b, expenses).occurrenceDate.toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Goals + emergency */}
      <div className="grid gap-4 lg:grid-cols-2">
        {topGoal && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Top goal · {topGoal.name}</CardTitle>
              <span className="text-xs text-muted">{projectedGoalDate(topGoal)}</span>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="mb-2 flex items-end justify-between">
                <span className="text-2xl font-bold">
                  {formatMoney(topGoal.saved, currency, true)}
                </span>
                <span className="text-xs text-muted">
                  of {formatMoney(topGoal.target, currency, true)}
                </span>
              </div>
              <Progress
                value={topGoal.target > 0 ? (topGoal.saved / topGoal.target) * 100 : 0}
                color="var(--primary)"
                label={`${topGoal.name} funding progress`}
                valueText={`${formatMoney(topGoal.saved, currency)} of ${formatMoney(topGoal.target, currency)}`}
              />
            </CardContent>
          </Card>
        )}

        {emergency && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Emergency fund</CardTitle>
              <span className="text-xs font-medium text-success">
                {Math.round((emergency.saved / emergency.target) * 100)}% funded
              </span>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="mb-2 flex items-end justify-between">
                <span className="text-2xl font-bold">
                  {formatMoney(emergency.saved, currency, true)}
                </span>
                <span className="text-xs text-muted">
                  target {formatMoney(emergency.target, currency, true)}
                </span>
              </div>
              <Progress
                value={emergency.target > 0 ? (emergency.saved / emergency.target) * 100 : 0}
                color="var(--success)"
                label="Emergency fund progress"
                valueText={`${formatMoney(emergency.saved, currency)} of ${formatMoney(emergency.target, currency)}`}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <ExpenseForm open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function healthLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs work";
}

function buildInsights(s: ReturnType<typeof useSummary>, billCount: number): string[] {
  const out: string[] = [];
  if (s.status === "red")
    out.push("You've spent more than today's budget. Try to slow down tomorrow.");
  else if (s.status === "green")
    out.push("Great pacing — you're spending within your daily safe limit.");
  out.push(`You can safely spend about ${formatMoney(s.safeToSpendPerDay)} per day until salary.`);
  if (s.savingsRate >= 20)
    out.push(`Strong ${Math.round(s.savingsRate)}% savings rate this cycle. Keep it up!`);
  else out.push(`Savings rate is ${Math.round(s.savingsRate)}%. Aim for 20%+ if you can.`);
  if (billCount > 0) out.push(`You have ${billCount} bill(s) coming up. Keep buffer aside.`);
  if (s.budgetRuleScore !== undefined && s.budgetRuleScore < 70)
    out.push(
      `${s.budgetRuleName} adherence is ${s.budgetRuleScore}/100. Review flexible spending.`,
    );
  return out.slice(0, 4);
}

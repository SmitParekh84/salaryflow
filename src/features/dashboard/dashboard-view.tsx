"use client";

import { CategoryIcon } from "@/components/category-icon";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  CashFlowChart,
  CategoryDonutStacked,
  SpendTrendChart,
} from "@/features/analytics/lazy-charts";
import { SafeToSpendHero } from "@/features/dashboard/safe-to-spend-hero";
import { CatchUpCard } from "@/features/expenses/catch-up-card";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { FuelCard } from "@/features/fuel/fuel-card";
import { SeedPrompt, TransactionList } from "@/features/expenses/transaction-list";
import { AllocationSheet } from "@/features/goals/allocation-sheet";
import { useSummary } from "@/hooks/use-summary";
import { goalSaved } from "@/lib/allocations";
import { billCycle } from "@/lib/bill-cycle";
import { projectedGoalDate, upcomingBills } from "@/lib/calculations";
import { currentFinancialYearStart, financialYearLabel } from "@/lib/financial-year";
import { buildFundingPlan } from "@/lib/funding-plan";
import { useFinanceStore } from "@/lib/store";
import { CHART_COLORS } from "@/lib/theme";
import { formatMoney, newestFirst } from "@/lib/utils";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Hand,
  HeartPulse,
  ListChecks,
  PiggyBank,
  Plus,
  Receipt,
  Repeat2,
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
  const [allocateOpen, setAllocateOpen] = useState(false);

  const currency = profile.currency;
  const financialYearStart = profile.financialYearStart ?? currentFinancialYearStart();
  const topGoal = goals[0];
  const nextBills = upcomingBills(bills, expenses).slice(0, 3);
  const emergencyGoal = goals.find((goal) => goal.type === "Emergency Fund");
  const savingsAccount =
    accounts.find(
      (account) => account.status === "active" && account.defaultFor?.includes("savings"),
    ) ?? accounts.find((account) => account.status === "active");
  // When the emergency fund *is* the top goal, the two cards were the same
  // number twice. The top-goal card already carries it, projected date included.
  const emergency = emergencyGoal && emergencyGoal.id !== topGoal?.id ? emergencyGoal : undefined;
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
  const recent = newestFirst(expenses).slice(0, 6);
  const topGoalPct =
    topGoal && topGoal.target > 0 ? (goalSaved(topGoal, accounts) / topGoal.target) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            Welcome back <Hand className="h-4 w-4 text-warning" />
          </p>
          <p className="text-xs text-muted">{summary.daysRemaining} days until your next salary</p>
        </div>
        <div className="flex gap-2">
          {expenses.length === 0 && <SeedPrompt />}
          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" /> Add
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                data-slot="dropdown-menu-content"
                align="end"
                sideOffset={8}
                collisionPadding={12}
                className="z-50 min-w-48 rounded-2xl bg-surface p-1.5 text-foreground card-shadow outline-none"
              >
                <DropdownMenuPrimitive.Item asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddOpen(true)}
                    className="w-full justify-start outline-none"
                  >
                    <Receipt className="h-4 w-4 text-muted" /> Expense
                  </Button>
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Item asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!savingsAccount}
                    onClick={() => setAllocateOpen(true)}
                    className="w-full justify-start outline-none"
                  >
                    <PiggyBank className="h-4 w-4 text-muted" /> Save to goal
                  </Button>
                </DropdownMenuPrimitive.Item>
                <DropdownMenuPrimitive.Item asChild>
                  <Link
                    href="/accounts"
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none focus:bg-surface-2"
                  >
                    <Repeat2 className="h-4 w-4 text-muted" /> Transfer money
                  </Link>
                </DropdownMenuPrimitive.Item>
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>
        </div>
      </div>

      {/* Renders nothing unless days are actually outstanding. */}
      <CatchUpCard />

      <SafeToSpendHero summary={summary} currency={currency} />

      <div className="grid gap-px overflow-hidden rounded-2xl bg-border card-shadow sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          row
          label="Invested this cycle"
          value={formatMoney(summary.investedThisCycle, currency, true)}
          icon={TrendingUp}
          accent="var(--primary)"
          hint={`Target ${formatMoney(summary.investmentTarget, currency, true)}`}
          delay={0}
        />
        <StatCard
          row
          label="Total spent"
          value={formatMoney(summary.totalExpenses, currency, true)}
          icon={Receipt}
          accent={CHART_COLORS.expense}
          hint={`Includes card purchases · Fixed ${formatMoney(summary.fixedExpenses, currency, true)}`}
          delay={0.05}
        />
        <StatCard
          row
          label="Cash saved this cycle"
          value={formatMoney(summary.savedThisCycle, currency, true)}
          icon={PiggyBank}
          accent={CHART_COLORS.savings}
          hint={`Target ${formatMoney(summary.savingsTarget, currency, true)} · net savings activity`}
          delay={0.1}
        />
        <StatCard
          row
          label="Health score"
          value={`${summary.healthScore}/100`}
          icon={HeartPulse}
          accent={CHART_COLORS.goal}
          hint={healthLabel(summary.healthScore)}
          delay={0.15}
        />
      </div>

      {/*
       * Two independent stacks rather than one flow of full-width bands. CSS
       * grid cannot pour items into whichever column is currently shortest, so
       * the split is assigned by hand: the money-movement narrative down the
       * left, the rule-and-signals rail on the right.
       */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <Card className="p-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Repeat2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Salary-day funding plan</p>
                <p className="text-xs text-muted">Cards, bills, SIPs, and your savings rule</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold leading-tight">
                  {formatMoney(fundingPlan.total, currency, true)}
                </p>
                <Link
                  href="/funding-plan"
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                >
                  View transfers <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Cash flow · {financialYearLabel(financialYearStart)}</CardTitle>
                <p className="mt-1 text-xs text-muted">Income vs spending</p>
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

          <Card>
            <CardHeader>
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
                <>
                  {/*
                   * Six rows in two columns keeps the card the height of the
                   * chart above it. The lists are split rather than wrapped so
                   * each stays newest-first top to bottom.
                   */}
                  <div className="grid gap-x-5 sm:grid-cols-2">
                    <TransactionList
                      expenses={recent.slice(0, 3)}
                      currency={currency}
                      compact
                      dense
                    />
                    {recent.length > 3 && (
                      <div className="border-t border-border sm:border-l sm:border-t-0 sm:pl-5">
                        <TransactionList
                          expenses={recent.slice(3)}
                          currency={currency}
                          compact
                          dense
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-1 border-t border-border pt-3 text-center">
                    <Link
                      href="/expenses"
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                    >
                      View all transactions <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {topGoal && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Top goal · {topGoal.name}</CardTitle>
                <span className="text-xs text-muted">{projectedGoalDate(topGoal, accounts)}</span>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="mb-2 flex items-end justify-between">
                  <span className="text-2xl font-bold">
                    {formatMoney(goalSaved(topGoal, accounts), currency, true)}
                  </span>
                  <span className="text-xs text-muted">
                    of {formatMoney(topGoal.target, currency, true)}
                  </span>
                </div>
                <Progress
                  value={topGoalPct}
                  color="var(--primary)"
                  label={`${topGoal.name} funding progress`}
                  valueText={`${formatMoney(goalSaved(topGoal, accounts), currency)} of ${formatMoney(topGoal.target, currency)}`}
                />
                <p className="mt-2 text-[11px] text-muted">
                  {Math.round(Math.min(100, topGoalPct))}% completed
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4 lg:col-span-7">
          {summary.budgetRuleName && summary.budgetRuleScore !== undefined && (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{summary.budgetRuleName}</p>
                    <p className="text-xs text-muted">
                      Active budget rule · included in health score
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-bold">{summary.budgetRuleScore}/100</p>
                    <p className="text-[10px] text-muted">adherence</p>
                  </div>
                  <Link
                    href="/rules"
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                  >
                    View rule <ChevronRight className="h-3 w-3" />
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
                      ["savings", "Cash savings", "Saved"],
                      ["investments", "Investments", "Invested"],
                    ] as const
                  ).map(([kind, label, usedLabel]) => {
                    const progress = summary.budgetProgress?.[kind];
                    const remaining = progress?.remaining ?? 0;
                    return (
                      <div key={kind}>
                        <p className="text-xs font-semibold">{label}</p>
                        <p className="text-[11px] text-muted">
                          {formatMoney(progress?.target ?? 0, currency, true)} limit
                        </p>
                        <p className="mt-2 text-lg font-bold">
                          {formatMoney(progress?.used ?? 0, currency, true)}
                        </p>
                        <p className="text-[11px] text-muted">{usedLabel} this cycle</p>
                        <p
                          className={`mt-1 text-xs font-medium ${remaining < 0 ? "text-danger" : "text-success"}`}
                        >
                          {formatMoney(Math.abs(remaining), currency, true)}{" "}
                          {remaining < 0 ? "over" : "remaining"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/*
           * `items-start` because the rail beside it is three cards tall: a
           * stretched donut card would hold a chart's worth of content in a
           * box twice that height, and the empty half reads as a rendering
           * failure rather than as breathing room.
           */}
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>By category</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryDonutStacked expenses={expenses} currency={currency} stacked />
              </CardContent>
            </Card>

            <div className="space-y-4">
              {/* Fuel — renders nothing until there is a fill to report on. */}
              <FuelCard />

              <Card>
                <CardHeader className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <CardTitle>Smart insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-2">
                  {insights.map((t, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex gap-2 rounded-xl bg-surface-2/60 p-2.5 text-[11px] leading-snug"
                    >
                      <Activity className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{t}</span>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>

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
                    <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <CategoryIcon category={b.category} />
                        <span className="truncate">{b.name}</span>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">{formatMoney(b.amount, currency, true)}</p>
                        <p className="text-[10px] text-muted">
                          {billCycle(b, expenses).occurrenceDate.toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {nextBills.length > 0 && (
                    <div className="border-t border-border pt-3 text-center">
                      <Link
                        href="/bills"
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                      >
                        View all bills <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {emergency && (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Emergency fund</CardTitle>
                <span className="text-xs font-medium text-success">
                  {emergency.target > 0
                    ? Math.round((goalSaved(emergency, accounts) / emergency.target) * 100)
                    : 0}
                  % funded
                </span>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="mb-2 flex items-end justify-between">
                  <span className="text-2xl font-bold">
                    {formatMoney(goalSaved(emergency, accounts), currency, true)}
                  </span>
                  <span className="text-xs text-muted">
                    target {formatMoney(emergency.target, currency, true)}
                  </span>
                </div>
                <Progress
                  value={
                    emergency.target > 0
                      ? (goalSaved(emergency, accounts) / emergency.target) * 100
                      : 0
                  }
                  color="var(--success)"
                  label="Emergency fund progress"
                  valueText={`${formatMoney(goalSaved(emergency, accounts), currency)} of ${formatMoney(emergency.target, currency)}`}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/*
       * The reference render dropped the 14-day trend entirely. It is the only
       * day-level view on the page — the donut has no time axis and cash flow is
       * monthly — so it keeps its place, full width at the foot where a wide
       * plot of narrow bars reads best.
       */}
      <Card>
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

      <ExpenseForm open={addOpen} onClose={() => setAddOpen(false)} />
      {savingsAccount && (
        <AllocationSheet
          open={allocateOpen}
          onClose={() => setAllocateOpen(false)}
          accountId={savingsAccount.id}
          title="Save to a goal"
        />
      )}
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

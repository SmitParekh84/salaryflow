"use client";

import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_COLORS } from "@/lib/theme";
import {
  CategoryDonut,
  IncomeExpenseBars,
  MonthlyBars,
  SpendTrendChart,
} from "@/features/analytics/charts";
import { useSummary } from "@/hooks/use-summary";
import {
  currentFinancialYearStart,
  financialYearLabel,
  financialYearMonths,
  isInFinancialYear,
} from "@/lib/financial-year";
import { useFinanceStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";
import { ArrowLeftRight, PiggyBank, TrendingDown, Wallet } from "lucide-react";
import { useMemo } from "react";

export function AnalyticsView() {
  const expenses = useFinanceStore((s) => s.expenses);
  const currency = useFinanceStore((s) => s.profile.currency);
  const salary = useFinanceStore((s) => s.profile.amount);
  const financialYearStart = useFinanceStore(
    (s) => s.profile.financialYearStart ?? currentFinancialYearStart(),
  );
  const summary = useSummary();
  const visibleExpenses = useMemo(
    () => expenses.filter((expense) => isInFinancialYear(expense.date, financialYearStart)),
    [expenses, financialYearStart],
  );

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (const month of financialYearMonths(financialYearStart)) {
      map.set(month.key, 0);
    }
    for (const e of visibleExpenses) {
      const date = new Date(e.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    return financialYearMonths(financialYearStart).map((month) => ({
      label: month.label,
      income: salary,
      expense: Math.round(map.get(month.key) ?? 0),
    }));
  }, [financialYearStart, salary, visibleExpenses]);

  const avgDaily = summary.totalExpenses / Math.max(1, summary.daysElapsed + 1);

  return (
    <div className="space-y-5">
      <div className="grid gap-px overflow-hidden rounded-2xl bg-border card-shadow sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cycle income"
          value={formatMoney(summary.income, currency, true)}
          icon={Wallet}
          accent="var(--primary)"
        />
        <StatCard
          label="Cycle expenses"
          value={formatMoney(summary.totalExpenses, currency, true)}
          icon={TrendingDown}
          accent={CHART_COLORS.expense}
        />
        <StatCard
          label="Savings rate"
          value={`${Math.round(summary.savingsRate)}%`}
          icon={PiggyBank}
          accent={CHART_COLORS.savings}
        />
        <StatCard
          label="Avg / day"
          value={formatMoney(avgDaily, currency, true)}
          icon={ArrowLeftRight}
          accent={CHART_COLORS.goal}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs expense · {financialYearLabel(financialYearStart)}</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyBars data={monthly} currency={currency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>This cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeExpenseBars
              income={summary.income}
              expenses={summary.totalExpenses}
              savings={summary.savings}
              currency={currency}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily spending · 14 days</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <SpendTrendChart expenses={visibleExpenses} currency={currency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut expenses={visibleExpenses} currency={currency} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

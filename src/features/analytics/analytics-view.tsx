"use client";

import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CategoryDonut,
  IncomeExpenseBars,
  MonthlyBars,
  SpendTrendChart,
} from "@/features/analytics/charts";
import { useSummary } from "@/hooks/use-summary";
import { useFinanceStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";
import { ArrowLeftRight, PiggyBank, TrendingDown, Wallet } from "lucide-react";
import { useMemo } from "react";

export function AnalyticsView() {
  const expenses = useFinanceStore((s) => s.expenses);
  const currency = useFinanceStore((s) => s.profile.currency);
  const salary = useFinanceStore((s) => s.profile.amount);
  const summary = useSummary();

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      map.set(d.toLocaleDateString("en-US", { month: "short" }), 0);
    }
    for (const e of expenses) {
      const key = new Date(e.date).toLocaleDateString("en-US", { month: "short" });
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    return Array.from(map.entries()).map(([label, expense]) => ({
      label,
      income: salary,
      expense: Math.round(expense),
    }));
  }, [expenses, salary]);

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
          accent="#f97316"
        />
        <StatCard
          label="Savings rate"
          value={`${Math.round(summary.savingsRate)}%`}
          icon={PiggyBank}
          accent="#22c55e"
        />
        <StatCard
          label="Avg / day"
          value={formatMoney(avgDaily, currency, true)}
          icon={ArrowLeftRight}
          accent="#a855f7"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs expense · 6 months</CardTitle>
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
            <SpendTrendChart expenses={expenses} currency={currency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Category breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut expenses={expenses} currency={currency} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { getCategoryColor } from "@/components/category-icon";
import { useFinanceStore } from "@/lib/store";
import type { Expense, Income, SalaryHistoryEntry } from "@/lib/types";
import { formatMoney, parseFinancialDate } from "@/lib/utils";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

export function SpendTrendChart({
  expenses,
  currency,
  days = 14,
}: {
  expenses: Expense[];
  currency: string;
  days?: number;
}) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toDateString(), 0);
    }
    for (const e of expenses) {
      const key = new Date(e.date).toDateString();
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    return Array.from(map.entries()).map(([k, v]) => ({
      label: new Date(k).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      }),
      amount: Math.round(v),
    }));
  }, [expenses, days]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(v) => [formatMoney(Number(v), currency), "Spent"]}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill="url(#spendGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CashFlowChart({
  expenses,
  incomes,
  salaryHistory,
  currency,
}: {
  expenses: Expense[];
  incomes: Income[];
  salaryHistory: SalaryHistoryEntry[];
  currency: string;
}) {
  const data = useMemo(() => {
    const today = new Date();
    const points = new Map<string, { date: Date; inflow: number; outflow: number }>();

    for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
      const date = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      points.set(key, { date, inflow: 0, outflow: 0 });
    }

    for (const salary of salaryHistory) {
      if (!salary.confirmed) continue;
      const date = parseFinancialDate(salary.date);
      const point = points.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (point) point.inflow += salary.amount;
    }

    for (const income of incomes) {
      const date = parseFinancialDate(income.date);
      const point = points.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (point) point.inflow += income.amount;
    }

    for (const expense of expenses) {
      const date = parseFinancialDate(expense.date);
      const point = points.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (point) point.outflow += expense.amount;
    }

    return Array.from(points.values()).map((point) => ({
      label: point.date.toLocaleDateString("en-US", { month: "short" }),
      inflow: Math.round(point.inflow),
      outflow: Math.round(point.outflow),
    }));
  }, [expenses, incomes, salaryHistory]);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={20}
        />
        <Tooltip
          cursor={{ fill: "color-mix(in srgb, var(--muted) 10%, transparent)" }}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(value, name) => [
            formatMoney(Number(value), currency),
            name === "inflow" ? "Money in" : "Money out",
          ]}
        />
        <Legend
          formatter={(value) => (value === "inflow" ? "Money in" : "Money out")}
          wrapperStyle={{ fontSize: 11 }}
        />
        <Bar dataKey="inflow" fill="var(--success)" radius={[5, 5, 0, 0]} maxBarSize={34} />
        <Bar dataKey="outflow" fill="#f97316" radius={[5, 5, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({ expenses, currency }: { expenses: Expense[]; currency: string }) {
  const storedCustomCategories = useFinanceStore((state) => state.profile.customCategories);
  const data = useMemo(() => {
    const customCategories = storedCustomCategories ?? [];
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
        color: getCategoryColor(name, customCategories),
      }))
      .sort((a, b) => b.value - a.value);
  }, [storedCustomCategories, expenses]);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-muted">
        No spending yet
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={200} className="!w-[200px] shrink-0">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={90}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(v) => formatMoney(Number(v), currency)}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid w-full grid-cols-1 gap-1.5">
        {data.slice(0, 6).map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="font-medium text-muted">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IncomeExpenseBars({
  income,
  expenses,
  savings,
  currency,
}: {
  income: number;
  expenses: number;
  savings: number;
  currency: string;
}) {
  const data = [
    { name: "Income", value: Math.round(income), color: "var(--primary)" },
    { name: "Expenses", value: Math.round(expenses), color: "#f97316" },
    { name: "Savings", value: Math.round(savings), color: "var(--success)" },
  ];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "color-mix(in srgb, var(--muted) 10%, transparent)" }}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(v) => formatMoney(Number(v), currency)}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={56}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBars({
  data,
  currency,
}: {
  data: { label: string; income: number; expense: number }[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "color-mix(in srgb, var(--muted) 10%, transparent)" }}
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(v) => formatMoney(Number(v), currency)}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="income" name="Income" fill="var(--primary)" radius={[6, 6, 0, 0]} />
        <Bar dataKey="expense" name="Expense" fill="#f97316" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

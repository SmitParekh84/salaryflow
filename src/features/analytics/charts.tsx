"use client";

import { getCategoryColor } from "@/components/category-icon";
import { financialYearMonths } from "@/lib/financial-year";
import type { FuelSegment } from "@/lib/fuel";
import type { CashFlow, CategoryDetail } from "@/lib/reports";
import { CHART_COLORS } from "@/lib/theme";
import { useFinanceStore } from "@/lib/store";
import type { Expense, Income, SalaryHistoryEntry } from "@/lib/types";
import { cn, currencySymbol, formatMoney, parseFinancialDate } from "@/lib/utils";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Axis ticks, not prose. `formatMoney` prints every digit — six of them per tick
 * eats the plot area, so an axis gets ₹1L / ₹75K instead. Lakh/crore steps
 * because the axis is read next to amounts the rest of the app writes that way.
 */
function compactMoney(value: number, currency: string): string {
  const symbol = currencySymbol(currency);
  const abs = Math.abs(value);
  const indian = currency === "INR";
  const round = (n: number) => Number(n.toFixed(n < 10 ? 1 : 0));

  if (indian && abs >= 1e7) return `${symbol}${round(value / 1e7)}Cr`;
  if (indian && abs >= 1e5) return `${symbol}${round(value / 1e5)}L`;
  if (!indian && abs >= 1e6) return `${symbol}${round(value / 1e6)}M`;
  if (abs >= 1000) return `${symbol}${round(value / 1000)}K`;
  return `${symbol}${Math.round(value)}`;
}

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
      // parseFinancialDate, not `new Date`: a date-only "2026-09-03" parses as
      // UTC midnight and buckets into the previous day west of UTC, so the same
      // expense landed on a different bar than the "spent today" figure the
      // dashboard prints in this card's header (that one parses it correctly).
      const key = parseFinancialDate(e.date).toDateString();
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
  financialYearStart,
}: {
  expenses: Expense[];
  incomes: Income[];
  salaryHistory: SalaryHistoryEntry[];
  currency: string;
  financialYearStart: number;
}) {
  const data = useMemo(() => {
    const points = new Map<string, { date: Date; inflow: number; outflow: number }>();

    for (const month of financialYearMonths(financialYearStart)) {
      points.set(month.key, { date: month.date, inflow: 0, outflow: 0 });
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
  }, [expenses, financialYearStart, incomes, salaryHistory]);

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
        {/* Bars alone say which month was heavier; the axis says by how much. */}
        <YAxis
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
          width={46}
          tickFormatter={(value) => compactMoney(Number(value), currency)}
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
            name === "inflow" ? "Income" : "Spending",
          ]}
        />
        {/*
         * Recharts paints legend labels in their series colour, which put
         * "Spending" on screen as orange-on-white at 2.8:1. The swatch beside it
         * already carries the colour; the word only has to be readable.
         */}
        <Legend
          formatter={(value) => (
            <span style={{ color: "var(--foreground)" }}>
              {value === "inflow" ? "Income" : "Spending"}
            </span>
          )}
          wrapperStyle={{ fontSize: 11 }}
        />
        <Bar dataKey="inflow" fill={CHART_COLORS.income} radius={[5, 5, 0, 0]} maxBarSize={34} />
        <Bar dataKey="outflow" fill={CHART_COLORS.expense} radius={[5, 5, 0, 0]} maxBarSize={34} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({
  expenses,
  currency,
  stacked = false,
}: {
  expenses: Expense[];
  currency: string;
  /**
   * Legend below the chart in two columns instead of beside it. `sm:` variants
   * key off the viewport, not the container, so a half-width card on a desktop
   * still gets the side-by-side legend — and at ~320px that squeezes the labels
   * down to a single letter. Cards narrower than the chart pass this.
   */
  stacked?: boolean;
}) {
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
    <div
      className={
        stacked
          ? "flex flex-col items-center gap-3"
          : "flex flex-col items-center gap-4 sm:flex-row"
      }
    >
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
      <div className={cn("grid w-full gap-1.5", stacked ? "grid-cols-2" : "grid-cols-1")}>
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

/**
 * Mileage per fill, oldest first.
 *
 * Only included segments are plotted. A flagged one is nearly always the
 * artefact of a fill that went unrecorded, and drawing it would put a spike on
 * the chart that describes the user's record-keeping rather than their bike.
 */
export function MileageTrendChart({ segments }: { segments: FuelSegment[] }) {
  const data = useMemo(
    () =>
      segments
        .filter((segment) => segment.included)
        .map((segment) => ({
          label: parseFinancialDate(segment.date).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
          }),
          kmpl: Number(segment.kmpl.toFixed(1)),
        })),
    [segments],
  );

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          tickLine={false}
          axisLine={false}
          width={34}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(value) => [`${Number(value)} kmpl`, "Mileage"]}
        />
        <Line
          type="monotone"
          dataKey="kmpl"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const BUCKET_FILL: Record<string, string> = {
  incoming: "var(--primary)",
  investments: CHART_COLORS.goal,
  spends: CHART_COLORS.expense,
  unlinked: "var(--warning)",
};

export function CashFlowBars({ flow, currency }: { flow: CashFlow; currency: string }) {
  const data = useMemo(
    () =>
      flow.buckets.map((bucket) => ({
        ...bucket,
        value: Math.round(bucket.amount),
      })),
    [flow],
  );

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted)" }}
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
          formatter={(value) => formatMoney(Number(value), currency)}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((bucket) => (
            <Cell key={bucket.key} fill={BUCKET_FILL[bucket.key] ?? "var(--primary)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Six months of one category, with the current one picked out.
 *
 * The average line is drawn across every month shown, so a category with gaps
 * is compared against the whole window rather than only the months it appeared
 * in.
 */
export function CategoryMonthlyBars({
  detail,
  currency,
}: {
  detail: CategoryDetail;
  currency: string;
}) {
  const data = useMemo(
    () =>
      detail.monthly.map((month) => ({
        ...month,
        value: Math.round(month.amount),
      })),
    [detail],
  );

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 20, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--muted)" }}
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
          formatter={(value) => formatMoney(Number(value), currency)}
        />
        <ReferenceLine
          y={Math.round(detail.average)}
          stroke="var(--success)"
          strokeDasharray="4 4"
          label={{
            value: `AVG ${formatMoney(detail.average, currency)}`,
            position: "insideTopLeft",
            fontSize: 10,
            fill: "var(--success)",
          }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((month) => (
            <Cell
              key={month.label}
              fill={
                month.current
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--muted) 25%, transparent)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

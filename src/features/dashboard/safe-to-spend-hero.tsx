"use client";

import { Card } from "@/components/ui/card";
import type { FinanceSummary } from "@/lib/calculations";
import { statusColor } from "@/lib/calculations";
import { formatMoney } from "@/lib/utils";
import { motion } from "framer-motion";
import { CalendarDays, TrendingDown, TrendingUp } from "lucide-react";

export function SafeToSpendHero({
  summary,
  currency,
}: {
  summary: FinanceSummary;
  currency: string;
}) {
  const color = statusColor(summary.status);
  const pct =
    summary.safeToSpendPerDay > 0
      ? Math.min(100, (summary.spentToday / summary.safeToSpendPerDay) * 100)
      : summary.spentToday > 0
      ? 100
      : 0;

  const label =
    summary.status === "green"
      ? "You're on track 🎯"
      : summary.status === "yellow"
      ? "Watch your pace ⚠️"
      : "Overspending today 🚨";

  return (
    <Card glass className="relative overflow-hidden p-6 sm:p-8">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: color }}
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Safe to spend today
          </p>
          <motion.p
            key={Math.round(summary.safeToSpendToday)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 text-5xl font-bold tracking-tight sm:text-6xl"
            style={{ color }}
          >
            {formatMoney(summary.safeToSpendToday, currency)}
          </motion.p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                color,
              }}
            >
              {summary.status === "red" ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              {label}
            </span>

            {summary.usedConfirmedSalary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
                <svg className="h-3 w-3 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Using confirmed salary
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              Days to salary
            </div>
            <p className="mt-1 text-2xl font-bold">{summary.daysRemaining}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Balance left</p>
            <p className="mt-1 text-2xl font-bold">
              {formatMoney(Math.max(0, summary.remaining), currency, true)}
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-6">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
          <span>Spent today {formatMoney(summary.spentToday, currency)}</span>
          <span>Daily budget {formatMoney(summary.safeToSpendPerDay, currency)}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
    </Card>
  );
}

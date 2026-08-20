"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { FinanceSummary } from "@/lib/calculations";
import { statusColor } from "@/lib/calculations";
import { formatMoney } from "@/lib/utils";
import { motion } from "framer-motion";
import { CalendarDays, Check, TrendingDown, TrendingUp } from "lucide-react";

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
      ? "You're on track"
      : summary.status === "yellow"
        ? "Watch your pace"
        : "Overspending today";

  return (
    <Card glass className="relative overflow-hidden p-6 sm:p-8">
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
                <Check className="h-3 w-3 text-success" />
                Using confirmed salary
              </span>
            )}
            {summary.budgetRuleName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {formatMoney(summary.savingsTarget, currency)} cash +{" "}
                {formatMoney(summary.investmentTarget, currency)} investments protected
              </span>
            )}
          </div>
        </div>

        {/* The rule keeps the two smaller figures reading as a separate group
            rather than as a continuation of the headline number. */}
        <div className="flex gap-6 sm:border-l sm:border-border sm:pl-6">
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
        <Progress
          value={pct}
          color={color}
          className="h-2.5"
          label="Daily spending budget used"
          valueText={`${formatMoney(summary.spentToday, currency)} spent of ${formatMoney(summary.safeToSpendPerDay, currency)}`}
        />
      </div>
    </Card>
  );
}

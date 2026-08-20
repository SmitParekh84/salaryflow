"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CashFlowBars } from "@/features/analytics/lazy-charts";
import { FuelReport } from "@/features/fuel/fuel-report";
import { ReportFilters } from "@/features/reports/report-filters";
import { useReportInput } from "@/features/reports/use-report-input";
import { cashFlow } from "@/lib/reports";
import { formatMoney } from "@/lib/utils";
import { ChevronRight, Receipt } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export function CashFlowView() {
  const { input, range, currency } = useReportInput();
  const params = useSearchParams();
  const flow = useMemo(() => cashFlow(input, range), [input, range]);
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  const anyActivity = flow.buckets.some((bucket) => bucket.amount > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Your cash flow</h1>
        <div className="mt-3">
          <ReportFilters />
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          {anyActivity ? (
            <CashFlowBars flow={flow} currency={currency} />
          ) : (
            <EmptyState
              icon={Receipt}
              title="Nothing recorded in this range"
              description="Pick a wider range, or add an expense to see it here."
            />
          )}
          <p className="text-xs font-medium text-primary">
            Current bank balance is {formatMoney(flow.bankBalance, currency)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {flow.buckets.map((bucket) => (
            <Link
              key={bucket.key}
              href={`/analytics/${bucket.key}${suffix}`}
              className="flex items-center gap-3 px-5 py-4 hover:bg-surface-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{bucket.label}</span>
                <span className="mt-0.5 block text-xs text-success">
                  Avg per month {formatMoney(bucket.perMonth, currency)}
                </span>
              </span>
              <span className="text-sm font-bold tabular-nums">
                {formatMoney(bucket.amount, currency)}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <FuelReport />
    </div>
  );
}

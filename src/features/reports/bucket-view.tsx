"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ReportFilters } from "@/features/reports/report-filters";
import { useReportInput } from "@/features/reports/use-report-input";
import { BUCKET_LABELS, type BucketKey, bucketBreakdown } from "@/lib/reports";
import { CHART_COLORS } from "@/lib/theme";
import { formatMoney } from "@/lib/utils";
import { ArrowLeft, ChevronRight, Receipt } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

/** Shades of one hue, so the list reads as parts of a single whole. */
const SLICE_TINTS = [1, 0.8, 0.62, 0.46, 0.32, 0.2];

export function BucketView({ bucket }: { bucket: BucketKey }) {
  const { input, range, currency } = useReportInput();
  const params = useSearchParams();
  const rows = useMemo(() => bucketBreakdown(input, range, bucket), [input, range, bucket]);
  const query = params.toString();
  const suffix = query ? `?${query}` : "";
  const total = rows.reduce((running, row) => running + row.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/analytics${suffix}`} aria-label="Back to cash flow">
          <ArrowLeft className="h-5 w-5 text-muted" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">{BUCKET_LABELS[bucket]}</h1>
      </div>

      <ReportFilters />

      <Card>
        <CardContent className="space-y-2 p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{range.label}</p>
          <p className="text-3xl font-bold tracking-tight">{formatMoney(total, currency)}</p>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={`No ${BUCKET_LABELS[bucket].toLowerCase()} in this range`}
          description="Try a wider range from the filter above."
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {rows.map((row, index) => (
              <Link
                key={row.key}
                href={`/analytics/${bucket}/${encodeURIComponent(row.key)}${suffix}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-surface-2"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{
                    background: CHART_COLORS.expense,
                    opacity: SLICE_TINTS[Math.min(index, SLICE_TINTS.length - 1)],
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{row.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {row.percent.toFixed(1)}%
                  </span>
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {formatMoney(row.amount, currency)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

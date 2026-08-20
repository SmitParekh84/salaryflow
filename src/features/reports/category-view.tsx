"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryMonthlyBars } from "@/features/analytics/lazy-charts";
import { ExpenseForm } from "@/features/expenses/expense-form";
import { TransactionList } from "@/features/expenses/transaction-list";
import { ReportFilters } from "@/features/reports/report-filters";
import { useReportInput } from "@/features/reports/use-report-input";
import { BUCKET_LABELS, type BucketKey, categoryDetail } from "@/lib/reports";
import { useFinanceStore } from "@/lib/store";
import type { Expense } from "@/lib/types";
import { formatDate, formatMoney, parseFinancialDate } from "@/lib/utils";
import { ArrowLeft, Receipt } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export function CategoryView({ bucket, category }: { bucket: BucketKey; category: string }) {
  const { input, range, currency } = useReportInput();
  const params = useSearchParams();
  const storedExpenses = useFinanceStore((state) => state.expenses);
  const [highToLow, setHighToLow] = useState(true);
  const [editing, setEditing] = useState<Expense | null>(null);
  const detail = useMemo(
    () => categoryDetail(input, range, bucket, category),
    [input, range, bucket, category],
  );
  const query = params.toString();
  const suffix = query ? `?${query}` : "";

  const transactions = useMemo(() => {
    if (!detail) return [];
    return [...detail.transactions].sort((a, b) =>
      highToLow
        ? b.amount - a.amount
        : parseFinancialDate(b.date).getTime() - parseFinancialDate(a.date).getTime(),
    );
  }, [detail, highToLow]);

  /*
   * The incoming bucket lists salary credits and other income, which are not
   * expenses and have no editor here — those rows stay read-only. Everything
   * else resolves back to a stored expense by id; if any row cannot be
   * resolved, the list stays read-only rather than silently dropping it.
   */
  const editableRows = useMemo(() => {
    if (bucket === "incoming") return null;
    const byId = new Map(storedExpenses.map((expense) => [expense.id, expense]));
    const rows = transactions
      .map((transaction) => byId.get(transaction.id))
      .filter((expense): expense is Expense => Boolean(expense));
    return rows.length === transactions.length ? rows : null;
  }, [bucket, storedExpenses, transactions]);

  const back = (
    <div className="flex items-center gap-3">
      <Link href={`/analytics/${bucket}${suffix}`} aria-label={`Back to ${BUCKET_LABELS[bucket]}`}>
        <ArrowLeft className="h-5 w-5 text-muted" />
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">{detail?.label ?? category}</h1>
    </div>
  );

  // A key that no longer matches anything is not a 404: it was valid until the
  // record behind it was deleted or the range moved past it.
  if (!detail) {
    return (
      <div className="space-y-5">
        {back}
        <EmptyState
          icon={Receipt}
          title="Nothing here"
          description="This category has no records in the selected range."
          action={
            <Link href={`/analytics/${bucket}${suffix}`}>
              <Button size="sm" variant="secondary">
                Back to {BUCKET_LABELS[bucket]}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {back}
      <ReportFilters />

      <Card>
        <CardContent className="p-5">
          <CategoryMonthlyBars detail={detail} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Total amount</p>
              <p className="mt-1 text-2xl font-bold tracking-tight">
                {formatMoney(detail.total, currency)}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setHighToLow((now) => !now)}>
              {highToLow ? "High to low" : "Newest first"}
            </Button>
          </div>

          {transactions.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing recorded in this range.</p>
          ) : editableRows ? (
            /*
             * Every row in these three buckets is an expense that exists in the
             * store, so the list is the same component the expenses page uses:
             * tapping a row opens it for editing, and each row carries the
             * favourite and delete actions. Reaching a transaction through a
             * report and then having to go find it again to change it was the
             * one dead end in the drill-down.
             */
            <div className="mt-2">
              <TransactionList expenses={editableRows} currency={currency} onEdit={setEditing} />
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{transaction.label}</span>
                    <span className="mt-0.5 block text-xs text-muted">{transaction.sublabel}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular-nums">
                      {formatMoney(transaction.amount, currency)}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {formatDate(transaction.date)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ExpenseForm open={editing !== null} onClose={() => setEditing(null)} editing={editing} />
    </div>
  );
}

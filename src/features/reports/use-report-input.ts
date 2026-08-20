"use client";

import { type ReportInput, type ReportRangeKey, reportRange } from "@/lib/reports";
import { useFinanceStore } from "@/lib/store";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

const RANGE_KEYS: ReportRangeKey[] = ["cycle", "month", "quarter", "fy"];

export const RANGE_LABELS: Record<ReportRangeKey, string> = {
  cycle: "This cycle",
  month: "This month",
  quarter: "Last 3 months",
  fy: "Financial year",
};

/**
 * Filters live in the query string, not in component state.
 *
 * Every level reads them the same way, they survive a refresh, and a link to a
 * filtered report opens filtered. Holding them in state would reset the filter
 * on every drill-down, which is exactly when it matters most.
 */
export function useReportInput() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useFinanceStore((state) => state.profile);
  const expenses = useFinanceStore((state) => state.expenses);
  const incomes = useFinanceStore((state) => state.incomes);
  const salaryHistory = useFinanceStore((state) => state.salaryHistory);
  const accounts = useFinanceStore((state) => state.accounts);

  const requestedRange = (params.get("range") ?? "cycle") as ReportRangeKey;
  const rangeKey = RANGE_KEYS.includes(requestedRange) ? requestedRange : "cycle";

  const requestedAccount = params.get("account") ?? "all";
  // A filter naming an account that has since been deleted would silently show
  // an empty report, so it falls back to showing everything.
  const accountId =
    requestedAccount !== "all" && accounts.some((account) => account.id === requestedAccount)
      ? requestedAccount
      : undefined;

  const input: ReportInput = useMemo(
    () => ({ profile, expenses, incomes, salaryHistory, accounts, accountId }),
    [profile, expenses, incomes, salaryHistory, accounts, accountId],
  );

  const range = useMemo(() => reportRange(profile, rangeKey), [profile, rangeKey]);

  const setParam = useCallback(
    (name: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value === "" || value === "all") next.delete(name);
      else next.set(name, value);
      const query = next.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [params, router],
  );

  return {
    input,
    range,
    accountId,
    currency: profile.currency,
    setRange: (key: ReportRangeKey) => setParam("range", key),
    setAccount: (id: string) => setParam("account", id),
  };
}

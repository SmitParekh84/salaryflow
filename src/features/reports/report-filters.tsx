"use client";

import { Select } from "@/components/ui/input";
import { RANGE_LABELS, useReportInput } from "@/features/reports/use-report-input";
import type { ReportRangeKey } from "@/lib/reports";
import { useFinanceStore } from "@/lib/store";

export function ReportFilters() {
  const accounts = useFinanceStore((state) => state.accounts);
  const { range, accountId, setRange, setAccount } = useReportInput();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Accounts"
        className="w-auto"
        value={accountId ?? "all"}
        onChange={(event) => setAccount(event.target.value)}
      >
        <option value="all">All accounts</option>
        {accounts
          .filter((account) => account.status === "active")
          .map((account) => (
            <option key={account.id} value={account.id}>
              {account.bankName}
            </option>
          ))}
      </Select>
      <Select
        aria-label="Date range"
        className="w-auto"
        value={range.key}
        onChange={(event) => setRange(event.target.value as ReportRangeKey)}
      >
        {(Object.keys(RANGE_LABELS) as ReportRangeKey[]).map((key) => (
          <option key={key} value={key}>
            {RANGE_LABELS[key]}
          </option>
        ))}
      </Select>
      <span className="text-xs text-muted">{range.label}</span>
    </div>
  );
}

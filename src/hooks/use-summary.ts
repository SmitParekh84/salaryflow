"use client";

import { computeSummary } from "@/lib/calculations";
import { useFinanceStore } from "@/lib/store";
import { useMemo } from "react";

export function useSummary() {
  const profile = useFinanceStore((s) => s.profile);
  const expenses = useFinanceStore((s) => s.expenses);
  const incomes = useFinanceStore((s) => s.incomes);
  const investments = useFinanceStore((s) => s.investments);
  const salaryHistory = useFinanceStore((s) => (s as any).salaryHistory);

  return useMemo(
    () => computeSummary(profile, expenses, incomes, investments, salaryHistory),
    [profile, expenses, incomes, investments, salaryHistory]
  );
}

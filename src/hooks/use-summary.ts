"use client";

import { computeSummary } from "@/lib/calculations";
import { useFinanceStore } from "@/lib/store";
import { useMemo } from "react";

export function useSummary() {
  const profile = useFinanceStore((s) => s.profile);
  const expenses = useFinanceStore((s) => s.expenses);
  const incomes = useFinanceStore((s) => s.incomes);
  const investments = useFinanceStore((s) => s.investments);
  const goals = useFinanceStore((s) => s.goals);
  const salaryHistory = useFinanceStore((s) => s.salaryHistory);
  const activeBudgetRule = useFinanceStore((s) => s.budgetRules.find((rule) => rule.active));

  return useMemo(
    () =>
      computeSummary(profile, expenses, incomes, investments, goals, salaryHistory, activeBudgetRule),
    [profile, expenses, incomes, investments, goals, salaryHistory, activeBudgetRule],
  );
}

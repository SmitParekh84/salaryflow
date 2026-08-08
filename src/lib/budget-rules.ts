import type { BudgetAllocation, BudgetRule } from "./types";

export interface BudgetRuleTemplate {
  key: string;
  name: string;
  description: string;
  allocations: BudgetAllocation[];
}

export const BUDGET_RULE_TEMPLATES: BudgetRuleTemplate[] = [
  {
    key: "balanced-50-30-20",
    name: "Balanced 50 / 30 / 20",
    description: "A practical starting point for needs, lifestyle spending, and future savings.",
    allocations: [
      { kind: "needs", label: "Needs", percentage: 50 },
      { kind: "wants", label: "Wants", percentage: 30 },
      { kind: "savings", label: "Savings & investing", percentage: 20 },
    ],
  },
  {
    key: "steady-saver-60-20-20",
    name: "Steady saver 60 / 20 / 20",
    description: "Allows more room for essentials while protecting a consistent savings rate.",
    allocations: [
      { kind: "needs", label: "Needs", percentage: 60 },
      { kind: "wants", label: "Wants", percentage: 20 },
      { kind: "savings", label: "Savings & investing", percentage: 20 },
    ],
  },
  {
    key: "aggressive-saver-50-20-30",
    name: "Aggressive saver 50 / 20 / 30",
    description: "Builds wealth faster by limiting flexible spending to one fifth of income.",
    allocations: [
      { kind: "needs", label: "Needs", percentage: 50 },
      { kind: "wants", label: "Wants", percentage: 20 },
      { kind: "savings", label: "Savings & investing", percentage: 30 },
    ],
  },
  {
    key: "debt-focus-70-10-20",
    name: "Debt focus 70 / 10 / 20",
    description: "Keeps lifestyle spending tight while reserving 20% for saving or debt reduction.",
    allocations: [
      { kind: "needs", label: "Needs & debt", percentage: 70 },
      { kind: "wants", label: "Wants", percentage: 10 },
      { kind: "savings", label: "Savings & payoff", percentage: 20 },
    ],
  },
];

export function createRuleFromTemplate(template: BudgetRuleTemplate): Omit<BudgetRule, "id"> {
  return {
    name: template.name,
    templateKey: template.key,
    active: true,
    allocations: template.allocations.map((allocation) => ({ ...allocation })),
  };
}

export function evaluateBudgetRule(rule: BudgetRule, income: number, needs: number, wants: number) {
  const actual = {
    needs: income > 0 ? (needs / income) * 100 : 0,
    wants: income > 0 ? (wants / income) * 100 : 0,
    savings: income > 0 ? (Math.max(0, income - needs - wants) / income) * 100 : 0,
  };
  const totalDeviation = rule.allocations.reduce(
    (sum, allocation) => sum + Math.abs(actual[allocation.kind] - allocation.percentage),
    0,
  );

  return {
    actual,
    score: Math.round(Math.max(0, 100 - totalDeviation / 2)),
  };
}

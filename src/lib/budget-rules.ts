import type { BudgetAllocation, BudgetRule } from "./types";

export interface BudgetRuleTemplate {
  key: string;
  name: string;
  description: string;
  allocations: BudgetAllocation[];
}

export const BUDGET_RULE_TEMPLATES: BudgetRuleTemplate[] = [
  {
    key: "emergency-builder-50-15-20-15",
    name: "Emergency builder 50 / 15 / 20 / 15",
    description:
      "Prioritizes a cash emergency fund while preserving your current monthly SIP pace.",
    allocations: [
      { kind: "needs", label: "Needs", percentage: 50 },
      { kind: "wants", label: "Wants", percentage: 15 },
      { kind: "savings", label: "Emergency savings", percentage: 20 },
      { kind: "investments", label: "Investments", percentage: 15 },
    ],
  },
  {
    key: "wealth-builder-50-20-15-15",
    name: "Wealth builder 50 / 20 / 15 / 15",
    description:
      "Recommended for your current SIP pace: protect cash savings while investing consistently.",
    allocations: [
      { kind: "needs", label: "Needs", percentage: 50 },
      { kind: "wants", label: "Wants", percentage: 20 },
      { kind: "savings", label: "Cash savings", percentage: 15 },
      { kind: "investments", label: "Investments", percentage: 15 },
    ],
  },
  {
    key: "balanced-50-30-10-10",
    name: "Balanced 50 / 30 / 10 / 10",
    description: "A practical split with equal cash savings and investment targets.",
    allocations: [
      { kind: "needs", label: "Needs", percentage: 50 },
      { kind: "wants", label: "Wants", percentage: 30 },
      { kind: "savings", label: "Cash savings", percentage: 10 },
      { kind: "investments", label: "Investments", percentage: 10 },
    ],
  },
  {
    key: "steady-saver-60-20-10-10",
    name: "Steady saver 60 / 20 / 10 / 10",
    description: "Allows more room for essentials while protecting a consistent savings rate.",
    allocations: [
      { kind: "needs", label: "Needs", percentage: 60 },
      { kind: "wants", label: "Wants", percentage: 20 },
      { kind: "savings", label: "Cash savings", percentage: 10 },
      { kind: "investments", label: "Investments", percentage: 10 },
    ],
  },
  {
    key: "growth-focused-45-15-15-25",
    name: "Growth focused 45 / 15 / 15 / 25",
    description: "Prioritizes long-term investing after essential cash reserves are established.",
    allocations: [
      { kind: "needs", label: "Needs", percentage: 45 },
      { kind: "wants", label: "Wants", percentage: 15 },
      { kind: "savings", label: "Cash savings", percentage: 15 },
      { kind: "investments", label: "Investments", percentage: 25 },
    ],
  },
  {
    key: "debt-focus-70-10-15-5",
    name: "Debt focus 70 / 10 / 15 / 5",
    description:
      "Keeps investing alive while directing more income to needs, debt, and cash safety.",
    allocations: [
      { kind: "needs", label: "Needs & debt", percentage: 70 },
      { kind: "wants", label: "Wants", percentage: 10 },
      { kind: "savings", label: "Cash savings", percentage: 15 },
      { kind: "investments", label: "Investments", percentage: 5 },
    ],
  },
];

export function normalizeBudgetRule(rule: BudgetRule): BudgetRule {
  if (rule.allocations.some((allocation) => allocation.kind === "investments")) return rule;

  const legacySavings = rule.allocations.find((allocation) => allocation.kind === "savings");
  if (!legacySavings) return rule;

  const investmentPercentage = Math.floor(legacySavings.percentage / 2);
  const savingsPercentage = legacySavings.percentage - investmentPercentage;

  return {
    ...rule,
    allocations: [
      ...rule.allocations
        .filter((allocation) => allocation.kind !== "savings")
        .map((allocation) => ({ ...allocation })),
      { kind: "savings", label: "Cash savings", percentage: savingsPercentage },
      { kind: "investments", label: "Investments", percentage: investmentPercentage },
    ],
  };
}

export function createRuleFromTemplate(template: BudgetRuleTemplate): Omit<BudgetRule, "id"> {
  return {
    name: template.name,
    templateKey: template.key,
    active: true,
    allocations: template.allocations.map((allocation) => ({ ...allocation })),
  };
}

export function evaluateBudgetRule(
  rule: BudgetRule,
  income: number,
  needs: number,
  wants: number,
  savings: number,
  investments: number,
) {
  const actual = {
    needs: income > 0 ? (needs / income) * 100 : 0,
    wants: income > 0 ? (wants / income) * 100 : 0,
    savings: income > 0 ? (savings / income) * 100 : 0,
    investments: income > 0 ? (investments / income) * 100 : 0,
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

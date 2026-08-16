import { describe, expect, it } from "vitest";
import { BUDGET_RULE_TEMPLATES, recommendBudgetRule } from "./budget-rules";

describe("recommendBudgetRule", () => {
  it("prioritises building a cash cushion when there is no emergency fund yet", () => {
    expect(recommendBudgetRule({ emergencyFundGoal: 0, investmentAmount: 0 }).key).toBe(
      "emergency-builder-50-15-20-15",
    );
  });

  it("protects an existing investing pace once a cushion is being built", () => {
    expect(recommendBudgetRule({ emergencyFundGoal: 300_000, investmentAmount: 10_000 }).key).toBe(
      "wealth-builder-50-20-15-15",
    );
  });

  it("falls back to the balanced split when neither applies", () => {
    expect(recommendBudgetRule({ emergencyFundGoal: 300_000, investmentAmount: 0 }).key).toBe(
      "balanced-50-30-10-10",
    );
  });

  it("treats an unfinished emergency fund as the priority even while investing", () => {
    // Investing before you can absorb one bad month is the order this reverses.
    expect(recommendBudgetRule({ emergencyFundGoal: 0, investmentAmount: 10_000 }).key).toBe(
      "emergency-builder-50-15-20-15",
    );
  });

  it("always returns a template that actually exists", () => {
    const keys = BUDGET_RULE_TEMPLATES.map((template) => template.key);
    for (const input of [
      { emergencyFundGoal: 0, investmentAmount: 0 },
      { emergencyFundGoal: 1, investmentAmount: 1 },
      { emergencyFundGoal: 500_000, investmentAmount: 0 },
    ]) {
      expect(keys).toContain(recommendBudgetRule(input).key);
    }
  });

  it("explains itself, so the choice is not made behind the user's back", () => {
    expect(recommendBudgetRule({ emergencyFundGoal: 0, investmentAmount: 0 }).reason).toMatch(
      /emergency/i,
    );
  });
});

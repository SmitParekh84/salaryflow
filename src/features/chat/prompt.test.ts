import { describe, expect, it } from "vitest";
import type { FinancialContext } from "./context";
import { SYSTEM_PROMPT, renderContext } from "./prompt";

const context: FinancialContext = {
  currency: "INR",
  monthlyIncome: 80_000,
  avgMonthlySpend: 32_000,
  spendByCategory: [
    { category: "Food", monthlyAvg: 12_000 },
    { category: "Shopping", monthlyAvg: 20_000 },
  ],
  totalMonthlyBills: 18_000,
  monthlyEmi: 4_500,
  monthlyInsurancePremium: 825,
  investments: [
    { name: "Nifty index", type: "SIP", invested: 60_000, currentValue: 71_000, monthly: 5_000 },
  ],
  monthlySipTotal: 5_000,
  goals: [
    { name: "Emergency Fund", type: "Emergency Fund", target: 300_000, saved: 60_000, monthlyContribution: 5_000 },
  ],
  totalLiquidBalance: 120_000,
  emergencyFundMonths: 2.4,
  profile: { age: 28, dependents: null },
};

describe("renderContext", () => {
  it("includes the headline figures the model reasons from", () => {
    const rendered = renderContext(context);

    expect(rendered).toContain("80000");
    expect(rendered).toContain("32000");
    expect(rendered).toContain("18000");
    expect(rendered).toContain("120000");
  });

  it("names the currency so the model does not assume dollars", () => {
    expect(renderContext(context)).toContain("INR");
  });

  it("marks unknown profile fields explicitly instead of omitting them", () => {
    // An omitted field reads to the model as zero dependents, which silently
    // turns "I need to ask" into "you need no cover".
    const rendered = renderContext(context);

    expect(rendered).toMatch(/dependents:\s*unknown/i);
    expect(rendered).toMatch(/age:\s*28/i);
  });

  it("lists every unknown profile field so the model knows what it may ask for", () => {
    const rendered = renderContext({ ...context, profile: {} });

    for (const field of [
      "age",
      "dependents",
      "existingLifeCover",
      "existingHealthCover",
      "outstandingLoans",
      "spouseIncome",
    ]) {
      expect(rendered.toLowerCase()).toContain(field.toLowerCase());
    }
  });

  it("says so plainly when the emergency fund cannot be computed", () => {
    const rendered = renderContext({ ...context, emergencyFundMonths: null });

    expect(rendered).toMatch(/emergency fund.*unknown/i);
  });

  it("renders an empty account without fabricating figures", () => {
    const rendered = renderContext({
      ...context,
      spendByCategory: [],
      investments: [],
      goals: [],
    });

    expect(rendered).toMatch(/none recorded/i);
  });
});

describe("SYSTEM_PROMPT", () => {
  it("forbids recommending named products", () => {
    expect(SYSTEM_PROMPT.toLowerCase()).toMatch(/never name|do not name/);
  });

  it("states that health cover does not replace term cover", () => {
    // The trap behind the motivating question: the two are unrelated products.
    expect(SYSTEM_PROMPT.toLowerCase()).toContain("health");
    expect(SYSTEM_PROMPT.toLowerCase()).toContain("term");
  });

  it("tells the model to use only the supplied figures", () => {
    expect(SYSTEM_PROMPT.toLowerCase()).toMatch(/only.*(figures|numbers)/);
  });

  it("documents the exact JSON envelope the route parses", () => {
    expect(SYSTEM_PROMPT).toContain("profileUpdates");
    expect(SYSTEM_PROMPT).toContain("reply");
  });
});

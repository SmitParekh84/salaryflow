import { describe, expect, it } from "vitest";
import { EMERGENCY_FUND_MONTHS, suggestEmergencyFund } from "./emergency-fund";

describe("suggestEmergencyFund", () => {
  it("suggests six months of take-home salary", () => {
    expect(suggestEmergencyFund({ monthlySalary: 85_000 })).toEqual({
      amount: 510_000,
      months: 6,
      basis: "salary",
    });
  });

  it("falls back to six months of outgoings when no salary is recorded", () => {
    // Freelance and business income is not a salary, but rent and bills still
    // have to be covered for the same six months.
    expect(suggestEmergencyFund({ monthlySalary: 0, monthlyOutgoings: 40_000 })).toEqual({
      amount: 240_000,
      months: 6,
      basis: "outgoings",
    });
  });

  it("prefers salary over outgoings when both are known", () => {
    expect(suggestEmergencyFund({ monthlySalary: 85_000, monthlyOutgoings: 40_000 })?.basis).toBe(
      "salary",
    );
  });

  it("suggests nothing when there is nothing to base it on", () => {
    // Better no suggestion than a number invented out of neither figure.
    expect(suggestEmergencyFund({ monthlySalary: 0 })).toBeNull();
    expect(suggestEmergencyFund({ monthlySalary: 0, monthlyOutgoings: 0 })).toBeNull();
  });

  it("ignores a negative figure rather than suggesting a negative target", () => {
    expect(suggestEmergencyFund({ monthlySalary: -5_000 })).toBeNull();
  });

  it("rounds up to a whole thousand so the target is never short", () => {
    expect(suggestEmergencyFund({ monthlySalary: 78_450 })?.amount).toBe(471_000);
  });

  it("honours a different number of months", () => {
    expect(suggestEmergencyFund({ monthlySalary: 50_000, months: 3 })).toEqual({
      amount: 150_000,
      months: 3,
      basis: "salary",
    });
  });

  it("defaults to the six months the rest of the app talks about", () => {
    expect(EMERGENCY_FUND_MONTHS).toBe(6);
  });
});

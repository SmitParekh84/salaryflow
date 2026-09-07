import { beforeEach, describe, expect, it } from "vitest";
import { useFinanceStore } from "./store";
import type { SalaryProfile } from "./types";

const profile: SalaryProfile = {
  amount: 85000,
  salaryDay: 25,
  cycle: "monthly",
  currency: "INR",
  country: "India",
  savingsGoal: 0,
  emergencyFundGoal: 0,
  investmentAmount: 0,
};

describe("completeOnboarding", () => {
  beforeEach(() => {
    useFinanceStore.getState().resetAll();
  });

  it("leaves the notification list empty rather than inventing bills the user never entered", () => {
    useFinanceStore.getState().completeOnboarding({ name: "Smit", email: "s@example.com" }, profile);

    expect(useFinanceStore.getState().notifications).toEqual([]);
  });
});

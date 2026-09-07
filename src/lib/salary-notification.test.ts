import { describe, expect, it } from "vitest";
import { salaryDayNotification } from "./salary-notification";
import type { SalaryProfile } from "./types";

function profile(patch: Partial<SalaryProfile> = {}): SalaryProfile {
  return {
    amount: 85000,
    salaryDay: 25,
    cycle: "monthly",
    currency: "INR",
    country: "India",
    savingsGoal: 0,
    emergencyFundGoal: 0,
    investmentAmount: 0,
    ...patch,
  };
}

describe("salaryDayNotification", () => {
  it("returns a notification on the day the salary lands", () => {
    const result = salaryDayNotification(profile(), new Date(2026, 8, 25, 9, 0));

    expect(result).not.toBeNull();
    expect(result?.type).toBe("salary");
    expect(result?.title).toBe("Salary day");
  });

  it("returns nothing on any other day of the cycle", () => {
    expect(salaryDayNotification(profile(), new Date(2026, 8, 24, 23, 59))).toBeNull();
    expect(salaryDayNotification(profile(), new Date(2026, 8, 26, 0, 1))).toBeNull();
  });

  it("names the salary amount in the profile's own currency", () => {
    const result = salaryDayNotification(profile(), new Date(2026, 8, 25, 9, 0));

    expect(result?.body).toContain("₹85,000");
  });

  it("links to the page where the new cycle is planned", () => {
    expect(salaryDayNotification(profile(), new Date(2026, 8, 25, 9, 0))?.href).toBe("/dashboard");
  });

  it("fires on the last day of a short month when the salary day overshoots it", () => {
    const late = profile({ salaryDay: 31 });

    expect(salaryDayNotification(late, new Date(2026, 1, 28, 9, 0))).not.toBeNull();
    expect(salaryDayNotification(late, new Date(2026, 1, 27, 9, 0))).toBeNull();
  });

  it("fires on the anchor day of a weekly cycle", () => {
    // A weekly cycle is counted in sevens from the anchor day, not from the
    // 25th of each month: for salaryDay 25 that puts a landing on 2026-09-27,
    // and the next one seven days after it.
    const weekly = profile({ cycle: "weekly" });

    expect(salaryDayNotification(weekly, new Date(2026, 8, 27, 9, 0))).not.toBeNull();
    expect(salaryDayNotification(weekly, new Date(2026, 8, 28, 9, 0))).toBeNull();
    expect(salaryDayNotification(weekly, new Date(2026, 9, 4, 9, 0))).not.toBeNull();
  });

  it("keys one notification per cycle, so re-opening the app cannot duplicate it", () => {
    const morning = salaryDayNotification(profile(), new Date(2026, 8, 25, 6, 0));
    const evening = salaryDayNotification(profile(), new Date(2026, 8, 25, 22, 30));
    const nextCycle = salaryDayNotification(profile(), new Date(2026, 9, 25, 9, 0));

    expect(morning?.dedupeKey).toBe(evening?.dedupeKey);
    expect(morning?.dedupeKey).toBe("salary:2026-09-25");
    expect(nextCycle?.dedupeKey).toBe("salary:2026-10-25");
  });
});

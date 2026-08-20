import { describe, expect, it } from "vitest";
import { lastUsedRate, resolveRateSource } from "./use-fuel-rate";
import type { Expense } from "@/lib/types";

function fuelExpense(id: string, date: string, ratePerLitre?: number): Expense {
  return {
    id,
    amount: 150,
    category: "Fuel",
    paymentMethod: "UPI",
    date,
    ...(ratePerLitre === undefined
      ? {}
      : { fuel: { litres: 150 / ratePerLitre, ratePerLitre, rateSource: "manual" as const } }),
  };
}

describe("lastUsedRate", () => {
  it("takes the rate from the most recent fill, not the most recently added", () => {
    const older = fuelExpense("a", "2026-08-17T22:00:00.000Z", 101);
    const newer = fuelExpense("b", "2026-08-20T00:25:00.000Z", 105);

    expect(lastUsedRate([newer, older])).toBe(105);
    expect(lastUsedRate([older, newer])).toBe(105);
  });

  it("returns null when no fill has ever recorded a rate", () => {
    expect(lastUsedRate([fuelExpense("a", "2026-08-17T22:00:00.000Z")])).toBeNull();
  });

  it("ignores expenses that are not fuel", () => {
    const lunch: Expense = {
      id: "e1",
      amount: 120,
      category: "Food",
      paymentMethod: "UPI",
      date: "2026-08-21T09:00:00.000Z",
    };
    expect(lastUsedRate([lunch, fuelExpense("a", "2026-08-17T22:00:00.000Z", 101)])).toBe(101);
  });

  it("rejects a stored rate of zero rather than offering it as a prefill", () => {
    expect(lastUsedRate([fuelExpense("a", "2026-08-17T22:00:00.000Z", 0)])).toBeNull();
  });
});

describe("resolveRateSource", () => {
  it("keeps the suggestion's own source when the suggestion was accepted", () => {
    expect(resolveRateSource(105, 105, "live")).toBe("live");
    expect(resolveRateSource(105, 105, "last-used")).toBe("last-used");
  });

  it("reports manual when the user changed the figure", () => {
    expect(resolveRateSource(99, 105, "live")).toBe("manual");
  });

  it("reports manual when nothing was suggested", () => {
    expect(resolveRateSource(105, null, "last-used")).toBe("manual");
  });
});

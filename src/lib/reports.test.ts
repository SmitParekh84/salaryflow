import { describe, expect, it } from "vitest";
import { cashFlow, reportRange } from "./reports";
import type { ReportInput } from "./reports";
import type { Expense, Income, SalaryProfile } from "./types";

const profile: SalaryProfile = {
  amount: 50_000,
  salaryDay: 6,
  cycle: "monthly",
  currency: "INR",
  country: "India",
  savingsGoal: 0,
  emergencyFundGoal: 0,
  investmentAmount: 0,
};

/** Local Y/M/D so the suite gives the same answer in every timezone. */
function iso(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 12, 0).toISOString();
}

function expense(over: Partial<Expense> & { id: string; amount: number }): Expense {
  return {
    category: "Food",
    paymentMethod: "UPI",
    date: iso(2026, 8, 10),
    ...over,
  } as Expense;
}

function income(over: Partial<Income> & { id: string; amount: number }): Income {
  return { type: "Side Income", source: "Freelance", date: iso(2026, 8, 10), ...over } as Income;
}

const NOW = new Date(2026, 7, 20, 12, 0);

function input(over: Partial<ReportInput> = {}): ReportInput {
  return {
    profile,
    expenses: [],
    incomes: [],
    salaryHistory: [],
    accounts: [],
    ...over,
  };
}

describe("reportRange", () => {
  it("defaults the cycle to the salary cycle and ends today", () => {
    const range = reportRange(profile, "cycle", NOW);

    expect(range.start.getDate()).toBe(6);
    expect(range.start.getMonth()).toBe(7);
    expect(range.end.getDate()).toBe(20);
  });

  it("never ends in the future for any range", () => {
    for (const key of ["cycle", "month", "quarter", "fy"] as const) {
      expect(reportRange(profile, key, NOW).end.getTime()).toBeLessThanOrEqual(
        new Date(2026, 7, 20, 23, 59, 59, 999).getTime(),
      );
    }
  });

  it("starts the month range on the first", () => {
    const range = reportRange(profile, "month", NOW);
    expect(range.start.getDate()).toBe(1);
    expect(range.start.getMonth()).toBe(7);
  });

  it("reaches back three months for the quarter range", () => {
    const range = reportRange(profile, "quarter", NOW);
    expect(range.start.getMonth()).toBe(4); // May
    expect(range.start.getDate()).toBe(1);
  });
});

describe("cashFlow", () => {
  const range = reportRange(profile, "cycle", NOW);

  it("splits spends from unlinked and never counts one twice", () => {
    const data = input({
      expenses: [
        expense({ id: "a", amount: 500, accountId: "icici" }),
        expense({ id: "b", amount: 300 }), // no account
      ],
      accounts: [
        { id: "icici", bankName: "ICICI", accountType: "Savings", balance: 1_000, status: "active" },
      ],
    });
    const flow = cashFlow(data, range);
    const amount = (key: string) => flow.buckets.find((b) => b.key === key)!.amount;

    expect(amount("spends")).toBe(500);
    expect(amount("unlinked")).toBe(300);
  });

  it("puts an Investment expense in investments and nowhere else", () => {
    const data = input({
      expenses: [expense({ id: "sip", amount: 2_000, category: "Investment", accountId: "icici" })],
    });
    const flow = cashFlow(data, range);
    const amount = (key: string) => flow.buckets.find((b) => b.key === key)!.amount;

    expect(amount("investments")).toBe(2_000);
    expect(amount("spends")).toBe(0);
    expect(amount("unlinked")).toBe(0);
  });

  it("counts confirmed salary and earned income as incoming", () => {
    const data = input({
      incomes: [income({ id: "free", amount: 3_000 })],
      salaryHistory: [{ amount: 50_000, date: iso(2026, 8, 6), confirmed: true }],
    });
    const flow = cashFlow(data, range);

    expect(flow.buckets.find((b) => b.key === "incoming")!.amount).toBe(53_000);
  });

  it("leaves out unconfirmed salary and income that is not earnings", () => {
    const data = input({
      incomes: [income({ id: "cb", amount: 200, type: "Cashback" })],
      salaryHistory: [{ amount: 50_000, date: iso(2026, 8, 6), confirmed: false }],
    });

    expect(cashFlow(data, range).buckets.find((b) => b.key === "incoming")!.amount).toBe(0);
  });

  it("excludes records outside the range at both ends", () => {
    const data = input({
      expenses: [
        expense({ id: "before", amount: 100, accountId: "icici", date: iso(2026, 8, 5) }),
        expense({ id: "inside", amount: 200, accountId: "icici", date: iso(2026, 8, 6) }),
        expense({ id: "after", amount: 400, accountId: "icici", date: iso(2026, 8, 25) }),
      ],
    });

    expect(cashFlow(data, range).buckets.find((b) => b.key === "spends")!.amount).toBe(200);
  });

  it("sums only the selected account, leaving unlinked empty", () => {
    const data = input({
      accountId: "icici",
      expenses: [
        expense({ id: "a", amount: 500, accountId: "icici" }),
        expense({ id: "b", amount: 700, accountId: "hdfc" }),
        expense({ id: "c", amount: 300 }),
      ],
    });
    const flow = cashFlow(data, range);
    const amount = (key: string) => flow.buckets.find((b) => b.key === key)!.amount;

    expect(amount("spends")).toBe(500);
    // An expense with no account cannot belong to a specific one.
    expect(amount("unlinked")).toBe(0);
  });

  it("reports the total balance of active accounts", () => {
    const data = input({
      accounts: [
        { id: "icici", bankName: "ICICI", accountType: "Savings", balance: 1_000, status: "active" },
        { id: "old", bankName: "Old", accountType: "Savings", balance: 900, status: "closed" },
      ],
    });

    expect(cashFlow(data, range).bankBalance).toBe(1_000);
  });

  it("always returns all four buckets, at zero when empty", () => {
    const flow = cashFlow(input(), range);
    expect(flow.buckets.map((b) => b.key)).toEqual([
      "incoming",
      "investments",
      "spends",
      "unlinked",
    ]);
    expect(flow.buckets.every((b) => b.amount === 0)).toBe(true);
  });
});

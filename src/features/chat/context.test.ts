import { describe, expect, it } from "vitest";
import type { BankAccount, Bill, Expense, Goal, Investment, SalaryProfile } from "@/lib/types";
import { buildFinancialContext, monthlyBillCost } from "./context";

const NOW = new Date("2026-08-16T00:00:00.000Z");

const salary: SalaryProfile = {
  amount: 80_000,
  salaryDay: 1,
  cycle: "monthly",
  currency: "INR",
  country: "India",
  savingsGoal: 20_000,
  emergencyFundGoal: 300_000,
  investmentAmount: 10_000,
};

/** Days back from NOW, as an ISO date string. */
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const expense = (over: Partial<Expense> & Pick<Expense, "amount" | "category">): Expense => ({
  id: Math.random().toString(36).slice(2),
  paymentMethod: "UPI",
  date: daysAgo(10),
  ...over,
});

const emptyInput = {
  salary,
  expenses: [] as Expense[],
  bills: [] as Bill[],
  investments: [] as Investment[],
  goals: [] as Goal[],
  accounts: [] as BankAccount[],
  profile: {},
  now: NOW,
};

describe("monthlyBillCost", () => {
  const bill = (over: Partial<Bill>): Bill => ({
    id: "b",
    name: "test",
    amount: 1200,
    dueDay: 5,
    frequency: "monthly",
    category: "Utilities",
    paid: false,
    ...over,
  });

  it("takes a monthly bill at face value", () => {
    expect(monthlyBillCost(bill({ frequency: "monthly" }))).toBe(1200);
  });

  it("spreads a yearly bill across twelve months", () => {
    expect(monthlyBillCost(bill({ frequency: "yearly", amount: 12_000 }))).toBe(1000);
  });

  it("converts a weekly bill using 52 weeks a year, not 4 weeks a month", () => {
    // 4-weeks-a-month would give 400 and understate the real yearly cost.
    expect(monthlyBillCost(bill({ frequency: "weekly", amount: 100 }))).toBeCloseTo(433.33, 1);
  });

  it("prorates an interval bill by its day count", () => {
    expect(monthlyBillCost(bill({ frequency: "interval", amount: 3000, intervalDays: 90 }))).toBe(
      1000,
    );
  });

  it("falls back to a quarterly assumption when intervalDays is missing", () => {
    expect(monthlyBillCost(bill({ frequency: "interval", amount: 3000 }))).toBe(1000);
  });
});

describe("buildFinancialContext", () => {
  it("reports monthly income from the salary profile", () => {
    expect(buildFinancialContext(emptyInput).monthlyIncome).toBe(80_000);
  });

  it("averages spending over three months rather than summing it", () => {
    const context = buildFinancialContext({
      ...emptyInput,
      expenses: [
        expense({ amount: 9_000, category: "Food", date: daysAgo(10) }),
        expense({ amount: 9_000, category: "Food", date: daysAgo(40) }),
        expense({ amount: 9_000, category: "Food", date: daysAgo(70) }),
      ],
    });

    expect(context.avgMonthlySpend).toBe(9_000);
  });

  it("ignores expenses older than the three month window", () => {
    const context = buildFinancialContext({
      ...emptyInput,
      expenses: [
        expense({ amount: 3_000, category: "Food", date: daysAgo(10) }),
        expense({ amount: 60_000, category: "Shopping", date: daysAgo(400) }),
      ],
    });

    expect(context.avgMonthlySpend).toBe(1_000);
  });

  it("excludes investment transfers from spending", () => {
    // Money moved into an investment is not consumption; counting it as spend
    // would make every disciplined saver look like an overspender.
    const context = buildFinancialContext({
      ...emptyInput,
      expenses: [
        expense({ amount: 3_000, category: "Food" }),
        expense({ amount: 30_000, category: "Investment" }),
      ],
    });

    expect(context.avgMonthlySpend).toBe(1_000);
  });

  it("excludes bill-linked expenses from spending so bills are not counted twice", () => {
    const context = buildFinancialContext({
      ...emptyInput,
      expenses: [
        expense({ amount: 3_000, category: "Food" }),
        expense({ amount: 9_000, category: "Rent", billId: "bill-rent" }),
      ],
    });

    expect(context.avgMonthlySpend).toBe(1_000);
  });

  it("breaks spending down by category, largest first", () => {
    const context = buildFinancialContext({
      ...emptyInput,
      expenses: [
        expense({ amount: 3_000, category: "Food" }),
        expense({ amount: 9_000, category: "Shopping" }),
      ],
    });

    expect(context.spendByCategory).toEqual([
      { category: "Shopping", monthlyAvg: 3_000 },
      { category: "Food", monthlyAvg: 1_000 },
    ]);
  });

  it("totals bills as a true monthly cost across mixed frequencies", () => {
    const context = buildFinancialContext({
      ...emptyInput,
      bills: [
        {
          id: "1",
          name: "Rent",
          amount: 15_000,
          dueDay: 5,
          frequency: "monthly",
          category: "Rent",
          paid: false,
        },
        {
          id: "2",
          name: "Car insurance",
          amount: 12_000,
          dueDay: 5,
          frequency: "yearly",
          category: "Insurance",
          paid: false,
        },
      ],
    });

    expect(context.totalMonthlyBills).toBe(16_000);
  });

  it("separates EMI and insurance obligations from the bill total", () => {
    const context = buildFinancialContext({
      ...emptyInput,
      bills: [
        {
          id: "1",
          name: "Bike loan",
          amount: 4_500,
          dueDay: 5,
          frequency: "monthly",
          category: "EMI",
          paid: false,
        },
        {
          id: "2",
          name: "HDFC Ergo health",
          amount: 825,
          dueDay: 5,
          frequency: "monthly",
          category: "Insurance",
          paid: false,
        },
      ],
    });

    expect(context.monthlyEmi).toBe(4_500);
    expect(context.monthlyInsurancePremium).toBe(825);
  });

  it("counts insurance paid as a plain expense when no bill records it", () => {
    // Not everyone models a premium as a bill; missing it would make the
    // assistant tell an insured user they have no cover at all.
    const context = buildFinancialContext({
      ...emptyInput,
      expenses: [expense({ amount: 825, category: "Insurance", date: daysAgo(10) })],
    });

    expect(context.monthlyInsurancePremium).toBe(275);
  });

  it("sums monthly SIP contributions across investments", () => {
    const context = buildFinancialContext({
      ...emptyInput,
      investments: [
        { id: "1", name: "Nifty index", type: "SIP", invested: 60_000, currentValue: 71_000, monthly: 5_000 },
        { id: "2", name: "Gold", type: "Gold", invested: 20_000, currentValue: 24_000 },
      ],
    });

    expect(context.monthlySipTotal).toBe(5_000);
    expect(context.investments).toHaveLength(2);
  });

  it("counts only active accounts toward liquid balance", () => {
    const account = (over: Partial<BankAccount>): BankAccount => ({
      id: "a",
      bankName: "HDFC",
      accountType: "Savings",
      balance: 50_000,
      status: "active",
      ...over,
    });

    const context = buildFinancialContext({
      ...emptyInput,
      accounts: [account({ id: "1" }), account({ id: "2", status: "closed", balance: 999_999 })],
    });

    expect(context.totalLiquidBalance).toBe(50_000);
  });

  it("expresses the emergency fund in months of total outgoings", () => {
    const context = buildFinancialContext({
      ...emptyInput,
      expenses: [expense({ amount: 30_000, category: "Food" })],
      bills: [
        {
          id: "1",
          name: "Rent",
          amount: 10_000,
          dueDay: 5,
          frequency: "monthly",
          category: "Rent",
          paid: false,
        },
      ],
      accounts: [
        { id: "1", bankName: "HDFC", accountType: "Savings", balance: 60_000, status: "active" },
      ],
    });

    // 30_000/3 spend + 10_000 bills = 20_000 a month; 60_000 covers 3 months.
    expect(context.emergencyFundMonths).toBe(3);
  });

  it("returns null emergency months rather than dividing by zero", () => {
    const context = buildFinancialContext({
      ...emptyInput,
      accounts: [
        { id: "1", bankName: "HDFC", accountType: "Savings", balance: 60_000, status: "active" },
      ],
    });

    expect(context.emergencyFundMonths).toBeNull();
  });

  it("passes the financial profile through untouched, nulls included", () => {
    const context = buildFinancialContext({
      ...emptyInput,
      profile: { dependents: 2, age: null },
    });

    expect(context.profile.dependents).toBe(2);
    expect(context.profile.age).toBeNull();
  });

  it("survives a brand new account with no data at all", () => {
    const context = buildFinancialContext(emptyInput);

    expect(context.avgMonthlySpend).toBe(0);
    expect(context.spendByCategory).toEqual([]);
    expect(context.totalLiquidBalance).toBe(0);
    expect(context.emergencyFundMonths).toBeNull();
  });

  it("rounds every rupee figure to a whole number", () => {
    const context = buildFinancialContext({
      ...emptyInput,
      expenses: [expense({ amount: 1_000.55, category: "Food" })],
    });

    expect(Number.isInteger(context.avgMonthlySpend)).toBe(true);
  });
});

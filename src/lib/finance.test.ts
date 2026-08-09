import { describe, expect, it } from "vitest";
import { billCycle } from "./bill-cycle";
import { computeSummary, cycleInfo, isInCurrentCycle } from "./calculations";
import { creditCardUsage } from "./credit-cards";
import { buildFundingPlan } from "./funding-plan";
import type {
  AccountTransfer,
  BankAccount,
  Bill,
  BudgetRule,
  CreditCard,
  Expense,
  Income,
  Investment,
  SalaryProfile,
} from "./types";

const profile: SalaryProfile = {
  amount: 30_000,
  salaryDay: 30,
  cycle: "monthly",
  currency: "INR",
  country: "India",
  savingsGoal: 3_000,
  emergencyFundGoal: 100_000,
  investmentAmount: 0,
};

const rule: BudgetRule = {
  id: "rule",
  name: "50 / 20 / 15 / 15",
  active: true,
  allocations: [
    { kind: "needs", label: "Needs", percentage: 50 },
    { kind: "wants", label: "Wants", percentage: 20 },
    { kind: "savings", label: "Savings", percentage: 15 },
    { kind: "investments", label: "Investments", percentage: 15 },
  ],
};

const savingsAccounts: BankAccount[] = [
  {
    id: "save-a",
    bankName: "Savings A",
    accountType: "Savings",
    balance: 5_000,
    status: "active",
    defaultFor: ["savings"],
  },
  {
    id: "save-b",
    bankName: "Savings B",
    accountType: "Savings",
    balance: 2_000,
    status: "active",
    defaultFor: ["savings"],
  },
  {
    id: "spend",
    bankName: "Spending",
    accountType: "Salary",
    balance: 20_000,
    status: "active",
    defaultFor: ["everyday", "obligations"],
  },
];

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense",
    amount: 1_000,
    category: "Food",
    paymentMethod: "UPI",
    date: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

function transfer(overrides: Partial<AccountTransfer> = {}): AccountTransfer {
  return {
    id: "transfer",
    sourceAccountId: "spend",
    destinationAccountId: "save-a",
    amount: 5_000,
    date: "2026-03-01T09:00:00.000Z",
    status: "completed",
    ...overrides,
  };
}

describe("salary cycles", () => {
  it("clamps a day-30 salary to February and uses the real adjacent cycle dates", () => {
    const info = cycleInfo(profile, new Date(2026, 2, 1, 12));

    expect(info.cycleStart).toEqual(new Date(2026, 1, 28));
    expect(info.nextSalary).toEqual(new Date(2026, 2, 30));
    expect(info.cycleLength).toBe(30);
    expect(info.daysElapsed).toBe(1);
    expect(info.daysRemaining).toBe(29);
  });

  it("includes the clamped salary day and excludes the day before it", () => {
    const now = new Date(2026, 2, 1, 12);

    expect(isInCurrentCycle("2026-02-28", profile, now)).toBe(true);
    expect(isInCurrentCycle("2026-02-27", profile, now)).toBe(false);
  });
});

describe("finance summary", () => {
  const now = new Date("2026-03-02T12:00:00.000Z");

  it("uses confirmed salary plus cycle income for every budget target", () => {
    const incomes: Income[] = [
      {
        id: "bonus",
        amount: 1_000,
        type: "Bonus",
        source: "Bonus",
        date: "2026-03-01T08:00:00.000Z",
      },
    ];
    const summary = computeSummary(
      profile,
      [],
      incomes,
      [],
      [],
      [{ amount: 32_000, date: "2026-02-28T08:00:00.000Z", confirmed: true }],
      rule,
      [],
      [],
      now,
    );

    expect(summary.income).toBe(33_000);
    expect(summary.savingsTarget).toBe(4_950);
    expect(summary.investmentTarget).toBe(4_950);
    expect(summary.spendingBudget).toBe(23_100);
  });

  it("counts external savings transfers but nets savings-to-savings transfers to zero", () => {
    const summary = computeSummary(
      profile,
      [],
      [],
      [],
      [],
      [],
      rule,
      savingsAccounts,
      [
        transfer(),
        transfer({
          id: "internal",
          sourceAccountId: "save-a",
          destinationAccountId: "save-b",
          amount: 2_000,
        }),
      ],
      now,
    );

    expect(summary.savedThisCycle).toBe(5_000);
  });

  it("subtracts savings-account spending and reports evidenced savings plus SIPs", () => {
    const investments: Investment[] = [
      {
        id: "sip",
        name: "Index SIP",
        type: "SIP",
        invested: 10_000,
        currentValue: 10_500,
        monthly: 2_000,
      },
    ];
    const summary = computeSummary(
      profile,
      [
        expense({ amount: 500, accountId: "save-a" }),
        expense({
          id: "sip-payment",
          amount: 2_000,
          category: "Investment",
          accountId: "spend",
        }),
      ],
      [],
      investments,
      [],
      [],
      rule,
      savingsAccounts,
      [transfer()],
      now,
    );

    expect(summary.savedThisCycle).toBe(4_500);
    expect(summary.savings).toBe(6_500);
    expect(summary.savingsRate).toBeCloseTo((6_500 / 30_000) * 100);
    expect(summary.totalExpenses).toBe(500);
    expect(summary.investedThisCycle).toBe(2_000);
  });

  it("does not count an unpaid monthly SIP commitment as already invested", () => {
    const summary = computeSummary(
      profile,
      [],
      [],
      [
        {
          id: "sip",
          name: "Index SIP",
          type: "SIP",
          invested: 10_000,
          currentValue: 10_500,
          monthly: 2_000,
        },
      ],
      [],
      [],
      rule,
      [],
      [],
      now,
    );

    expect(summary.investedThisCycle).toBe(0);
    expect(summary.investmentTarget).toBe(4_500);
    expect(summary.plannedInvestments).toBe(4_500);
  });
});

describe("credit cards", () => {
  it("counts purchases once and applies statement credits without changing cash balances", () => {
    const card: CreditCard = {
      id: "card",
      name: "Card",
      bankName: "Bank",
      creditLimit: 10_000,
      statementDay: 31,
      status: "active",
    };
    const incomes: Income[] = [
      {
        id: "cashback",
        amount: 200,
        type: "Other",
        source: "Cashback",
        accountId: "card",
        date: "2026-04-20T10:00:00.000Z",
      },
    ];
    const usage = creditCardUsage(
      card,
      [expense({ amount: 1_200, accountId: "card", date: "2026-04-10T10:00:00.000Z" })],
      incomes,
      new Date("2026-04-25T12:00:00.000Z"),
    );

    expect(usage.charges).toBe(1_200);
    expect(usage.credits).toBe(200);
    expect(usage.outstanding).toBe(1_000);
    expect(usage.available).toBe(9_000);
    expect(usage.utilization).toBe(10);
  });
});

describe("bills and funding plan", () => {
  const bill: Bill = {
    id: "rent",
    name: "Rent",
    amount: 8_000,
    dueDay: 5,
    dueDate: "2026-01-05",
    frequency: "monthly",
    category: "Rent",
    paid: false,
    accountId: "spend",
  };

  it("links a bill payment to its billing month and removes it from the amount due", () => {
    const payment = expense({
      amount: 8_000,
      category: "Rent",
      billId: "rent",
      billingMonth: "2026-03",
    });
    const cycle = billCycle(bill, [payment], new Date(2026, 2, 6, 12));

    expect(cycle.isPaid).toBe(true);
    expect(cycle.paidAmount).toBe(8_000);
    expect(cycle.remainingAmount).toBe(0);
  });

  it("keeps the unpaid remainder of a partially paid fixed bill due", () => {
    const payment = expense({
      amount: 3_000,
      category: "Rent",
      billId: "rent",
      billingMonth: "2026-03",
    });
    const cycle = billCycle(bill, [payment], new Date(2026, 2, 6, 12));

    expect(cycle.isPaid).toBe(false);
    expect(cycle.paidAmount).toBe(3_000);
    expect(cycle.recordedAmount).toBe(3_000);
    expect(cycle.remainingAmount).toBe(5_000);
  });

  it("reserves card outstanding, SIPs, unpaid bills, and only the remaining savings target", () => {
    const card: CreditCard = {
      id: "card",
      name: "Card",
      bankName: "Bank",
      creditLimit: 10_000,
      statementDay: 31,
      status: "active",
    };
    const plan = buildFundingPlan({
      accounts: savingsAccounts,
      bills: [bill],
      creditCards: [card],
      expenses: [
        expense({ amount: 1_000, accountId: "card", date: "2026-03-10T10:00:00.000Z" }),
      ],
      incomes: [],
      investments: [
        {
          id: "sip",
          name: "SIP",
          type: "SIP",
          invested: 0,
          currentValue: 0,
          monthly: 2_000,
          accountId: "spend",
        },
      ],
      budgetRule: rule,
      monthlyIncome: 30_000,
      savedThisCycle: 4_000,
      now: new Date("2026-03-20T12:00:00.000Z"),
    });

    expect(plan.items.find((item) => item.kind === "credit-card")?.amount).toBe(1_000);
    expect(plan.items.find((item) => item.kind === "savings")?.remainingAmount).toBe(500);
    expect(plan.items.find((item) => item.label.includes("top-up"))?.amount).toBe(2_500);
    expect(plan.items.find((item) => item.kind === "rent")?.remainingAmount).toBe(8_000);
    expect(plan.total).toBe(14_000);
  });
});
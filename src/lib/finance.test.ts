import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountDeletionBlocker, goalRestoreBlocker } from "./account-references";
import {
  applyAllocation,
  reassignGoalAccounts,
  shouldReassignClosingAllocations,
} from "./allocation-writes";
import {
  accountAllocated,
  accountFree,
  goalAccountBreakdown,
  goalSaved,
  isOverAllocated,
  unassignedSaved,
} from "./allocations";
import { billCycle, billOccurrenceDate, monthlyBillReserve } from "./bill-cycle";
import { budgetAllocationTarget, evaluateBudgetRule } from "./budget-rules";
import { computeSummary, cycleInfo, isInCurrentCycle } from "./calculations";
import { creditCardUsage } from "./credit-cards";
import {
  currentFinancialYearStart,
  financialYearMonths,
  isInFinancialYear,
} from "./financial-year";
import { buildFundingPlan } from "./funding-plan";
import { migrateGoalOpeningBalances } from "./goal-migration";
import { goalContributionStep, monthsToGoal, projectGoal, whatIfDelta } from "./goal-projection";
import { migrateLegacyBrandStorage, useFinanceStore } from "./store";
import { completeTransferWrite } from "./transfer-writes";
import type {
  AccountTransfer,
  BankAccount,
  Bill,
  BudgetRule,
  CreditCard,
  Expense,
  Goal,
  GoalContribution,
  Income,
  Investment,
  SalaryProfile,
} from "./types";
import { formatMoney } from "./utils";

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

describe("Aartha brand storage migration", () => {
  const STATE = '{"state":{"expenses":[]},"version":3}';

  const makeStorage = (entries: [string, string][]) => {
    const values = new Map(entries);
    return {
      values,
      storage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    };
  };

  it("moves data from the immediately previous key exactly once", () => {
    const { values, storage } = makeStorage([["spendly-store", STATE]]);

    expect(migrateLegacyBrandStorage(storage)).toBe(true);
    expect(values.get("aartha-store")).toBe(STATE);
    expect(values.has("spendly-store")).toBe(false);
    expect(migrateLegacyBrandStorage(storage)).toBe(false);
  });

  it("carries data forward for a user who skipped the previous rename", () => {
    const { values, storage } = makeStorage([["salaryflow-store", STATE]]);

    expect(migrateLegacyBrandStorage(storage)).toBe(true);
    expect(values.get("aartha-store")).toBe(STATE);
    expect(values.has("salaryflow-store")).toBe(false);
  });

  it("prefers the newest legacy key and clears every older one", () => {
    const { values, storage } = makeStorage([
      ["spendly-store", STATE],
      ["salaryflow-store", '{"state":{"expenses":[{"id":"stale"}]},"version":1}'],
    ]);

    expect(migrateLegacyBrandStorage(storage)).toBe(true);
    expect(values.get("aartha-store")).toBe(STATE);
    expect(values.has("salaryflow-store")).toBe(false);
  });

  it("leaves existing current-key data untouched", () => {
    const { values, storage } = makeStorage([
      ["aartha-store", STATE],
      ["spendly-store", '{"state":{"expenses":[{"id":"stale"}]},"version":1}'],
    ]);

    expect(migrateLegacyBrandStorage(storage)).toBe(false);
    expect(values.get("aartha-store")).toBe(STATE);
  });
});

describe("India financial years", () => {
  it("switches to the new year on April 1", () => {
    expect(currentFinancialYearStart(new Date(2026, 2, 31))).toBe(2025);
    expect(currentFinancialYearStart(new Date(2026, 3, 1))).toBe(2026);
  });

  it("includes April through March and excludes the next April", () => {
    expect(isInFinancialYear("2026-04-01", 2026)).toBe(true);
    expect(isInFinancialYear("2027-03-31", 2026)).toBe(true);
    expect(isInFinancialYear("2027-04-01", 2026)).toBe(false);
    expect(financialYearMonths(2026).map((month) => month.label)).toEqual([
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Jan",
      "Feb",
      "Mar",
    ]);
  });
});

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

describe("budget allocation targets", () => {
  it("derives the monthly savings target from the active rule", () => {
    expect(budgetAllocationTarget(rule, "savings", 31_431)).toBeCloseTo(4_714.65);
  });

  it("does not penalize spending below limits or saving above targets", () => {
    const evaluation = evaluateBudgetRule(rule, 10_000, 4_000, 1_000, 2_000, 1_500);

    expect(evaluation.score).toBe(100);
  });

  it("penalizes only spending above limits and saving below targets", () => {
    const evaluation = evaluateBudgetRule(rule, 10_000, 6_000, 2_000, 500, 500);

    expect(evaluation.score).toBe(85);
  });
});

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

  it("keeps weekly cycles continuous across a month boundary", () => {
    const weeklyProfile = { ...profile, cycle: "weekly" as const, salaryDay: 30 };
    const july = cycleInfo(weeklyProfile, new Date(2026, 6, 31, 12));
    const august = cycleInfo(weeklyProfile, new Date(2026, 7, 1, 12));

    expect((august.daysElapsed - july.daysElapsed + 7) % 7).toBe(1);
  });
});

describe("currency formatting", () => {
  it("uses Indian lakh grouping for INR across compact and regular call sites", () => {
    expect(formatMoney(100_000, "INR")).toBe("₹1,00,000");
    expect(formatMoney(100_000, "INR", true)).toBe("₹1,00,000");
  });

  it("uses the currency locale grouping for non-Indian currencies", () => {
    expect(formatMoney(100_000, "USD")).toBe("$100,000");
  });

  /**
   * Paise are worth showing when they exist and worth hiding when they do not.
   * Rounding them away made a ₹150.50 fill read as ₹151 everywhere, so the
   * amount on screen never matched the one that had been typed in.
   */
  it("shows paise when an amount has them", () => {
    expect(formatMoney(150.5, "INR")).toBe("₹150.50");
    expect(formatMoney(150.55, "INR")).toBe("₹150.55");
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
  });

  it("leaves a whole amount unchanged rather than padding it", () => {
    expect(formatMoney(150, "INR")).toBe("₹150");
    expect(formatMoney(100_000, "INR")).toBe("₹1,00,000");
  });

  it("rounds a longer fraction to two places instead of spilling", () => {
    expect(formatMoney(1234.5678, "INR")).toBe("₹1,234.57");
    expect(formatMoney(1 / 3, "INR")).toBe("₹0.33");
  });
});

describe("closing account transfers", () => {
  const closingAccount: BankAccount = {
    id: "closing",
    bankName: "Closing Bank",
    accountType: "Savings",
    balance: 10_000,
    status: "closing",
  };

  it("keeps goal allocations on the source after a partial transfer", () => {
    expect(shouldReassignClosingAllocations(closingAccount, 4_000)).toBe(false);
  });

  it("moves goal allocations when the closing account is emptied", () => {
    expect(shouldReassignClosingAllocations(closingAccount, 10_000)).toBe(true);
  });
});

describe("account deletion references", () => {
  const emptyRecords = {
    expenses: [],
    incomes: [],
    bills: [],
    goals: [],
    investments: [],
    transfers: [],
    recycleBin: [],
  };

  it("allows an account with no finance references to be deleted", () => {
    expect(accountDeletionBlocker("unused", emptyRecords)).toBeUndefined();
  });

  it("blocks deletion when goal money is allocated to the account", () => {
    const reason = accountDeletionBlocker("save-a", {
      ...emptyRecords,
      goals: [
        {
          id: "goal",
          name: "Emergency fund",
          type: "Emergency Fund",
          target: 50_000,
          saved: 0,
          monthlyContribution: 5_000,
          contributions: [
            {
              id: "allocation",
              amount: 5_000,
              date: "2026-08-10T12:00:00.000Z",
              accountId: "save-a",
            },
          ],
        },
      ],
    });

    expect(reason).toContain("goal allocations");
  });

  it("blocks deletion when transfers preserve the account's cash-flow history", () => {
    const reason = accountDeletionBlocker("save-a", {
      ...emptyRecords,
      transfers: [transfer({ destinationAccountId: "save-a" })],
    });

    expect(reason).toContain("transfers");
  });

  it("blocks deletion when a recycled goal still allocates money to the account", () => {
    const reason = accountDeletionBlocker("save-a", {
      ...emptyRecords,
      recycleBin: [
        {
          id: "trash-goal",
          entityType: "goal",
          entityId: "goal",
          label: "Bike",
          deletedAt: "2026-08-10T12:00:00.000Z",
          data: {
            id: "goal",
            name: "Bike",
            type: "Bike",
            target: 80_000,
            saved: 0,
            monthlyContribution: 5_000,
            contributions: [
              {
                id: "allocation",
                amount: 10_000,
                date: "2026-08-10T12:00:00.000Z",
                accountId: "save-a",
              },
            ],
          },
        },
      ],
    });

    expect(reason).toContain("recycled records");
  });

  it.each(["expense", "bill", "investment"] as const)(
    "blocks deletion when a recycled %s still references the account",
    (entityType) => {
      const reason = accountDeletionBlocker("save-a", {
        ...emptyRecords,
        recycleBin: [
          {
            id: `trash-${entityType}`,
            entityType,
            entityId: entityType,
            label: `Recycled ${entityType}`,
            deletedAt: "2026-08-10T12:00:00.000Z",
            data: { id: entityType, accountId: "save-a" },
          },
        ],
      });

      expect(reason).toContain("recycled records");
    },
  );
});

describe("goal restoration", () => {
  const account: BankAccount = {
    id: "save-a",
    bankName: "Savings A",
    accountType: "Savings",
    balance: 10_000,
    status: "active",
  };
  const recycledGoal: Goal = {
    id: "bike",
    name: "Bike",
    type: "Bike",
    target: 80_000,
    saved: 0,
    monthlyContribution: 5_000,
    contributions: [
      {
        id: "bike-allocation",
        amount: 6_000,
        date: "2026-08-10T12:00:00.000Z",
        accountId: "save-a",
      },
    ],
  };

  it("allows a goal restore when its allocations still fit", () => {
    expect(goalRestoreBlocker(recycledGoal, [account], [])).toBeUndefined();
  });

  it("blocks a goal restore when other goals have claimed the free balance", () => {
    const liveGoal: Goal = {
      ...recycledGoal,
      id: "emergency",
      name: "Emergency",
      contributions: [
        {
          id: "emergency-allocation",
          amount: 5_000,
          date: "2026-08-10T12:00:00.000Z",
          accountId: "save-a",
        },
      ],
    };

    expect(goalRestoreBlocker(recycledGoal, [account], [liveGoal])).toContain("Only 5000");
  });

  it("blocks a goal restore when its account no longer exists", () => {
    expect(goalRestoreBlocker(recycledGoal, [], [])).toContain("no longer exists");
  });
});

describe("sync traffic", () => {
  function syncResponse() {
    return {
      ok: true,
      json: async () => ({ data: null, syncedAt: "2026-08-14T12:00:00.000Z" }),
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends nothing when the state has not changed since the last push", async () => {
    const fetchMock = vi.fn().mockResolvedValue(syncResponse());
    vi.stubGlobal("fetch", fetchMock);
    useFinanceStore.getState().resetAll();
    useFinanceStore.setState({ expenses: [], accounts: [] });

    await useFinanceStore.getState().syncWithServer();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Opening a page or re-saving an unchanged form used to cost a full
    // upload and a full download back.
    await useFinanceStore.getState().syncWithServer();
    await useFinanceStore.getState().syncWithServer();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends again once something actually changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(syncResponse());
    vi.stubGlobal("fetch", fetchMock);
    useFinanceStore.getState().resetAll();

    await useFinanceStore.getState().syncWithServer();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    useFinanceStore.getState().addExpense({
      amount: 200,
      category: "Food",
      paymentMethod: "UPI",
      date: "2026-08-14T12:00:00.000Z",
    } as Omit<Expense, "id">);

    await useFinanceStore.getState().syncWithServer();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not let a slow pull overwrite an edit made while it was in flight", async () => {
    let releasePull: (value: unknown) => void = () => {};
    const pull = new Promise((resolve) => {
      releasePull = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        await pull;
        return {
          ok: true,
          json: async () => ({ data: { expenses: [] }, syncedAt: "2026-08-14T12:00:00.000Z" }),
        };
      }),
    );

    useFinanceStore.getState().resetAll();
    const loading = useFinanceStore.getState().loadFromServer();

    useFinanceStore.getState().addExpense({
      amount: 500,
      category: "Food",
      merchant: "Recorded mid-pull",
      paymentMethod: "UPI",
      date: "2026-08-14T12:00:00.000Z",
    } as Omit<Expense, "id">);

    releasePull(null);
    await loading;

    expect(useFinanceStore.getState().expenses).toHaveLength(1);
    expect(useFinanceStore.getState().expenses[0].merchant).toBe("Recorded mid-pull");
  });
});

describe("shared expense balance reversal", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refunds on delete and reapplies on restore exactly once", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const sharedExpense: Expense = {
      id: "shared-expense",
      amount: 1_000,
      category: "Food",
      merchant: "Shared dinner",
      paymentMethod: "UPI",
      date: "2026-08-10T12:00:00.000Z",
      accountId: "spend",
      balanceApplied: true,
      shared: {
        totalAmount: 1_500,
        friendName: "Friend",
        userPaid: 1_000,
        friendPaid: 500,
      },
    };

    useFinanceStore.setState({
      accounts: [
        {
          id: "spend",
          bankName: "Spending",
          accountType: "Salary",
          balance: 9_000,
          status: "active",
        },
      ],
      expenses: [sharedExpense],
      recycleBin: [],
    });

    useFinanceStore.getState().deleteExpense(sharedExpense.id);
    expect(useFinanceStore.getState().accounts[0].balance).toBe(10_000);
    expect(useFinanceStore.getState().expenses).toHaveLength(0);

    useFinanceStore.getState().deleteExpense(sharedExpense.id);
    expect(useFinanceStore.getState().accounts[0].balance).toBe(10_000);

    const recycleId = useFinanceStore.getState().recycleBin[0].id;
    expect((await useFinanceStore.getState().restoreRecycleItem(recycleId)).ok).toBe(true);
    expect(useFinanceStore.getState().accounts[0].balance).toBe(9_000);
    expect(useFinanceStore.getState().expenses).toHaveLength(1);

    expect((await useFinanceStore.getState().restoreRecycleItem(recycleId)).ok).toBe(false);
    expect(useFinanceStore.getState().accounts[0].balance).toBe(9_000);
  });

  it("restores the old account and deducts the new account exactly once when moved", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const sharedExpense: Expense = {
      id: "moved-shared-expense",
      amount: 1_000,
      category: "Food",
      merchant: "Shared dinner",
      paymentMethod: "UPI",
      date: "2026-08-10T12:00:00.000Z",
      accountId: "account-a",
      balanceApplied: true,
      shared: {
        totalAmount: 1_500,
        friendName: "Friend",
        userPaid: 1_000,
        friendPaid: 500,
      },
    };

    useFinanceStore.setState({
      accounts: [
        {
          id: "account-a",
          bankName: "Account A",
          accountType: "Salary",
          balance: 9_000,
          status: "active",
        },
        {
          id: "account-b",
          bankName: "Account B",
          accountType: "Savings",
          balance: 5_000,
          status: "active",
        },
      ],
      expenses: [sharedExpense],
      recycleBin: [],
    });

    const patch = {
      accountId: "account-b",
      amount: 1_200,
      shared: { ...sharedExpense.shared!, userPaid: 1_200, friendPaid: 300 },
    };
    expect(useFinanceStore.getState().updateExpense(sharedExpense.id, patch)).toBe(true);
    expect(useFinanceStore.getState().accounts.map((account) => account.balance)).toEqual([
      10_000, 3_800,
    ]);

    expect(useFinanceStore.getState().updateExpense(sharedExpense.id, patch)).toBe(true);
    expect(useFinanceStore.getState().accounts.map((account) => account.balance)).toEqual([
      10_000, 3_800,
    ]);
  });
});

describe("ordinary expense balance deduction", () => {
  const account = {
    id: "icici",
    bankName: "ICICI Bank",
    accountType: "Savings" as const,
    balance: 5_000,
    status: "active" as const,
  };

  const card = {
    id: "icici-card",
    name: "ICICI Credit Card",
    bankName: "ICICI Bank",
    creditLimit: 50_000,
    statementDay: 5,
    dueDay: 20,
    status: "active" as const,
  };

  const spend = {
    amount: 1_500,
    category: "Fuel",
    merchant: "Narnarayan Fuel Point",
    paymentMethod: "UPI",
    date: "2026-08-13T12:00:00.000Z",
  } as Omit<Expense, "id">;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    useFinanceStore.setState({
      accounts: [{ ...account }],
      creditCards: [{ ...card }],
      expenses: [],
      recycleBin: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reduces the bank balance for a plain expense paid from that account", () => {
    expect(useFinanceStore.getState().addExpense({ ...spend, accountId: "icici" })).toBe(true);
    expect(useFinanceStore.getState().accounts[0].balance).toBe(3_500);
    expect(useFinanceStore.getState().expenses[0].balanceApplied).toBe(true);
  });

  it("refunds the account when that expense is deleted", () => {
    useFinanceStore.getState().addExpense({ ...spend, accountId: "icici" });
    useFinanceStore.getState().deleteExpense(useFinanceStore.getState().expenses[0].id);
    expect(useFinanceStore.getState().accounts[0].balance).toBe(5_000);
  });

  it("moves the deduction when the expense is repointed at another account", () => {
    useFinanceStore.setState({
      accounts: [
        { ...account },
        {
          id: "bob",
          bankName: "Bank of Baroda",
          accountType: "Savings",
          balance: 9_000,
          status: "active",
        },
      ],
    });
    useFinanceStore.getState().addExpense({ ...spend, accountId: "icici" });
    const id = useFinanceStore.getState().expenses[0].id;

    expect(useFinanceStore.getState().updateExpense(id, { accountId: "bob" })).toBe(true);
    expect(useFinanceStore.getState().accounts.map((entry) => entry.balance)).toEqual([
      5_000, 7_500,
    ]);
  });

  it("leaves every bank balance alone when a credit card paid", () => {
    expect(useFinanceStore.getState().addExpense({ ...spend, accountId: "icici-card" })).toBe(true);
    expect(useFinanceStore.getState().accounts[0].balance).toBe(5_000);
    expect(useFinanceStore.getState().expenses[0].balanceApplied).toBe(false);
  });

  /**
   * An expense is a record of something that already happened. The bank has
   * taken the money whether or not this app's mirror of the balance agrees, so
   * refusing the entry does not undo the payment — it only stops the app from
   * knowing about it, and leaves the mirror drifting further from the truth
   * with every spend that cannot be entered.
   */
  it("records a spend the mirrored balance cannot cover and lets it go negative", () => {
    expect(useFinanceStore.getState().addExpense({ ...spend, amount: 6_000, accountId: "icici" }))
      .toBe(true);
    expect(useFinanceStore.getState().accounts[0].balance).toBe(-1_000);
    expect(useFinanceStore.getState().expenses).toHaveLength(1);
  });

  it("returns the balance to where it was when that spend is deleted", () => {
    useFinanceStore.getState().addExpense({ ...spend, amount: 6_000, accountId: "icici" });
    useFinanceStore.getState().deleteExpense(useFinanceStore.getState().expenses[0].id);
    expect(useFinanceStore.getState().accounts[0].balance).toBe(5_000);
  });

  it("lets an edit push the balance below zero rather than rejecting the correction", () => {
    useFinanceStore.getState().addExpense({ ...spend, accountId: "icici" });
    const id = useFinanceStore.getState().expenses[0].id;

    expect(useFinanceStore.getState().updateExpense(id, { amount: 6_000 })).toBe(true);
    expect(useFinanceStore.getState().accounts[0].balance).toBe(-1_000);
  });
});

describe("finance summary", () => {
  const now = new Date("2026-03-02T12:00:00.000Z");

  it("uses confirmed salary for budget targets while retaining other cycle income", () => {
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
    expect(summary.salaryIncome).toBe(32_000);
    expect(summary.savingsTarget).toBe(4_800);
    expect(summary.investmentTarget).toBe(4_800);
    expect(summary.spendingBudget).toBe(23_400);
  });

  it("subtracts today's spending exactly once from today's safe amount", () => {
    const today = new Date("2026-03-02T12:00:00.000Z");
    const withoutToday = computeSummary(profile, [], [], [], [], [], undefined, [], [], today);
    const withToday = computeSummary(
      profile,
      [expense({ amount: 500, date: today.toISOString() })],
      [],
      [],
      [],
      [],
      undefined,
      [],
      [],
      today,
    );

    expect(withToday.safeToSpendPerDay).toBeCloseTo(withoutToday.safeToSpendPerDay);
    expect(withToday.safeToSpendToday).toBeCloseTo(withoutToday.safeToSpendToday - 500);
  });

  it("counts groceries as Needs while retaining variable-expense reporting", () => {
    const summary = computeSummary(
      profile,
      [
        expense({ id: "groceries", amount: 1_414, category: "Groceries" }),
        expense({ id: "shopping", amount: 500, category: "Shopping" }),
        expense({ id: "subscription", amount: 200, category: "Subscriptions" }),
      ],
      [],
      [],
      [],
      [],
      rule,
      [],
      [],
      now,
    );

    expect(summary.fixedExpenses).toBe(200);
    expect(summary.variableExpenses).toBe(1_914);
    expect(summary.budgetProgress?.needs.used).toBe(1_414);
    expect(summary.budgetProgress?.wants.used).toBe(700);
  });

  it("does not count reimbursements or cashback as income", () => {
    const credits: Income[] = [
      {
        id: "reimbursement",
        amount: 1_000,
        type: "Reimbursement",
        source: "Shared hotel reimbursement",
        date: "2026-03-01T08:00:00.000Z",
      },
      {
        id: "cashback",
        amount: 197,
        type: "Cashback",
        source: "Credit card cashback",
        date: "2026-03-01T09:00:00.000Z",
      },
    ];
    const summary = computeSummary(
      profile,
      [],
      credits,
      [],
      [],
      [{ amount: 32_167, date: "2026-02-28T08:00:00.000Z", confirmed: true }],
      rule,
      [],
      [],
      now,
    );

    expect(summary.income).toBe(32_167);
    expect(summary.salaryIncome).toBe(32_167);
    expect(summary.savingsTarget).toBeCloseTo(4_825.05);
  });

  it("does not add a salary income record on top of the salary source of truth", () => {
    const summary = computeSummary(
      profile,
      [],
      [
        {
          id: "duplicate-salary",
          amount: 30_000,
          type: "Salary",
          source: "Salary deposit",
          date: "2026-03-01T08:00:00.000Z",
        },
      ],
      [],
      [],
      [],
      rule,
      [],
      [],
      now,
    );

    expect(summary.income).toBe(30_000);
    expect(summary.salaryIncome).toBe(30_000);
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

  it("counts transfers into an account that directly backs a savings goal", () => {
    const emergencyAccount: BankAccount = {
      id: "emergency-account",
      bankName: "Central Bank",
      accountType: "Savings",
      balance: 5_000,
      status: "active",
    };
    const emergencyGoal: Goal = {
      id: "emergency-goal",
      name: "Emergency Fund",
      type: "Emergency Fund",
      target: 100_000,
      saved: 0,
      monthlyContribution: 5_000,
      balanceAccountId: emergencyAccount.id,
    };

    const summary = computeSummary(
      profile,
      [],
      [],
      [],
      [emergencyGoal],
      [],
      rule,
      [...savingsAccounts, emergencyAccount],
      [
        transfer({
          destinationAccountId: emergencyAccount.id,
          amount: 5_000,
        }),
      ],
      now,
    );

    expect(summary.savedThisCycle).toBe(5_000);
  });

  it("ignores a reimbursement landing in a savings account", () => {
    const summary = computeSummary(
      profile,
      [],
      [
        {
          id: "friend-repayment",
          amount: 1_000,
          type: "Reimbursement",
          source: "Swarali",
          date: now.toISOString(),
          accountId: "save-a",
        },
      ],
      [],
      [],
      [],
      rule,
      savingsAccounts,
      [transfer()],
      now,
    );

    // The transfer alone. Being paid back for something already spent is the
    // back half of an outflow, not new money set aside.
    expect(summary.savedThisCycle).toBe(5_000);
  });

  it("still counts a real deposit into a savings account", () => {
    const summary = computeSummary(
      profile,
      [],
      [
        {
          id: "bonus",
          amount: 1_000,
          type: "Bonus",
          source: "Diwali bonus",
          date: now.toISOString(),
          accountId: "save-a",
        },
      ],
      [],
      [],
      [],
      rule,
      savingsAccounts,
      [transfer()],
      now,
    );

    expect(summary.savedThisCycle).toBe(6_000);
  });

  it("keeps savings reserved to a goal neutral when its account closes", () => {
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
        transfer({
          sourceAccountId: "save-a",
          destinationAccountId: "spend",
          amount: 5_000,
          goalId: "bike",
          goalAmount: 5_000,
        }),
      ],
      now,
    );

    expect(summary.savedThisCycle).toBe(0);
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
        type: "Cashback",
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

  it("keeps unpaid charges outstanding after a statement closes", () => {
    const card: CreditCard = {
      id: "card",
      name: "Card",
      bankName: "Bank",
      creditLimit: 10_000,
      statementDay: 26,
      status: "active",
    };
    const usage = creditCardUsage(
      card,
      [
        expense({
          id: "previous-statement",
          amount: 855,
          accountId: "card",
          date: "2026-07-26T10:00:00.000Z",
        }),
        expense({
          id: "current-statement",
          amount: 1_881,
          accountId: "card",
          date: "2026-08-06T10:00:00.000Z",
        }),
      ],
      [],
      new Date("2026-08-11T12:00:00.000Z"),
    );

    expect(usage.charges).toBe(2_736);
    expect(usage.outstanding).toBe(2_736);
  });

  /**
   * A closed statement and the one still accruing are two obligations with two
   * due dates. Reporting a single total against the upcoming close told a user
   * that money already owed was not needed until next month.
   */
  describe("splitting a closed statement from the one still open", () => {
    const card: CreditCard = {
      id: "icici",
      name: "ICICI",
      bankName: "ICICI",
      creditLimit: 100_000,
      statementDay: 5,
      status: "active",
    };
    // Statement closed 5 Aug and was not paid. Today is 20 Aug.
    const now = new Date(2026, 7, 20, 12, 0);
    const billed = expense({
      id: "billed",
      amount: 4_000,
      accountId: "icici",
      date: new Date(2026, 6, 28, 12, 0).toISOString(),
    });
    const accruing = expense({
      id: "accruing",
      amount: 1_000,
      accountId: "icici",
      date: new Date(2026, 7, 18, 12, 0).toISOString(),
    });

    it("separates what is already due from what is still accruing", () => {
      const usage = creditCardUsage(card, [billed, accruing], [], now);

      expect(usage.billedOutstanding).toBe(4_000);
      expect(usage.currentOutstanding).toBe(1_000);
      expect(usage.outstanding).toBe(5_000);
      expect(usage.previousStatementEnd.getMonth()).toBe(7); // closed in August
      expect(usage.end.getMonth()).toBe(8); // next closes in September
    });

    it("keeps the two parts summing to the running total", () => {
      const usage = creditCardUsage(card, [billed, accruing], [], now);
      expect(usage.billedOutstanding + usage.currentOutstanding).toBe(usage.outstanding);
    });

    it("pays the closed statement off before the open one", () => {
      const payment = {
        id: "payment",
        amount: 4_000,
        type: "Other" as const,
        source: "Card payment",
        accountId: "icici",
        date: new Date(2026, 7, 19, 12, 0).toISOString(),
      };
      const usage = creditCardUsage(card, [billed, accruing], [payment], now);

      expect(usage.billedOutstanding).toBe(0);
      expect(usage.currentOutstanding).toBe(1_000);
      expect(usage.outstanding).toBe(1_000);
    });

    it("spills an overpayment onto the open statement rather than going negative", () => {
      const payment = {
        id: "payment",
        amount: 4_500,
        type: "Other" as const,
        source: "Card payment",
        accountId: "icici",
        date: new Date(2026, 7, 19, 12, 0).toISOString(),
      };
      const usage = creditCardUsage(card, [billed, accruing], [payment], now);

      expect(usage.billedOutstanding).toBe(0);
      expect(usage.currentOutstanding).toBe(500);
    });

    it("bills nothing when every charge is on the open statement", () => {
      const usage = creditCardUsage(card, [accruing], [], now);

      expect(usage.billedOutstanding).toBe(0);
      expect(usage.currentOutstanding).toBe(1_000);
    });

    it("gives the closed statement its own funding line, dated to when it closed", () => {
      const plan = buildFundingPlan({
        accounts: [],
        bills: [],
        creditCards: [card],
        expenses: [billed, accruing],
        incomes: [],
        investments: [],
        monthlyIncome: 50_000,
        now,
      });

      const due = plan.items.find((item) => item.id === "card-icici-due");
      const open = plan.items.find((item) => item.id === "card-icici-open");

      expect(due?.amount).toBe(4_000);
      expect(due?.timing).toContain("Aug");
      expect(open?.amount).toBe(1_000);
      expect(open?.timing).toContain("Sep");
    });

    it("emits only the open line when nothing has been billed yet", () => {
      const plan = buildFundingPlan({
        accounts: [],
        bills: [],
        creditCards: [card],
        expenses: [accruing],
        incomes: [],
        investments: [],
        monthlyIncome: 50_000,
        now,
      });

      expect(plan.items.find((item) => item.id === "card-icici-due")).toBeUndefined();
      expect(plan.items.find((item) => item.id === "card-icici-open")?.amount).toBe(1_000);
    });
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

  it("schedules a 90-day recharge and reserves one third each salary cycle", () => {
    const recharge: Bill = {
      id: "jio",
      name: "Jio 90-day recharge",
      amount: 899,
      dueDay: 7,
      dueDate: "2026-11-07",
      frequency: "interval",
      intervalDays: 90,
      category: "Mobile & Internet",
      paid: false,
      accountId: "spend",
    };

    expect(billOccurrenceDate(recharge, new Date(2026, 7, 9, 12))).toEqual(
      new Date(2026, 10, 7, 12),
    );
    expect(monthlyBillReserve(recharge)).toBeCloseTo(899 / 3);

    const plan = buildFundingPlan({
      accounts: savingsAccounts,
      bills: [recharge],
      creditCards: [],
      expenses: [],
      incomes: [],
      investments: [],
      monthlyIncome: 30_000,
      now: new Date(2026, 7, 9, 12),
    });
    const reserve = plan.items.find((item) => item.id === "bill-reserve-jio");
    expect(reserve?.amount).toBeCloseTo(899 / 3);
    expect(reserve?.timing).toContain("Every 90 days");
    expect(plan.total).toBeCloseTo(899 / 3);
  });

  it("keeps a future yearly bill anchored to its selected first due date", () => {
    const renewal: Bill = {
      id: "domain-renewal",
      name: "Domain renewal",
      amount: 1_124.7,
      dueDay: 11,
      dueDate: "2027-08-11",
      frequency: "yearly",
      category: "Business",
      paid: false,
    };

    expect(billOccurrenceDate(renewal, new Date(2026, 7, 11, 12))).toEqual(
      new Date(2027, 7, 11, 12),
    );
  });

  it("anchors a legacy bill without dueDate in the current month", () => {
    const legacy = { ...bill, dueDate: undefined, dueDay: 12 };
    expect(billOccurrenceDate(legacy, new Date(2026, 7, 9, 12))).toEqual(new Date(2026, 7, 12));
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
      expenses: [expense({ amount: 1_000, accountId: "card", date: "2026-03-10T10:00:00.000Z" })],
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

  it("uses displayed investment bills when calculating the rule top-up", () => {
    const investmentBill: Bill = {
      ...bill,
      id: "sip-bill",
      name: "Index SIP",
      amount: 5_000,
      category: "Investment",
    };
    const plan = buildFundingPlan({
      accounts: savingsAccounts,
      bills: [investmentBill],
      creditCards: [],
      expenses: [],
      incomes: [],
      investments: [
        {
          id: "legacy-sip",
          name: "Legacy SIP",
          type: "SIP",
          invested: 0,
          currentValue: 0,
          monthly: 2_000,
        },
      ],
      budgetRule: rule,
      monthlyIncome: 30_000,
      now: new Date("2026-03-20T12:00:00.000Z"),
    });

    expect(plan.items.find((item) => item.label.includes("top-up"))).toBeUndefined();
  });
});

describe("allocations", () => {
  const goal = (id: string, contributions: GoalContribution[]): Goal => ({
    id,
    name: id,
    type: "Custom",
    target: 100000,
    saved: 0,
    monthlyContribution: 0,
    contributions,
  });

  const account: BankAccount = {
    id: "union",
    bankName: "Union Bank",
    accountType: "Savings",
    balance: 10569,
    status: "active",
  };

  it("sums contributions into a goal total", () => {
    const bike = goal("bike", [
      { id: "c1", amount: 6000, date: "2026-08-01T00:00:00.000Z" },
      { id: "c2", amount: 4000, date: "2026-08-05T00:00:00.000Z" },
    ]);
    expect(goalSaved(bike)).toBe(10000);
  });

  it("treats a goal with no contributions as zero", () => {
    expect(goalSaved(goal("empty", []))).toBe(0);
  });

  it("tracks an account-backed goal from the account's live balance", () => {
    const emergency = { ...goal("emergency", []), balanceAccountId: "union" };

    expect(goalSaved(emergency, [account])).toBe(10_569);
    expect(goalSaved(emergency, [{ ...account, balance: 7_000 }])).toBe(7_000);
    expect(accountAllocated([emergency], "union", [account])).toBe(10_569);
    expect(accountFree([emergency], account)).toBe(0);
    expect(goalAccountBreakdown(emergency, [account])).toEqual([
      { accountId: "union", amount: 10_569 },
    ]);
  });

  it("sums allocations across goals for one account", () => {
    const goals = [
      goal("bike", [{ id: "c1", amount: 10000, date: "2026-08-01", accountId: "union" }]),
      goal("mobile", [{ id: "c2", amount: 489, date: "2026-08-01", accountId: "union" }]),
      goal("other", [{ id: "c3", amount: 5000, date: "2026-08-01", accountId: "hdfc" }]),
    ];
    expect(accountAllocated(goals, "union")).toBe(10489);
    expect(accountAllocated(goals, "hdfc")).toBe(5000);
  });

  it("computes the user scenario: 80 free after a 10489 split", () => {
    const goals = [
      goal("bike", [{ id: "c1", amount: 10000, date: "2026-08-01", accountId: "union" }]),
      goal("mobile", [{ id: "c2", amount: 489, date: "2026-08-01", accountId: "union" }]),
    ];
    expect(accountFree(goals, account)).toBe(80);
  });

  it("excludes contributions with no account from account totals", () => {
    const goals = [goal("bike", [{ id: "c1", amount: 5000, date: "2026-08-01" }])];
    expect(accountAllocated(goals, "union")).toBe(0);
    expect(unassignedSaved(goals[0])).toBe(5000);
  });

  it("detects an over-allocated account", () => {
    const goals = [
      goal("bike", [{ id: "c1", amount: 10000, date: "2026-08-01", accountId: "union" }]),
    ];
    expect(isOverAllocated(goals, account)).toBe(false);
    expect(isOverAllocated(goals, { ...account, balance: 9000 })).toBe(true);
  });

  it("breaks a goal down by the accounts holding it", () => {
    const bike = goal("bike", [
      { id: "c1", amount: 6000, date: "2026-08-01", accountId: "union" },
      { id: "c2", amount: 4000, date: "2026-08-02", accountId: "union" },
      { id: "c3", amount: 500, date: "2026-08-03" },
    ]);
    expect(goalAccountBreakdown(bike)).toEqual([
      { accountId: "union", amount: 10000 },
      { accountId: undefined, amount: 500 },
    ]);
  });
});

describe("goal opening-balance migration", () => {
  const legacy: Goal = {
    id: "bike",
    name: "Bike",
    type: "Bike",
    target: 85000,
    saved: 5000,
    monthlyContribution: 2000,
  };

  it("backfills an opening contribution for legacy saved amounts", () => {
    const [migrated] = migrateGoalOpeningBalances([legacy]);
    expect(migrated.contributions).toHaveLength(1);
    expect(migrated.contributions?.[0].amount).toBe(5000);
    expect(migrated.contributions?.[0].opening).toBe(true);
    expect(migrated.contributions?.[0].accountId).toBeUndefined();
    expect(goalSaved(migrated)).toBe(5000);
  });

  it("is idempotent", () => {
    const once = migrateGoalOpeningBalances([legacy]);
    const twice = migrateGoalOpeningBalances(once);
    expect(twice[0].contributions).toHaveLength(1);
    expect(goalSaved(twice[0])).toBe(5000);
  });

  it("backfills only the difference when contributions partly cover saved", () => {
    const partial: Goal = {
      ...legacy,
      contributions: [{ id: "c1", amount: 2000, date: "2026-07-01T00:00:00.000Z" }],
    };
    const [migrated] = migrateGoalOpeningBalances([partial]);
    expect(migrated.contributions).toHaveLength(2);
    expect(goalSaved(migrated)).toBe(5000);
  });

  it("leaves goals with no saved amount untouched", () => {
    const [migrated] = migrateGoalOpeningBalances([{ ...legacy, saved: 0 }]);
    expect(migrated.contributions ?? []).toHaveLength(0);
  });

  it("does not remove money when contributions exceed the stored saved value", () => {
    const richer: Goal = {
      ...legacy,
      saved: 1000,
      contributions: [{ id: "c1", amount: 4000, date: "2026-07-01T00:00:00.000Z" }],
    };
    const [migrated] = migrateGoalOpeningBalances([richer]);
    expect(goalSaved(migrated)).toBe(4000);
    expect(migrated.contributions).toHaveLength(1);
  });
});

describe("allocation writes", () => {
  const union: BankAccount = {
    id: "union",
    bankName: "Union Bank",
    accountType: "Savings",
    balance: 10569,
    status: "active",
  };
  const bike: Goal = {
    id: "bike",
    name: "Bike",
    type: "Bike",
    target: 85000,
    saved: 0,
    monthlyContribution: 8000,
    contributions: [],
  };
  const mobile: Goal = {
    id: "mobile",
    name: "Mobile",
    type: "Phone",
    target: 25000,
    saved: 0,
    monthlyContribution: 2000,
    contributions: [],
  };
  const when = new Date("2026-08-09T10:00:00.000Z");

  it("splits a transfer across goals atomically", () => {
    const result = applyAllocation(
      [bike, mobile],
      [union],
      [
        { goalId: "bike", amount: 10000 },
        { goalId: "mobile", amount: 489 },
      ],
      "union",
      "transfer-1",
      when,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(goalSaved(result.goals[0])).toBe(10000);
    expect(goalSaved(result.goals[1])).toBe(489);
    expect(accountFree(result.goals, union)).toBe(80);
    expect(result.goals[0].contributions?.[0].transferId).toBe("transfer-1");
  });

  it("rejects a split that exceeds the free balance", () => {
    const result = applyAllocation(
      [bike, mobile],
      [union],
      [{ goalId: "bike", amount: 11000 }],
      "union",
      undefined,
      when,
    );
    expect(result.ok).toBe(false);
  });

  it("writes nothing at all when one entry breaks the invariant", () => {
    const result = applyAllocation(
      [bike, mobile],
      [union],
      [
        { goalId: "bike", amount: 10000 },
        { goalId: "mobile", amount: 5000 },
      ],
      "union",
      undefined,
      when,
    );
    expect(result.ok).toBe(false);
    expect(goalSaved(bike)).toBe(0);
    expect(goalSaved(mobile)).toBe(0);
  });

  it("counts money already allocated when checking the invariant", () => {
    const funded = [
      {
        ...bike,
        contributions: [{ id: "c1", amount: 10000, date: "2026-08-01", accountId: "union" }],
      },
      mobile,
    ];
    const result = applyAllocation(
      funded,
      [union],
      [{ goalId: "mobile", amount: 600 }],
      "union",
      undefined,
      when,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown account", () => {
    const result = applyAllocation(
      [bike],
      [union],
      [{ goalId: "bike", amount: 100 }],
      "missing",
      undefined,
      when,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects manual allocations into a goal that tracks an account balance", () => {
    const emergency = { ...bike, balanceAccountId: "union" };
    const result = applyAllocation(
      [emergency],
      [union],
      [{ goalId: "bike", amount: 100 }],
      "union",
      undefined,
      when,
    );

    expect(result).toEqual({
      ok: false,
      reason: "That goal already tracks its linked account automatically.",
    });
  });

  it("rejects an allocation from outside an ordinary goal's preferred bank", () => {
    const linkedBike = { ...bike, preferredAccountId: "hdfc" };
    const result = applyAllocation(
      [linkedBike],
      [union],
      [{ goalId: "bike", amount: 100 }],
      "union",
      undefined,
      when,
    );

    expect(result).toEqual({ ok: false, reason: "Bike is linked to another bank." });
  });

  it("moves allocations to the destination when an account closes", () => {
    const funded = [
      {
        ...bike,
        contributions: [{ id: "c1", amount: 10000, date: "2026-08-01", accountId: "hdfc" }],
      },
    ];
    const moved = reassignGoalAccounts(funded, "hdfc", "union");
    expect(accountAllocated(moved, "union")).toBe(10000);
    expect(accountAllocated(moved, "hdfc")).toBe(0);
  });

  it("moves an account-backed goal when its account closes", () => {
    const emergency = { ...bike, balanceAccountId: "hdfc" };

    const [moved] = reassignGoalAccounts([emergency], "hdfc", "union");

    expect(moved.balanceAccountId).toBe("union");
  });
});

describe("goal contributions in the cycle", () => {
  const inCycle = new Date("2026-08-09T00:00:00.000Z");

  const goalWith = (contributions: GoalContribution[]): Goal => ({
    id: "bike",
    name: "Bike",
    type: "Bike",
    target: 85_000,
    saved: 0,
    monthlyContribution: 8_000,
    contributions,
  });

  it("ignores migrated opening balances when counting this cycle's savings", () => {
    const summary = computeSummary(
      profile,
      [],
      [],
      [],
      [goalWith([{ id: "c1", amount: 5_000, date: inCycle.toISOString(), opening: true }])],
      [],
      undefined,
      [],
      [],
      inCycle,
    );
    expect(summary.savedThisCycle).toBe(0);
  });

  it("does not count assigning existing account money to a goal as new savings", () => {
    const summary = computeSummary(
      profile,
      [],
      [],
      [],
      [goalWith([{ id: "c1", amount: 5_000, date: inCycle.toISOString(), accountId: "union" }])],
      [],
      undefined,
      [],
      [],
      inCycle,
    );
    expect(summary.savedThisCycle).toBe(0);
  });

  it("does not count an unlinked goal contribution as cash saved", () => {
    const summary = computeSummary(
      profile,
      [],
      [],
      [],
      [goalWith([{ id: "c1", amount: 5_000, date: inCycle.toISOString() }])],
      [],
      undefined,
      [],
      [],
      inCycle,
    );
    expect(summary.savedThisCycle).toBe(0);
  });

  it("no longer exposes savingsEvidence", () => {
    const summary = computeSummary(profile, [], [], [], [], [], undefined, [], [], inCycle);
    expect("savingsEvidence" in summary).toBe(false);
  });

  it("does not let goal allocations override the rule-bound spending budget", () => {
    const withContribution = computeSummary(
      profile,
      [],
      [],
      [],
      [goalWith([{ id: "c1", amount: 9_000, date: inCycle.toISOString(), accountId: "union" }])],
      [],
      undefined,
      [],
      [],
      inCycle,
    );
    const withoutContribution = computeSummary(
      profile,
      [],
      [],
      [],
      [goalWith([])],
      [],
      undefined,
      [],
      [],
      inCycle,
    );
    expect(withContribution.spendingBudget).toBe(withoutContribution.spendingBudget);
  });
});

describe("goal projection", () => {
  const now = new Date("2026-08-09T00:00:00.000Z");
  const bike: Goal = {
    id: "bike",
    name: "Bike",
    type: "Bike",
    target: 85_000,
    saved: 0,
    monthlyContribution: 8_000,
    contributions: [
      { id: "c1", amount: 10_000, date: "2026-08-01T00:00:00.000Z", accountId: "union" },
    ],
  };

  it("counts the months left at the current rate", () => {
    expect(monthsToGoal(bike)).toBe(10);
  });

  it("returns null with no monthly contribution", () => {
    expect(monthsToGoal({ ...bike, monthlyContribution: 0 })).toBeNull();
  });

  it("returns zero months once the target is reached", () => {
    expect(monthsToGoal({ ...bike, target: 5_000 })).toBe(0);
  });

  it("labels the finish month", () => {
    expect(projectGoal(bike, undefined, now)?.label).toBe("Jun 2027");
  });

  it("reports how much sooner a bigger contribution finishes", () => {
    const result = whatIfDelta(bike, 15_000, now);
    expect(result?.months).toBe(5);
    expect(result?.monthsSooner).toBe(5);
  });

  it("reports zero sooner when the what-if matches the current plan", () => {
    expect(whatIfDelta(bike, 8_000, now)?.monthsSooner).toBe(0);
  });

  it("scales the what-if slider step to the monthly contribution", () => {
    expect(goalContributionStep(300)).toBe(30);
    expect(goalContributionStep(5_000)).toBe(500);
  });
});

describe("allocation split merges repeated goals", () => {
  it("does not silently drop a second entry for the same goal", () => {
    const union: BankAccount = {
      id: "union",
      bankName: "Union Bank",
      accountType: "Savings",
      balance: 10_569,
      status: "active",
    };
    const bike: Goal = {
      id: "bike",
      name: "Bike",
      type: "Bike",
      target: 85_000,
      saved: 0,
      monthlyContribution: 8_000,
      contributions: [],
    };
    const result = applyAllocation(
      [bike],
      [union],
      [
        { goalId: "bike", amount: 100 },
        { goalId: "bike", amount: 200 },
      ],
      "union",
      undefined,
      new Date("2026-08-09T10:00:00.000Z"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(goalSaved(result.goals[0])).toBe(300);
  });

  it("rejects a split that would overfund a goal", () => {
    const account: BankAccount = {
      id: "union",
      bankName: "Union Bank",
      accountType: "Savings",
      balance: 10_000,
      status: "active",
    };
    const goal: Goal = {
      id: "phone",
      name: "Phone",
      type: "Phone",
      target: 5_000,
      saved: 0,
      monthlyContribution: 500,
      contributions: [{ id: "existing", amount: 4_800, date: "2026-08-01", accountId: "union" }],
    };

    const result = applyAllocation(
      [goal],
      [account],
      [{ goalId: "phone", amount: 500 }],
      "union",
      undefined,
      new Date("2026-08-10T10:00:00.000Z"),
    );

    expect(result).toEqual({ ok: false, reason: "Phone only needs 200 more." });
  });
});

describe("transfer goal reservations", () => {
  const icici: BankAccount = {
    id: "icici",
    bankName: "ICICI Bank",
    accountType: "Salary",
    balance: 31_000,
    status: "active",
  };
  const bob: BankAccount = {
    id: "bob",
    bankName: "Bank of Baroda",
    accountType: "Savings",
    balance: 5_000,
    status: "active",
  };
  const bike: Goal = {
    id: "bike",
    name: "Bike fund",
    type: "Bike",
    target: 150_000,
    saved: 0,
    monthlyContribution: 0,
    preferredAccountId: "bob",
    contributions: [],
  };

  it("reserves only the selected transfer amount, not the existing destination balance", () => {
    const result = completeTransferWrite(
      {
        id: "transfer-1",
        sourceAccountId: "icici",
        destinationAccountId: "bob",
        amount: 1_000,
        goalId: "bike",
        goalAmount: 1_000,
      },
      [icici, bob],
      [bike],
      false,
      new Date("2026-09-04T10:00:00.000Z"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.accounts.find((account) => account.id === "bob")?.balance).toBe(6_000);
    expect(goalSaved(result.goals[0], result.accounts)).toBe(1_000);
    expect(accountAllocated(result.goals, "bob", result.accounts)).toBe(1_000);
    expect(accountFree(result.goals, result.accounts[1])).toBe(5_000);
  });

  it("rejects a reservation larger than the transfer", () => {
    const result = completeTransferWrite(
      {
        id: "transfer-1",
        sourceAccountId: "icici",
        destinationAccountId: "bob",
        amount: 1_000,
        goalId: "bike",
        goalAmount: 1_500,
      },
      [icici, bob],
      [bike],
      false,
      new Date(),
    );

    expect(result).toEqual({
      ok: false,
      reason: "The reserved amount cannot exceed the transfer.",
    });
  });

  it("requires the transfer destination to match the goal's linked bank", () => {
    const result = completeTransferWrite(
      {
        id: "transfer-1",
        sourceAccountId: "bob",
        destinationAccountId: "icici",
        amount: 1_000,
        goalId: "bike",
        goalAmount: 1_000,
      },
      [{ ...bob, balance: 6_000 }, icici],
      [bike],
      false,
      new Date(),
    );

    expect(result.ok).toBe(false);
  });

  it("applies an immediate reservation through the finance store", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    useFinanceStore.setState({ accounts: [icici, bob], goals: [bike], accountTransfers: [] });

    const success = useFinanceStore.getState().addAccountTransfer(
      {
        sourceAccountId: "icici",
        destinationAccountId: "bob",
        amount: 1_000,
        date: "2026-09-04T12:00:00.000Z",
        goalId: "bike",
        goalAmount: 1_000,
      },
      "transfer-now",
    );

    expect(success).toBe(true);
    expect(useFinanceStore.getState().accounts.map((account) => account.balance)).toEqual([
      30_000, 6_000,
    ]);
    expect(goalSaved(useFinanceStore.getState().goals[0])).toBe(1_000);
    vi.unstubAllGlobals();
  });

  it("waits to reserve a scheduled transfer until completion", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    useFinanceStore.setState({ accounts: [icici, bob], goals: [bike], accountTransfers: [] });

    expect(
      useFinanceStore.getState().addAccountTransfer(
        {
          sourceAccountId: "icici",
          destinationAccountId: "bob",
          amount: 1_000,
          date: "2026-09-04T12:00:00.000Z",
          goalId: "bike",
          goalAmount: 600,
        },
        "scheduled",
      ),
    ).toBe(true);
    expect(useFinanceStore.getState().accounts.map((account) => account.balance)).toEqual([
      31_000, 5_000,
    ]);
    expect(goalSaved(useFinanceStore.getState().goals[0])).toBe(0);

    const transferId = useFinanceStore.getState().accountTransfers[0].id;
    expect(useFinanceStore.getState().completeAccountTransfer(transferId)).toBe(true);
    expect(useFinanceStore.getState().accounts.map((account) => account.balance)).toEqual([
      30_000, 6_000,
    ]);
    expect(goalSaved(useFinanceStore.getState().goals[0])).toBe(600);
    vi.unstubAllGlobals();
  });
});

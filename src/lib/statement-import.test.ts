import { describe, expect, it } from "vitest";
import {
  ImportFormatError,
  type ImportDoc,
  buildImportPlan,
  parseImportDoc,
} from "./statement-import";
import type { BankAccount, Expense, Income } from "./types";

function doc(over: Partial<ImportDoc> = {}): ImportDoc {
  return {
    version: 1,
    generatedAt: "2026-08-23",
    accounts: [],
    creditCards: [],
    expenses: [],
    incomes: [],
    ...over,
  };
}

const empty = { accounts: [] as BankAccount[], creditCards: [], expenses: [] as Expense[], incomes: [] as Income[] };

const spend = {
  date: "2026-08-22",
  amount: 371,
  account: "bob",
  merchant: "Blinkit",
  category: "Groceries",
  paymentMethod: "UPI",
  source: "BOB statement",
};

describe("parseImportDoc", () => {
  it("rejects a file that is not an import file", () => {
    expect(() => parseImportDoc("nope")).toThrow(ImportFormatError);
  });

  it("rejects a version it does not understand rather than guessing", () => {
    expect(() => parseImportDoc({ version: 2 })).toThrow(/version 2/);
  });

  it("names the missing section", () => {
    expect(() => parseImportDoc({ version: 1, accounts: [] })).toThrow(/creditCards/);
  });
});

describe("buildImportPlan", () => {
  it("creates an account it has never seen", () => {
    const plan = buildImportPlan(
      doc({ accounts: [{ key: "bob", bankName: "Bank of Baroda", accountType: "Savings", balance: 6116.95 }] }),
      empty,
    );

    expect(plan.accountsToCreate).toHaveLength(1);
    expect(plan.accountsToCreate[0].account.balance).toBe(6116.95);
    expect(plan.accountsToUpdate).toEqual([]);
  });

  it("updates the balance of an account that already exists, matched by name", () => {
    const existing: BankAccount = {
      id: "a1",
      bankName: "bank of baroda",
      accountType: "Savings",
      balance: 999,
      status: "active",
    };
    const plan = buildImportPlan(
      doc({ accounts: [{ key: "bob", bankName: "Bank of Baroda", accountType: "Savings", balance: 6116.95 }] }),
      { ...empty, accounts: [existing] },
    );

    expect(plan.accountsToCreate).toEqual([]);
    expect(plan.accountsToUpdate).toEqual([{ id: "a1", bankName: "bank of baroda", balance: 6116.95 }]);
  });

  it("never re-applies a balance, because the file already holds the closing figure", () => {
    const plan = buildImportPlan(doc({ expenses: [spend] }), empty);
    expect(plan.expenses[0].expense.balanceApplied).toBe(false);
  });

  it("skips a row it already holds, so re-importing an overlap is safe", () => {
    const already: Expense = {
      id: "e1",
      amount: 371,
      category: "Groceries",
      merchant: "Blinkit",
      paymentMethod: "UPI",
      date: new Date(2026, 7, 22, 12).toISOString(),
    };
    const plan = buildImportPlan(doc({ expenses: [spend] }), { ...empty, expenses: [already] });

    expect(plan.expenses).toEqual([]);
    expect(plan.duplicateExpenses).toBe(1);
  });

  it("collapses a repeat inside the same file too", () => {
    const plan = buildImportPlan(doc({ expenses: [spend, { ...spend }] }), empty);
    expect(plan.expenses).toHaveLength(1);
    expect(plan.duplicateExpenses).toBe(1);
  });

  it("keeps two different payments on one day apart", () => {
    const plan = buildImportPlan(
      doc({ expenses: [spend, { ...spend, amount: 110, merchant: "Radhe Dhokla" }] }),
      empty,
    );
    expect(plan.expenses).toHaveLength(2);
    expect(plan.duplicateExpenses).toBe(0);
  });

  it("carries a split through as a shared expense", () => {
    const plan = buildImportPlan(
      doc({
        expenses: [
          { ...spend, amount: 1000, merchant: "Umesh", shared: { friendName: "Swarali", groupTotal: 1500 } },
        ],
      }),
      empty,
    );

    expect(plan.expenses[0].expense.shared).toMatchObject({
      friendName: "Swarali",
      totalAmount: 1500,
      userPaid: 1000,
    });
  });

  it("totals what will actually be added, not what was in the file", () => {
    const already: Expense = {
      id: "e1",
      amount: 371,
      category: "Groceries",
      merchant: "Blinkit",
      paymentMethod: "UPI",
      date: new Date(2026, 7, 22, 12).toISOString(),
    };
    const plan = buildImportPlan(
      doc({ expenses: [spend, { ...spend, amount: 90, merchant: "Rangoli Ice Cream" }] }),
      { ...empty, expenses: [already] },
    );

    expect(plan.totals.spend).toBe(90);
  });

  it("does not create a card it already has", () => {
    const card = {
      key: "axis-card",
      name: "Flipkart Axis",
      bankName: "Axis Bank",
      creditLimit: 20000,
      statementDay: 20,
    };
    const plan = buildImportPlan(doc({ creditCards: [card] }), {
      ...empty,
      creditCards: [
        { id: "c1", name: "flipkart axis", bankName: "Axis", creditLimit: 20000, statementDay: 20, status: "active" },
      ],
    });

    expect(plan.cardsToCreate).toEqual([]);
  });
});

describe("duplicate detection ignores how the payee was spelled", () => {
  const already: Expense = {
    id: "e1",
    amount: 855,
    category: "Entertainment",
    merchant: "BookMyShow",
    paymentMethod: "Card",
    date: new Date(2026, 6, 26, 12).toISOString(),
  };

  it("matches the same payment spelled differently by the bank", () => {
    const plan = buildImportPlan(
      doc({ expenses: [{ ...spend, date: "2026-07-26", amount: 855, merchant: "Bookmyshow" }] }),
      { ...empty, expenses: [already] },
    );

    expect(plan.expenses).toEqual([]);
    expect(plan.duplicateExpenses).toBe(1);
  });

  it("matches an amount the user rounded when typing it in", () => {
    const plan = buildImportPlan(
      doc({ expenses: [{ ...spend, date: "2026-07-26", amount: 855.64, merchant: "Bookmyshow" }] }),
      { ...empty, expenses: [already] },
    );

    expect(plan.duplicateExpenses).toBe(1);
  });

  it("does not swallow a second genuine payment behind the first", () => {
    const plan = buildImportPlan(
      doc({
        expenses: [
          { ...spend, date: "2026-07-26", amount: 855.64, merchant: "Bookmyshow" },
          { ...spend, date: "2026-07-26", amount: 855.64, merchant: "Bookmyshow" },
        ],
      }),
      { ...empty, expenses: [already] },
    );

    // One matches what is already held; the other is new.
    expect(plan.duplicateExpenses).toBe(1);
    expect(plan.expenses).toHaveLength(1);
  });

  it("keeps amounts further apart than the rounding tolerance", () => {
    const plan = buildImportPlan(
      doc({ expenses: [{ ...spend, date: "2026-07-26", amount: 900, merchant: "Bookmyshow" }] }),
      { ...empty, expenses: [already] },
    );

    expect(plan.expenses).toHaveLength(1);
    expect(plan.duplicateExpenses).toBe(0);
  });
});

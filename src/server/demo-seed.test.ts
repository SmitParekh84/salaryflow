import { describe, expect, it } from "vitest";
import { DEMO_EMAIL, buildDemoDataset } from "./demo-seed";

/**
 * The demo dataset is written by hand, and its cross-references are plain
 * strings the database will not validate. A typo in one `accountId` silently
 * produces an expense that belongs to no account — which renders as a blank in
 * the UI rather than an error. These tests are what catches that.
 */

// A fixed date keeps month arithmetic (and the "no future expenses" rule)
// deterministic. Mid-month so the current month is partially filled.
const NOW = new Date(2026, 6, 14, 10, 0, 0);

const data = buildDemoDataset(NOW);

const accountIds = new Set(data.accounts.map((account) => account.clientId));
const billIds = new Set(data.bills.map((bill) => bill.clientId));
const goalIds = new Set(data.goals.map((goal) => goal.clientId));
const transferIds = new Set(data.transfers.map((transfer) => transfer.clientId));

describe("demo dataset references", () => {
  it("points every expense at a real account and bill", () => {
    for (const expense of data.expenses) {
      if (expense.accountId) expect(accountIds).toContain(expense.accountId);
      if (expense.billId) expect(billIds).toContain(expense.billId);
    }
  });

  it("gives every bill-linked expense a billing month, and no other expense one", () => {
    for (const expense of data.expenses) {
      expect(Boolean(expense.billingMonth)).toBe(Boolean(expense.billId));
    }
  });

  it("points every bill, income and investment at a real account", () => {
    for (const bill of data.bills) {
      if (bill.accountId) expect(accountIds).toContain(bill.accountId);
    }
    for (const income of data.incomes) {
      if (income.accountId) expect(accountIds).toContain(income.accountId);
    }
    for (const investment of data.investments) {
      if (investment.accountId) expect(accountIds).toContain(investment.accountId);
    }
  });

  it("resolves every goal link, including contribution accounts and transfers", () => {
    for (const goal of data.goals) {
      if (goal.balanceAccountId) expect(accountIds).toContain(goal.balanceAccountId);
      if (goal.preferredAccountId) expect(accountIds).toContain(goal.preferredAccountId);
      for (const contribution of goal.contributions ?? []) {
        if (contribution.accountId) expect(accountIds).toContain(contribution.accountId);
        if (contribution.transferId) expect(transferIds).toContain(contribution.transferId);
      }
    }
  });

  it("resolves both ends of every transfer, plus its goal", () => {
    for (const transfer of data.transfers) {
      expect(accountIds).toContain(transfer.sourceAccountId);
      expect(accountIds).toContain(transfer.destinationAccountId);
      expect(transfer.sourceAccountId).not.toBe(transfer.destinationAccountId);
      if (transfer.goalId) expect(goalIds).toContain(transfer.goalId);
    }
  });

  it("points a closing account's wind-down at a real account", () => {
    for (const account of data.accounts) {
      if (account.plannedTransferTo) expect(accountIds).toContain(account.plannedTransferTo);
    }
  });

  it("uses only categories the profile knows about", () => {
    const custom = new Set((data.profile.customCategories ?? []).map((item) => item.name));
    // "Wellness" is a custom category, so it must be declared or the expense
    // renders with no icon and no colour.
    const usesWellness = data.expenses.some((expense) => expense.category === "Wellness");
    expect(usesWellness).toBe(true);
    expect(custom).toContain("Wellness");
  });
});

describe("demo dataset integrity", () => {
  it("mints a unique clientId within every synced collection", () => {
    const collections = {
      expenses: data.expenses,
      incomes: data.incomes,
      bills: data.bills,
      goals: data.goals,
      investments: data.investments,
      accounts: data.accounts,
      transfers: data.transfers,
      creditCards: data.creditCards,
      budgetRules: data.budgetRules,
      recycleBin: data.recycleBin,
    };
    for (const [name, rows] of Object.entries(collections)) {
      const ids = rows.map((row) => row.clientId);
      expect(ids.every(Boolean), `${name} has a row without a clientId`).toBe(true);
      expect(new Set(ids).size, `${name} has duplicate clientIds`).toBe(ids.length);
    }
  });

  it("keeps every budget rule at exactly 100%, with one active", () => {
    // BudgetRuleSchema validates this too, so a bad total would throw at insert
    // time during a re-seed rather than here.
    for (const rule of data.budgetRules) {
      const total = rule.allocations.reduce((sum, item) => sum + item.percentage, 0);
      expect(total, `${rule.name} does not total 100`).toBe(100);
    }
    expect(data.budgetRules.filter((rule) => rule.active)).toHaveLength(1);
  });

  it("balances every shared split", () => {
    for (const expense of data.expenses) {
      if (!expense.shared) continue;
      expect(expense.shared.userPaid + expense.shared.friendPaid).toBe(
        expense.shared.totalAmount,
      );
      // The expense amount is the user's share, not the whole bill.
      expect(expense.amount).toBe(expense.shared.userPaid);
    }
    for (const invite of data.sharedInvites) {
      expect(invite.ownerPaid + invite.friendPaid).toBe(invite.totalAmount);
    }
  });

  it("dates no expense or income in the future", () => {
    for (const expense of data.expenses) expect(expense.date.getTime()).toBeLessThanOrEqual(NOW.getTime());
    for (const income of data.incomes) expect(income.date.getTime()).toBeLessThanOrEqual(NOW.getTime());
  });

  it("fills the current month so the dashboard has a live cycle", () => {
    const inCurrentMonth = data.expenses.filter(
      (expense) =>
        expense.date.getFullYear() === NOW.getFullYear() &&
        expense.date.getMonth() === NOW.getMonth(),
    );
    expect(inCurrentMonth.length).toBeGreaterThan(0);
  });

  it("confirms past salary but not a payday still to come", () => {
    // NOW is the 14th and payday is the 25th, so this month is unconfirmed.
    const thisMonth = data.salaryHistory.find(
      (entry) =>
        entry.date.getFullYear() === NOW.getFullYear() && entry.date.getMonth() === NOW.getMonth(),
    );
    expect(thisMonth?.confirmed).toBe(false);
    expect(data.salaryHistory.filter((entry) => entry.confirmed).length).toBeGreaterThan(0);
  });

  it("leaves no collection empty", () => {
    for (const [name, value] of Object.entries(data)) {
      if (name === "profile") continue;
      expect((value as unknown[]).length, `${name} is empty`).toBeGreaterThan(0);
    }
  });
});

/**
 * The dataset is rebuilt against whatever "now" is at re-seed time, so the
 * date-sensitive invariants have to hold on any day — not just the one the
 * fixture above happens to pick. The 1st is the interesting case: almost every
 * fixed-day row would be post-dated without clamping.
 */
describe.each([
  ["the 1st of a month", new Date(2026, 6, 1, 9, 0, 0)],
  ["mid-month", new Date(2026, 6, 14, 10, 0, 0)],
  ["after payday", new Date(2026, 6, 28, 18, 0, 0)],
  ["the financial-year boundary", new Date(2026, 3, 1, 9, 0, 0)],
  ["a leap day", new Date(2028, 1, 29, 12, 0, 0)],
])("demo dataset built on %s", (_label, now) => {
  const built = buildDemoDataset(now);

  it("dates no money in the future", () => {
    for (const expense of built.expenses) {
      expect(expense.date.getTime()).toBeLessThanOrEqual(now.getTime());
    }
    for (const income of built.incomes) {
      expect(income.date.getTime()).toBeLessThanOrEqual(now.getTime());
    }
  });

  it("still leaves no collection empty", () => {
    for (const [name, value] of Object.entries(built)) {
      if (name === "profile") continue;
      expect((value as unknown[]).length, `${name} is empty`).toBeGreaterThan(0);
    }
  });

  it("still resolves every account reference", () => {
    const ids = new Set(built.accounts.map((account) => account.clientId));
    for (const expense of built.expenses) {
      if (expense.accountId) expect(ids).toContain(expense.accountId);
    }
    for (const transfer of built.transfers) {
      expect(ids).toContain(transfer.sourceAccountId);
      expect(ids).toContain(transfer.destinationAccountId);
    }
  });

  it("still mints unique expense clientIds", () => {
    const ids = built.expenses.map((expense) => expense.clientId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("demo dataset isolation", () => {
  it("scopes every row to the demo account and no other", () => {
    const scoped = [
      data.expenses,
      data.incomes,
      data.bills,
      data.goals,
      data.investments,
      data.accounts,
      data.transfers,
      data.creditCards,
      data.budgetRules,
      data.recycleBin,
      data.notifications,
      data.salaryHistory,
    ].flat();
    for (const row of scoped) expect(row.userId).toBe(DEMO_EMAIL);
    expect(data.profile.userId).toBe(DEMO_EMAIL);
    for (const invite of data.sharedInvites) expect(invite.ownerId).toBe(DEMO_EMAIL);
  });

  it("contains no real account's address", () => {
    // The dataset is fabricated. Friend addresses are example.com placeholders,
    // and no live user's address may appear anywhere in it.
    const serialised = JSON.stringify(data);
    expect(serialised).not.toMatch(/smitparekh/i);
    const emails = serialised.match(/[\w.+-]+@[\w.-]+\.\w+/g) ?? [];
    for (const email of emails) {
      expect(email === DEMO_EMAIL || email.endsWith("@example.com")).toBe(true);
    }
  });
});

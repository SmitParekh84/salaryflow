"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { accountDeletionBlocker, goalRestoreBlocker } from "./account-references";
import {
  applyAllocation,
  reassignGoalAccounts,
  shouldReassignClosingAllocations,
} from "./allocation-writes";
import { normalizeBudgetRule } from "./budget-rules";
import { migrateGoalOpeningBalances } from "./goal-migration";
import {
  seedBills,
  seedExpenses,
  seedGoals,
  seedIncomes,
  seedInvestments,
  seedProfile,
} from "./seed";
import type {
  AccountTransfer,
  AccountTransferMode,
  AppNotification,
  BankAccount,
  Bill,
  BudgetRule,
  CreditCard,
  Expense,
  Goal,
  Income,
  Investment,
  RecycleBinItem,
  RecycleEntityType,
  SalaryHistoryEntry,
  SalaryProfile,
  UserProfile,
} from "./types";
import { uid } from "./utils";

interface FinanceState {
  user: UserProfile;
  profile: SalaryProfile;
  expenses: Expense[];
  incomes: Income[];
  bills: Bill[];
  goals: Goal[];
  investments: Investment[];
  accounts: BankAccount[];
  accountTransfers: AccountTransfer[];
  creditCards: CreditCard[];
  budgetRules: BudgetRule[];
  recycleBin: RecycleBinItem[];
  salaryHistory: SalaryHistoryEntry[];
  notifications: AppNotification[];

  // onboarding + profile
  completeOnboarding: (user: Partial<UserProfile>, profile: SalaryProfile) => void;
  updateProfile: (patch: Partial<SalaryProfile>) => void;
  updateUser: (patch: Partial<UserProfile>) => void;

  // expenses
  addExpense: (e: Omit<Expense, "id">) => boolean;
  updateExpense: (id: string, patch: Partial<Expense>) => boolean;
  deleteExpense: (id: string) => void;
  toggleFavorite: (id: string) => void;

  // incomes
  addIncome: (i: Omit<Income, "id">) => void;
  deleteIncome: (id: string) => void;

  // bills
  addBill: (b: Omit<Bill, "id">) => void;
  updateBill: (id: string, patch: Partial<Bill>) => void;
  deleteBill: (id: string) => void;
  toggleBillPaid: (id: string) => void;

  // goals
  addGoal: (g: Omit<Goal, "id">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  contributeGoal: (id: string, amount: number, accountId?: string) => boolean;
  allocate: (
    entries: { goalId: string; amount: number }[],
    accountId: string,
    transferId?: string,
  ) => { ok: boolean; reason?: string };
  reassignAllocations: (fromAccountId: string, toAccountId: string) => void;
  deleteGoal: (id: string) => void;

  // investments
  addInvestment: (i: Omit<Investment, "id">) => void;
  updateInvestment: (id: string, patch: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;

  // accounts
  addAccount: (account: Omit<BankAccount, "id">) => void;
  updateAccount: (id: string, patch: Partial<BankAccount>) => void;
  deleteAccount: (id: string) => { ok: boolean; reason?: string };
  addAccountTransfer: (
    transfer: Omit<AccountTransfer, "id" | "status" | "completedAt">,
    mode?: AccountTransferMode,
  ) => boolean;
  completeAccountTransfer: (id: string) => boolean;

  // credit cards
  addCreditCard: (card: Omit<CreditCard, "id">) => void;
  updateCreditCard: (id: string, patch: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;

  // budget rules
  addBudgetRule: (rule: Omit<BudgetRule, "id">) => void;
  activateBudgetRule: (id: string) => void;
  deleteBudgetRule: (id: string) => void;

  // recycle bin
  restoreRecycleItem: (id: string) => Promise<{ ok: boolean; reason?: string }>;
  permanentlyDeleteRecycleItem: (id: string) => Promise<void>;

  // salary history
  loadSalaryHistory: () => Promise<void> | void;
  addSalaryEntry: (entry: Partial<SalaryHistoryEntry>) => Promise<void> | void;
  updateSalaryEntry: (id: string, patch: Partial<SalaryHistoryEntry>) => Promise<void> | void;
  deleteSalaryEntry: (id: string) => Promise<void> | void;

  // notifications
  loadNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;

  syncWithServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
  loadSeed: () => void;
  resetAll: () => void;
}

const emptyUser: UserProfile = { name: "", email: "", onboarded: false };

const emptyProfile: SalaryProfile = {
  amount: 0,
  salaryDay: 1,
  cycle: "monthly",
  currency: "INR",
  country: "India",
  savingsGoal: 0,
  emergencyFundGoal: 0,
  investmentAmount: 0,
};

function seedNotifications(): AppNotification[] {
  return [
    {
      id: uid("ntf"),
      title: "Salary countdown",
      body: "Your next salary is on its way. Keep pacing your spends!",
      type: "salary",
      date: new Date().toISOString(),
      read: false,
    },
    {
      id: uid("ntf"),
      title: "Bill due soon",
      body: "Electricity bill of ₹1,800 is due on the 12th.",
      type: "bill",
      date: new Date().toISOString(),
      read: false,
    },
  ];
}

function normalizeServerItems<T extends { id: string }>(items: unknown, fallback: T[]): T[] {
  if (!Array.isArray(items)) return fallback;

  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const rawId = record.id ?? record._id;
    if (rawId === undefined || rawId === null) return [];

    const data = { ...record };
    delete data._id;
    return [{ ...data, id: String(rawId) } as unknown as T];
  });
}

function normalizeBudgetRules(items: unknown, fallback: BudgetRule[]): BudgetRule[] {
  return normalizeServerItems<BudgetRule>(items, fallback).map(normalizeBudgetRule);
}

function recycleItem(
  entityType: RecycleEntityType,
  entityId: string,
  label: string,
  data: object,
): RecycleBinItem {
  return {
    id: uid("trash"),
    entityType,
    entityId,
    label,
    deletedAt: new Date().toISOString(),
    data: { ...data } as Record<string, unknown>,
  };
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      user: emptyUser,
      profile: emptyProfile,
      expenses: [],
      incomes: [],
      bills: [],
      goals: [],
      investments: [],
      accounts: [],
      accountTransfers: [],
      creditCards: [],
      budgetRules: [],
      recycleBin: [],
      salaryHistory: [],
      notifications: [],

      // onboarding + profile
      completeOnboarding: (user, profile) =>
        set((s) => ({
          user: { ...s.user, ...user, onboarded: true },
          profile,
          notifications: s.notifications.length === 0 ? seedNotifications() : s.notifications,
        })),

      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      updateUser: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),

      addExpense: (expense) => {
        const account = expense.accountId
          ? get().accounts.find((candidate) => candidate.id === expense.accountId)
          : undefined;
        const balanceApplied = Boolean(account && expense.shared);
        if (balanceApplied && account!.balance < expense.amount) return false;
        set((state) => ({
          expenses: [{ ...expense, balanceApplied, id: uid("exp") }, ...state.expenses],
          accounts: balanceApplied
            ? state.accounts.map((candidate) =>
                candidate.id === expense.accountId
                  ? { ...candidate, balance: candidate.balance - expense.amount }
                  : candidate,
              )
            : state.accounts,
        }));
        return true;
      },
      updateExpense: (id, patch) => {
        const existing = get().expenses.find((expense) => expense.id === id);
        if (!existing) return false;
        const updated = { ...existing, ...patch };
        const nextAccount = updated.accountId
          ? get().accounts.find((candidate) => candidate.id === updated.accountId)
          : undefined;
        const restoredBalance = nextAccount
          ? nextAccount.balance +
            (existing.balanceApplied && existing.accountId === updated.accountId
              ? existing.amount
              : 0)
          : 0;
        const shouldApplyBalance = Boolean(nextAccount && updated.shared);
        if (shouldApplyBalance && restoredBalance < updated.amount) return false;

        set((state) => ({
          expenses: state.expenses.map((expense) =>
            expense.id === id ? { ...updated, balanceApplied: shouldApplyBalance } : expense,
          ),
          accounts: state.accounts.map((account) => {
            let balance = account.balance;
            if (existing.balanceApplied && account.id === existing.accountId) {
              balance += existing.amount;
            }
            if (shouldApplyBalance && account.id === updated.accountId) balance -= updated.amount;
            return balance === account.balance ? account : { ...account, balance };
          }),
        }));
        return true;
      },
      deleteExpense: (id) => {
        const item = get().expenses.find((expense) => expense.id === id);
        if (!item) return;
        set((state) => ({
          expenses: state.expenses.filter((expense) => expense.id !== id),
          accounts:
            item.balanceApplied && item.accountId
              ? state.accounts.map((account) =>
                  account.id === item.accountId
                    ? { ...account, balance: account.balance + item.amount }
                    : account,
                )
              : state.accounts,
          recycleBin: [
            recycleItem("expense", id, item.merchant || item.category, item),
            ...state.recycleBin,
          ],
        }));
        void get().syncWithServer();
      },
      toggleFavorite: (id) =>
        set((s) => ({
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, favorite: !e.favorite } : e)),
        })),

      addIncome: (i) => set((s) => ({ incomes: [{ ...i, id: uid("inc") }, ...s.incomes] })),
      deleteIncome: (id) => {
        const item = get().incomes.find((income) => income.id === id);
        if (!item) return;
        set((state) => ({
          incomes: state.incomes.filter((income) => income.id !== id),
          recycleBin: [recycleItem("income", id, item.source, item), ...state.recycleBin],
        }));
        void get().syncWithServer();
      },

      addBill: (b) => set((s) => ({ bills: [...s.bills, { ...b, id: uid("bill") }] })),
      updateBill: (id, patch) =>
        set((s) => ({
          bills: s.bills.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      deleteBill: (id) => {
        const item = get().bills.find((bill) => bill.id === id);
        if (!item) return;
        set((state) => ({
          bills: state.bills.filter((bill) => bill.id !== id),
          recycleBin: [recycleItem("bill", id, item.name, item), ...state.recycleBin],
        }));
        void get().syncWithServer();
      },
      toggleBillPaid: (id) =>
        set((s) => ({
          bills: s.bills.map((b) => (b.id === id ? { ...b, paid: !b.paid } : b)),
        })),

      addGoal: (g) => set((s) => ({ goals: [...s.goals, { ...g, id: uid("goal") }] })),
      updateGoal: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      contributeGoal: (id, amount, accountId) => {
        if (!accountId) {
          set((s) => ({
            goals: s.goals.map((g) =>
              g.id === id
                ? {
                    ...g,
                    contributions: [
                      ...(g.contributions ?? []),
                      { id: uid("goal-contribution"), amount, date: new Date().toISOString() },
                    ],
                  }
                : g,
            ),
          }));
          return true;
        }
        return get().allocate([{ goalId: id, amount }], accountId).ok;
      },

      allocate: (entries, accountId, transferId) => {
        const state = get();
        const result = applyAllocation(
          state.goals,
          state.accounts,
          entries,
          accountId,
          transferId,
          new Date(),
        );
        if (!result.ok) return { ok: false, reason: result.reason };
        set({ goals: result.goals });
        return { ok: true };
      },

      reassignAllocations: (fromAccountId, toAccountId) =>
        set((s) => ({ goals: reassignGoalAccounts(s.goals, fromAccountId, toAccountId) })),

      deleteGoal: (id) => {
        const item = get().goals.find((goal) => goal.id === id);
        if (!item) return;
        set((state) => ({
          goals: state.goals.filter((goal) => goal.id !== id),
          recycleBin: [recycleItem("goal", id, item.name, item), ...state.recycleBin],
        }));
        void get().syncWithServer();
      },

      addInvestment: (i) =>
        set((s) => ({ investments: [...s.investments, { ...i, id: uid("inv") }] })),
      updateInvestment: (id, patch) =>
        set((s) => ({
          investments: s.investments.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
      deleteInvestment: (id) => {
        const item = get().investments.find((investment) => investment.id === id);
        if (!item) return;
        set((state) => ({
          investments: state.investments.filter((investment) => investment.id !== id),
          recycleBin: [recycleItem("investment", id, item.name, item), ...state.recycleBin],
        }));
        void get().syncWithServer();
      },

      addAccount: (account) =>
        set((s) => ({ accounts: [...s.accounts, { ...account, id: uid("acct") }] })),
      updateAccount: (id, patch) =>
        set((s) => ({
          accounts: s.accounts.map((account) =>
            account.id === id ? { ...account, ...patch } : account,
          ),
        })),
      deleteAccount: (id) => {
        const item = get().accounts.find((account) => account.id === id);
        if (!item) return { ok: false, reason: "That account no longer exists." };
        const state = get();
        const reason = accountDeletionBlocker(id, {
          expenses: state.expenses,
          incomes: state.incomes,
          bills: state.bills,
          goals: state.goals,
          investments: state.investments,
          transfers: state.accountTransfers,
          recycleBin: state.recycleBin,
        });
        if (reason) return { ok: false, reason };
        set((state) => ({
          accounts: state.accounts.filter((account) => account.id !== id),
          recycleBin: [recycleItem("account", id, item.bankName, item), ...state.recycleBin],
        }));
        void get().syncWithServer();
        return { ok: true };
      },
      addAccountTransfer: (transfer, mode = "scheduled") => {
        if (transfer.sourceAccountId === transfer.destinationAccountId || transfer.amount <= 0) {
          return false;
        }
        const source = get().accounts.find((account) => account.id === transfer.sourceAccountId);
        const destination = get().accounts.find(
          (account) => account.id === transfer.destinationAccountId,
        );
        const adjustsBalances = mode === "transfer-now";
        if (!source || !destination || (adjustsBalances && source.balance < transfer.amount)) {
          return false;
        }
        const record: AccountTransfer = {
          ...transfer,
          id: uid("transfer"),
          status: mode === "scheduled" ? "scheduled" : "completed",
          completedAt: mode === "scheduled" ? undefined : new Date().toISOString(),
          balancesApplied: adjustsBalances,
        };
        set((state) => ({
          accountTransfers: [record, ...state.accountTransfers],
          accounts: adjustsBalances
            ? state.accounts.map((account) =>
                account.id === transfer.sourceAccountId
                  ? { ...account, balance: account.balance - transfer.amount }
                  : account.id === transfer.destinationAccountId
                    ? { ...account, balance: account.balance + transfer.amount }
                    : account,
              )
            : state.accounts,
        }));
        if (adjustsBalances && shouldReassignClosingAllocations(source, transfer.amount)) {
          get().reassignAllocations(transfer.sourceAccountId, transfer.destinationAccountId);
        }
        void get().syncWithServer();
        return true;
      },
      completeAccountTransfer: (id) => {
        const transfer = get().accountTransfers.find((item) => item.id === id);
        if (!transfer || transfer.status === "completed") return false;
        const source = get().accounts.find((account) => account.id === transfer.sourceAccountId);
        const destination = get().accounts.find(
          (account) => account.id === transfer.destinationAccountId,
        );
        if (!source || !destination || source.balance < transfer.amount) return false;
        set((state) => ({
          accountTransfers: state.accountTransfers.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: "completed",
                  completedAt: new Date().toISOString(),
                  balancesApplied: true,
                }
              : item,
          ),
          accounts: state.accounts.map((account) =>
            account.id === transfer.sourceAccountId
              ? { ...account, balance: account.balance - transfer.amount }
              : account.id === transfer.destinationAccountId
                ? { ...account, balance: account.balance + transfer.amount }
                : account,
          ),
        }));
        // Goal money follows the real money: when a closing account is emptied,
        // its allocations repoint to the destination instead of pointing at a
        // dead account. The balances above already moved by the same amount.
        if (shouldReassignClosingAllocations(source, transfer.amount)) {
          get().reassignAllocations(transfer.sourceAccountId, transfer.destinationAccountId);
        }
        void get().syncWithServer();
        return true;
      },

      addCreditCard: (card) =>
        set((s) => ({ creditCards: [...s.creditCards, { ...card, id: uid("card") }] })),
      updateCreditCard: (id, patch) =>
        set((s) => ({
          creditCards: s.creditCards.map((card) => (card.id === id ? { ...card, ...patch } : card)),
        })),
      deleteCreditCard: (id) => {
        const item = get().creditCards.find((card) => card.id === id);
        if (!item) return;
        set((state) => ({
          creditCards: state.creditCards.filter((card) => card.id !== id),
          recycleBin: [recycleItem("credit-card", id, item.name, item), ...state.recycleBin],
        }));
        void get().syncWithServer();
      },

      addBudgetRule: (rule) =>
        set((s) => ({
          budgetRules: [
            ...s.budgetRules.map((item) => ({
              ...item,
              active: rule.active ? false : item.active,
            })),
            { ...rule, id: uid("rule") },
          ],
        })),
      activateBudgetRule: (id) =>
        set((s) => ({
          budgetRules: s.budgetRules.map((rule) => ({ ...rule, active: rule.id === id })),
        })),
      deleteBudgetRule: (id) => {
        const item = get().budgetRules.find((rule) => rule.id === id);
        if (!item) return;
        set((state) => ({
          budgetRules: state.budgetRules.filter((rule) => rule.id !== id),
          recycleBin: [recycleItem("budget-rule", id, item.name, item), ...state.recycleBin],
        }));
        void get().syncWithServer();
      },

      restoreRecycleItem: async (id) => {
        const item = get().recycleBin.find((candidate) => candidate.id === id);
        if (!item) return { ok: false, reason: "That recycled item no longer exists." };

        if (item.entityType === "expense") {
          const expense = item.data as unknown as Expense;
          if (expense.balanceApplied && expense.accountId) {
            const account = get().accounts.find((candidate) => candidate.id === expense.accountId);
            if (!account) {
              return { ok: false, reason: "The linked payment account no longer exists." };
            }
            if (account.balance < expense.amount) {
              return { ok: false, reason: `Only ${account.balance} remains in ${account.bankName}.` };
            }
          }
        }

        if (item.entityType === "goal") {
          const reason = goalRestoreBlocker(
            item.data as unknown as Goal,
            get().accounts,
            get().goals,
          );
          if (reason) return { ok: false, reason };
        }

        if (item.entityType === "salary-history") {
          const response = await fetch("/api/salary/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(item.data),
          });
          if (!response.ok) return { ok: false, reason: "Could not restore the salary entry." };
          set((state) => ({ recycleBin: state.recycleBin.filter((entry) => entry.id !== id) }));
          await get().loadSalaryHistory();
          await get().syncWithServer();
          return { ok: true };
        }

        set((state) => {
          const recycleBin = state.recycleBin.filter((entry) => entry.id !== id);
          switch (item.entityType) {
            case "expense": {
              const expense = item.data as unknown as Expense;
              const canReapplyBalance =
                expense.balanceApplied &&
                expense.accountId &&
                state.accounts.some(
                  (account) =>
                    account.id === expense.accountId && account.balance >= expense.amount,
                );
              return {
                expenses: [
                  { ...expense, balanceApplied: Boolean(canReapplyBalance) },
                  ...state.expenses,
                ],
                accounts: canReapplyBalance
                  ? state.accounts.map((account) =>
                      account.id === expense.accountId
                        ? { ...account, balance: account.balance - expense.amount }
                        : account,
                    )
                  : state.accounts,
                recycleBin,
              };
            }
            case "income":
              return { incomes: [item.data as unknown as Income, ...state.incomes], recycleBin };
            case "bill":
              return { bills: [item.data as unknown as Bill, ...state.bills], recycleBin };
            case "goal":
              return { goals: [item.data as unknown as Goal, ...state.goals], recycleBin };
            case "investment":
              return {
                investments: [item.data as unknown as Investment, ...state.investments],
                recycleBin,
              };
            case "account":
              return {
                accounts: [item.data as unknown as BankAccount, ...state.accounts],
                recycleBin,
              };
            case "credit-card":
              return {
                creditCards: [item.data as unknown as CreditCard, ...state.creditCards],
                recycleBin,
              };
            case "budget-rule":
              return {
                budgetRules: [
                  normalizeBudgetRule(item.data as unknown as BudgetRule),
                  ...state.budgetRules,
                ],
                recycleBin,
              };
            default:
              return { recycleBin };
          }
        });
        await get().syncWithServer();
        return { ok: true };
      },

      permanentlyDeleteRecycleItem: async (id) => {
        set((state) => ({ recycleBin: state.recycleBin.filter((item) => item.id !== id) }));
        await get().syncWithServer();
      },

      // salary history
      loadSalaryHistory: async () => {
        try {
          const res = await fetch("/api/salary/history", { credentials: "include" });
          if (!res.ok) return;
          const j = await res.json();
          set({ salaryHistory: j.data || [] });
        } catch {
          // ignore
        }
      },
      addSalaryEntry: async (entry) => {
        try {
          const res = await fetch("/api/salary/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(entry),
          });
          if (!res.ok) return;
          const j = await res.json();
          set((s) => ({
            salaryHistory: [j.data, ...s.salaryHistory.filter((entry) => entry._id !== j.data._id)],
          }));
        } catch {}
      },
      updateSalaryEntry: async (id, patch) => {
        try {
          const res = await fetch(`/api/salary/history?id=${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(patch),
          });
          if (!res.ok) return;
          const j = await res.json();
          set((s) => ({ salaryHistory: s.salaryHistory.map((h) => (h._id === id ? j.data : h)) }));
        } catch {}
      },
      deleteSalaryEntry: async (id) => {
        const item = get().salaryHistory.find((entry) => entry._id === id);
        if (!item) return;
        set((state) => ({
          salaryHistory: state.salaryHistory.filter((entry) => entry._id !== id),
          recycleBin: [
            recycleItem(
              "salary-history",
              id,
              item.source || `Salary from ${new Date(item.date).toLocaleDateString()}`,
              item,
            ),
            ...state.recycleBin,
          ],
        }));
        try {
          const res = await fetch(`/api/salary/history?id=${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!res.ok) return;
          await get().syncWithServer();
        } catch {}
      },

      loadNotifications: async () => {
        try {
          const response = await fetch("/api/notifications", {
            credentials: "include",
            cache: "no-store",
          });
          if (!response.ok) return;

          const json = await response.json();
          set({ notifications: normalizeServerItems<AppNotification>(json?.data, []) });
        } catch {
          // Keep locally persisted notifications while offline.
        }
      },
      markNotificationRead: (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
        void fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id }),
        }).catch(() => null);
      },
      markAllRead: () => {
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        }));
        void fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ all: true }),
        }).catch(() => null);
      },

      // sync store to server (requires authenticated session cookie)
      syncWithServer: async () => {
        const state = get();
        try {
          const res = await fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: state.user.email || undefined,
              onboardingCompleted: state.user.onboarded,
              profile: state.profile,
              expenses: state.expenses,
              incomes: state.incomes,
              bills: state.bills,
              goals: state.goals,
              investments: state.investments,
              accounts: state.accounts,
              accountTransfers: state.accountTransfers,
              creditCards: state.creditCards,
              budgetRules: state.budgetRules,
              recycleBin: state.recycleBin,
            }),
            credentials: "include",
          });
          if (!res.ok) return;
          const json = await res.json();
          if (json?.data) {
            const d = json.data;
            set({
              profile: d.profile || state.profile,
              expenses: normalizeServerItems<Expense>(d.expenses, state.expenses),
              incomes: normalizeServerItems<Income>(d.incomes, state.incomes),
              bills: normalizeServerItems<Bill>(d.bills, state.bills),
              goals: migrateGoalOpeningBalances(normalizeServerItems<Goal>(d.goals, state.goals)),
              investments: normalizeServerItems<Investment>(d.investments, state.investments),
              accounts: normalizeServerItems<BankAccount>(d.accounts, state.accounts),
              accountTransfers: normalizeServerItems<AccountTransfer>(
                d.accountTransfers,
                state.accountTransfers,
              ),
              creditCards: normalizeServerItems<CreditCard>(d.creditCards, state.creditCards),
              budgetRules: normalizeBudgetRules(d.budgetRules, state.budgetRules),
              recycleBin: normalizeServerItems<RecycleBinItem>(d.recycleBin, state.recycleBin),
            });
          }
        } catch {
          // silent fail — keep local state
          // console.warn('sync failed', e)
        }
      },

      loadFromServer: async () => {
        try {
          const res = await fetch("/api/sync", { credentials: "include" });
          if (!res.ok) return;
          const json = await res.json();
          if (!json?.data) return;

          const state = get();
          const data = json.data;
          set({
            profile: data.profile || state.profile,
            expenses: normalizeServerItems<Expense>(data.expenses, []),
            incomes: normalizeServerItems<Income>(data.incomes, []),
            bills: normalizeServerItems<Bill>(data.bills, []),
            goals: migrateGoalOpeningBalances(normalizeServerItems<Goal>(data.goals, [])),
            investments: normalizeServerItems<Investment>(data.investments, []),
            accounts: normalizeServerItems<BankAccount>(data.accounts, []),
            accountTransfers: normalizeServerItems<AccountTransfer>(data.accountTransfers, []),
            creditCards: normalizeServerItems<CreditCard>(data.creditCards, []),
            budgetRules: normalizeBudgetRules(data.budgetRules, []),
            recycleBin: normalizeServerItems<RecycleBinItem>(data.recycleBin, []),
          });
        } catch {
          // Keep the last locally persisted state while offline.
        }
      },

      loadSeed: () =>
        set({
          user: { name: "Alex Morgan", email: "alex@salaryflow.app", onboarded: true },
          profile: seedProfile,
          expenses: seedExpenses(),
          incomes: seedIncomes(),
          bills: seedBills(),
          goals: migrateGoalOpeningBalances(seedGoals()),
          investments: seedInvestments(),
          accounts: [],
          accountTransfers: [],
          creditCards: [],
          budgetRules: [],
          recycleBin: [],
          salaryHistory: [],
          notifications: seedNotifications(),
        }),

      resetAll: () =>
        set({
          user: emptyUser,
          profile: emptyProfile,
          expenses: [],
          incomes: [],
          bills: [],
          goals: [],
          investments: [],
          accounts: [],
          accountTransfers: [],
          creditCards: [],
          budgetRules: [],
          recycleBin: [],
          salaryHistory: [],
          notifications: [],
        }),
    }),
    {
      name: "salaryflow-store",
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<FinanceState>;

        return {
          ...state,
          expenses: normalizeServerItems<Expense>(state.expenses, []),
          incomes: normalizeServerItems<Income>(state.incomes, []),
          bills: normalizeServerItems<Bill>(state.bills, []),
          goals: migrateGoalOpeningBalances(normalizeServerItems<Goal>(state.goals, [])),
          investments: normalizeServerItems<Investment>(state.investments, []),
          accounts: normalizeServerItems<BankAccount>(state.accounts, []),
          accountTransfers: normalizeServerItems<AccountTransfer>(state.accountTransfers, []),
          creditCards: normalizeServerItems<CreditCard>(state.creditCards, []),
          budgetRules: normalizeBudgetRules(state.budgetRules, []),
          recycleBin: normalizeServerItems<RecycleBinItem>(state.recycleBin, []),
        };
      },
    },
  ),
);

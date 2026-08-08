"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  seedBills,
  seedExpenses,
  seedGoals,
  seedIncomes,
  seedInvestments,
  seedProfile,
} from "./seed";
import type {
  AppNotification,
  BankAccount,
  Bill,
  BudgetRule,
  CreditCard,
  Expense,
  Goal,
  Income,
  Investment,
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
  creditCards: CreditCard[];
  budgetRules: BudgetRule[];
  salaryHistory: SalaryHistoryEntry[];
  notifications: AppNotification[];

  // onboarding + profile
  completeOnboarding: (user: Partial<UserProfile>, profile: SalaryProfile) => void;
  updateProfile: (patch: Partial<SalaryProfile>) => void;
  updateUser: (patch: Partial<UserProfile>) => void;

  // expenses
  addExpense: (e: Omit<Expense, "id">) => void;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
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
  contributeGoal: (id: string, amount: number) => void;
  deleteGoal: (id: string) => void;

  // investments
  addInvestment: (i: Omit<Investment, "id">) => void;
  updateInvestment: (id: string, patch: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;

  // accounts
  addAccount: (account: Omit<BankAccount, "id">) => void;
  updateAccount: (id: string, patch: Partial<BankAccount>) => void;
  deleteAccount: (id: string) => void;

  // credit cards
  addCreditCard: (card: Omit<CreditCard, "id">) => void;
  updateCreditCard: (id: string, patch: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;

  // budget rules
  addBudgetRule: (rule: Omit<BudgetRule, "id">) => void;
  activateBudgetRule: (id: string) => void;
  deleteBudgetRule: (id: string) => void;

  // salary history
  loadSalaryHistory: () => Promise<void> | void;
  addSalaryEntry: (entry: Partial<SalaryHistoryEntry>) => Promise<void> | void;
  updateSalaryEntry: (id: string, patch: Partial<SalaryHistoryEntry>) => Promise<void> | void;
  deleteSalaryEntry: (id: string) => Promise<void> | void;

  // notifications
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
      creditCards: [],
      budgetRules: [],
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

      addExpense: (e) => set((s) => ({ expenses: [{ ...e, id: uid("exp") }, ...s.expenses] })),
      updateExpense: (id, patch) =>
        set((s) => ({
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
      toggleFavorite: (id) =>
        set((s) => ({
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, favorite: !e.favorite } : e)),
        })),

      addIncome: (i) => set((s) => ({ incomes: [{ ...i, id: uid("inc") }, ...s.incomes] })),
      deleteIncome: (id) => set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) })),

      addBill: (b) => set((s) => ({ bills: [...s.bills, { ...b, id: uid("bill") }] })),
      updateBill: (id, patch) =>
        set((s) => ({
          bills: s.bills.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      deleteBill: (id) => set((s) => ({ bills: s.bills.filter((b) => b.id !== id) })),
      toggleBillPaid: (id) =>
        set((s) => ({
          bills: s.bills.map((b) => (b.id === id ? { ...b, paid: !b.paid } : b)),
        })),

      addGoal: (g) => set((s) => ({ goals: [...s.goals, { ...g, id: uid("goal") }] })),
      updateGoal: (id, patch) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      contributeGoal: (id, amount) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, saved: g.saved + amount } : g)),
        })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      addInvestment: (i) =>
        set((s) => ({ investments: [...s.investments, { ...i, id: uid("inv") }] })),
      updateInvestment: (id, patch) =>
        set((s) => ({
          investments: s.investments.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
      deleteInvestment: (id) =>
        set((s) => ({ investments: s.investments.filter((i) => i.id !== id) })),

      addAccount: (account) =>
        set((s) => ({ accounts: [...s.accounts, { ...account, id: uid("acct") }] })),
      updateAccount: (id, patch) =>
        set((s) => ({
          accounts: s.accounts.map((account) =>
            account.id === id ? { ...account, ...patch } : account,
          ),
        })),
      deleteAccount: (id) =>
        set((s) => ({ accounts: s.accounts.filter((account) => account.id !== id) })),

      addCreditCard: (card) =>
        set((s) => ({ creditCards: [...s.creditCards, { ...card, id: uid("card") }] })),
      updateCreditCard: (id, patch) =>
        set((s) => ({
          creditCards: s.creditCards.map((card) => (card.id === id ? { ...card, ...patch } : card)),
        })),
      deleteCreditCard: (id) =>
        set((s) => ({ creditCards: s.creditCards.filter((card) => card.id !== id) })),

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
      deleteBudgetRule: (id) =>
        set((s) => ({ budgetRules: s.budgetRules.filter((rule) => rule.id !== id) })),

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
          set((s) => ({ salaryHistory: [j.data, ...s.salaryHistory] }));
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
        try {
          const res = await fetch(`/api/salary/history?id=${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!res.ok) return;
          set((s) => ({ salaryHistory: s.salaryHistory.filter((h) => h._id !== id) }));
        } catch {}
      },

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      // sync store to server (requires authenticated session cookie)
      syncWithServer: async () => {
        const state = get();
        try {
          const res = await fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: state.user.email || undefined,
              profile: state.profile,
              expenses: state.expenses,
              incomes: state.incomes,
              bills: state.bills,
              goals: state.goals,
              investments: state.investments,
              accounts: state.accounts,
              creditCards: state.creditCards,
              budgetRules: state.budgetRules,
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
              goals: normalizeServerItems<Goal>(d.goals, state.goals),
              investments: normalizeServerItems<Investment>(d.investments, state.investments),
              accounts: normalizeServerItems<BankAccount>(d.accounts, state.accounts),
              creditCards: normalizeServerItems<CreditCard>(d.creditCards, state.creditCards),
              budgetRules: normalizeServerItems<BudgetRule>(d.budgetRules, state.budgetRules),
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
            goals: normalizeServerItems<Goal>(data.goals, []),
            investments: normalizeServerItems<Investment>(data.investments, []),
            accounts: normalizeServerItems<BankAccount>(data.accounts, []),
            creditCards: normalizeServerItems<CreditCard>(data.creditCards, []),
            budgetRules: normalizeServerItems<BudgetRule>(data.budgetRules, []),
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
          goals: seedGoals(),
          investments: seedInvestments(),
          accounts: [],
          creditCards: [],
          budgetRules: [],
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
          creditCards: [],
          budgetRules: [],
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
          goals: normalizeServerItems<Goal>(state.goals, []),
          investments: normalizeServerItems<Investment>(state.investments, []),
          accounts: normalizeServerItems<BankAccount>(state.accounts, []),
          creditCards: normalizeServerItems<CreditCard>(state.creditCards, []),
          budgetRules: normalizeServerItems<BudgetRule>(state.budgetRules, []),
        };
      },
    },
  ),
);

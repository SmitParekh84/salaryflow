"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppNotification,
  Bill,
  Expense,
  Goal,
  Income,
  Investment,
  SalaryProfile,
  UserProfile,
} from "./types";
import { uid } from "./utils";
import {
  seedBills,
  seedExpenses,
  seedGoals,
  seedIncomes,
  seedInvestments,
  seedProfile,
} from "./seed";

interface FinanceState {
  user: UserProfile;
  profile: SalaryProfile;
  expenses: Expense[];
  incomes: Income[];
  bills: Bill[];
  goals: Goal[];
  investments: Investment[];
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

  // salary history
  loadSalaryHistory: () => Promise<void> | void;
  addSalaryEntry: (entry: Partial<SalaryHistoryEntry>) => Promise<void> | void;
  updateSalaryEntry: (id: string, patch: Partial<SalaryHistoryEntry>) => Promise<void> | void;
  deleteSalaryEntry: (id: string) => Promise<void> | void;

  // notifications
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;

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
      salaryHistory: [],
      notifications: [],

      // onboarding + profile
      completeOnboarding: (user, profile) =>
        set((s) => ({
          user: { ...s.user, ...user, onboarded: true },
          profile,
          notifications:
            s.notifications.length === 0 ? seedNotifications() : s.notifications,
        })),

      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),

      updateUser: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),

      addExpense: (e) =>
        set((s) => ({ expenses: [{ ...e, id: uid("exp") }, ...s.expenses] })),
      updateExpense: (id, patch) =>
        set((s) => ({
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),
      toggleFavorite: (id) =>
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === id ? { ...e, favorite: !e.favorite } : e
          ),
        })),

      addIncome: (i) =>
        set((s) => ({ incomes: [{ ...i, id: uid("inc") }, ...s.incomes] })),
      deleteIncome: (id) =>
        set((s) => ({ incomes: s.incomes.filter((i) => i.id !== id) })),

      addBill: (b) => set((s) => ({ bills: [...s.bills, { ...b, id: uid("bill") }] })),
      updateBill: (id, patch) =>
        set((s) => ({
          bills: s.bills.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      deleteBill: (id) =>
        set((s) => ({ bills: s.bills.filter((b) => b.id !== id) })),
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
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, saved: g.saved + amount } : g
          ),
        })),
      deleteGoal: (id) =>
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      addInvestment: (i) =>
        set((s) => ({ investments: [...s.investments, { ...i, id: uid("inv") }] })),
      updateInvestment: (id, patch) =>
        set((s) => ({
          investments: s.investments.map((i) =>
            i.id === id ? { ...i, ...patch } : i
          ),
        })),
      deleteInvestment: (id) =>
        set((s) => ({ investments: s.investments.filter((i) => i.id !== id) })),

      // salary history
      salaryHistory: [],
      loadSalaryHistory: async () => {
        try {
          const res = await fetch("/api/salary/history", { credentials: "include" });
          if (!res.ok) return;
          const j = await res.json();
          set({ salaryHistory: j.data || [] });
        } catch (e) {
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
        } catch (e) {}
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
        } catch (e) {}
      },
      deleteSalaryEntry: async (id) => {
        try {
          const res = await fetch(`/api/salary/history?id=${id}`, { method: "DELETE", credentials: "include" });
          if (!res.ok) return;
          set((s) => ({ salaryHistory: s.salaryHistory.filter((h) => h._id !== id) }));
        } catch (e) {}
      },

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
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
              bills: state.bills,
              goals: state.goals,
              investments: state.investments,
            }),
            credentials: "include",
          });
          if (!res.ok) return;
          const json = await res.json();
          if (json?.data) {
            const d = json.data;
            set({
              profile: d.profile || state.profile,
              expenses: d.expenses || state.expenses,
              bills: d.bills || state.bills,
              goals: d.goals || state.goals,
              investments: d.investments || state.investments,
            });
          }
        } catch (e) {
          // silent fail — keep local state
          // console.warn('sync failed', e)
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
          salaryHistory: [],
          notifications: [],
        }),
    }),
    { name: "salaryflow-store", version: 1 }
  )
);

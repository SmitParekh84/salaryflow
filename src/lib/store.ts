"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { accountDeletionBlocker, goalRestoreBlocker } from "./account-references";
import { applyAllocation, reassignGoalAccounts } from "./allocation-writes";
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
import { completeTransferWrite } from "./transfer-writes";
import { uid } from "./utils";

const STORE_KEY = "aartha-store";

/**
 * Ordered newest-first. Every rename prepends its predecessor, so someone who
 * skipped a release still carries their data forward instead of arriving to an
 * empty app.
 */
const LEGACY_STORE_KEYS = ["spendly-store", "salaryflow-store"] as const;

export function migrateLegacyBrandStorage(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
) {
  if (storage.getItem(STORE_KEY)) return false;

  for (const legacyKey of LEGACY_STORE_KEYS) {
    const legacyState = storage.getItem(legacyKey);
    if (!legacyState) continue;
    storage.setItem(STORE_KEY, legacyState);
    for (const staleKey of LEGACY_STORE_KEYS) storage.removeItem(staleKey);
    return true;
  }

  return false;
}

if (typeof window !== "undefined") migrateLegacyBrandStorage(window.localStorage);

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
  addAccount: (account: Omit<BankAccount, "id">) => string;
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

  /**
   * Server timestamp of the last state this device successfully pulled. Sent
   * back as `since` so the server can tell "the user deleted this" apart from
   * "this device has not seen it yet" — without it, a stale push would tombstone
   * whatever the other device just added.
   */
  lastSyncedAt: string | null;
  syncWithServer: () => Promise<void>;
  /** Debounced `syncWithServer`, for mutations that fire in bursts. */
  queueSync: () => void;
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
    // `clientId` first: it is the id this device minted and the one sync upserts
    // on, so it survives round-trips. `_id` is only a fallback for rows written
    // before the sync migration.
    const rawId = record.clientId ?? record.id ?? record._id;
    if (rawId === undefined || rawId === null) return [];

    const data = { ...record };
    delete data._id;
    delete data.clientId;
    delete data.removedAt;
    return [{ ...data, id: String(rawId) } as unknown as T];
  });
}

function normalizeBudgetRules(items: unknown, fallback: BudgetRule[]): BudgetRule[] {
  return normalizeServerItems<BudgetRule>(items, fallback).map(normalizeBudgetRule);
}

/** Collections mirrored to the server, in a stable key order. */
function syncPayload(state: FinanceState) {
  return {
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
  };
}

/** Cheap identity for a payload. Equal strings mean there is nothing to send. */
function fingerprint(state: FinanceState) {
  return JSON.stringify(syncPayload(state));
}

/**
 * The state the server is known to already hold. Every mutation used to push
 * the entire account whether or not anything had changed, so opening a page or
 * saving the same form twice cost a full upload and a full download back.
 */
let syncedFingerprint: string | null = null;

/** Rapid edits belong in one upload, not one upload each. */
const SYNC_DEBOUNCE_MS = 800;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

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
      lastSyncedAt: null,

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
        // Any expense funded by a bank account moves that account's money —
        // splitting the bill with a friend only changes *how much* of it is
        // yours, never whether the payment happened. Gating this on
        // `expense.shared` is why a plain ICICI spend left the balance untouched.
        // Credit cards are absent from `accounts`, so a card-funded expense
        // still finds no account here and stays out of cash balances.
        const balanceApplied = Boolean(account);
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
        const shouldApplyBalance = Boolean(nextAccount);
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
        get().queueSync();
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
        get().queueSync();
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
        get().queueSync();
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
        get().queueSync();
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
        get().queueSync();
      },

      // Returns the new id so a caller creating an account and the records that
      // point at it — onboarding does both — can link them without a re-read.
      addAccount: (account) => {
        const id = uid("acct");
        set((s) => ({ accounts: [...s.accounts, { ...account, id }] }));
        return id;
      },
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
        get().queueSync();
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
        if (!source || !destination) return false;
        const record: AccountTransfer = {
          ...transfer,
          id: uid("transfer"),
          status: mode === "scheduled" ? "scheduled" : "completed",
          completedAt: mode === "scheduled" ? undefined : new Date().toISOString(),
          balancesApplied: mode === "transfer-now",
        };
        if (mode === "scheduled") {
          set((state) => ({ accountTransfers: [record, ...state.accountTransfers] }));
        } else {
          const result = completeTransferWrite(
            record,
            get().accounts,
            get().goals,
            mode === "already-transferred",
            new Date(),
          );
          if (!result.ok) return false;
          set((state) => ({
            accountTransfers: [record, ...state.accountTransfers],
            accounts: result.accounts,
            goals: result.goals,
          }));
        }
        get().queueSync();
        return true;
      },
      completeAccountTransfer: (id) => {
        const transfer = get().accountTransfers.find((item) => item.id === id);
        if (!transfer || transfer.status === "completed") return false;
        const result = completeTransferWrite(
          transfer,
          get().accounts,
          get().goals,
          false,
          new Date(),
        );
        if (!result.ok) return false;
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
          accounts: result.accounts,
          goals: result.goals,
        }));
        get().queueSync();
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
        get().queueSync();
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
        get().queueSync();
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
              return {
                ok: false,
                reason: `Only ${account.balance} remains in ${account.bankName}.`,
              };
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
          // No `cache: "no-store"`: that bypassed the HTTP cache entirely and
          // forced a full download every poll. The route sends `no-cache` with
          // an ETag, so the browser still revalidates but re-reads the body
          // only when it has actually changed.
          const response = await fetch("/api/notifications", { credentials: "include" });
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

      queueSync: () => {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
          syncTimer = null;
          void get().syncWithServer();
        }, SYNC_DEBOUNCE_MS);
      },

      // sync store to server (requires authenticated session cookie)
      syncWithServer: async () => {
        const state = get();
        const pushing = fingerprint(state);
        // The server already holds exactly this. Saying so again costs a full
        // round trip and changes nothing.
        if (pushing === syncedFingerprint) return;

        if (syncTimer) {
          clearTimeout(syncTimer);
          syncTimer = null;
        }

        try {
          const res = await fetch("/api/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: state.user.email || undefined,
              since: state.lastSyncedAt,
              ...syncPayload(state),
            }),
            credentials: "include",
          });
          if (!res.ok) {
            // A rejected push means the server kept its copy and deleted
            // nothing. Surfacing it beats the old silent return, which is how a
            // failed sync came to look identical to a successful one.
            console.error("[SYNC] push rejected", res.status);
            return;
          }
          const json = await res.json();
          if (json?.data) {
            const d = json.data;
            set({
              lastSyncedAt: json.syncedAt ?? state.lastSyncedAt,
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
          // Fingerprint the state *after* the response has been folded in, not
          // the payload that went out. The server normalises rows on the way
          // through, so recording what was sent would leave the two looking
          // different forever and push again on every call.
          syncedFingerprint = fingerprint(get());
        } catch {
          // silent fail — keep local state
          // console.warn('sync failed', e)
        }
      },

      loadFromServer: async () => {
        const before = fingerprint(get());
        try {
          const res = await fetch("/api/sync", { credentials: "include" });
          if (!res.ok) return;
          const json = await res.json();
          if (!json?.data) return;

          const state = get();
          // The app now paints from the cached copy while this request is in
          // flight, so the user can record something before it lands. Their
          // edit is newer than this response and their own push will carry it
          // up — applying the response would erase it in front of them.
          if (fingerprint(state) !== before) return;

          const data = json.data;
          set({
            lastSyncedAt: json.syncedAt ?? state.lastSyncedAt,
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
          // Freshly pulled: the two copies match, so the next save has nothing
          // to push until the user actually changes something.
          syncedFingerprint = fingerprint(get());
        } catch {
          // Keep the last locally persisted state while offline.
        }
      },

      loadSeed: () =>
        set({
          user: { name: "Alex Morgan", email: "alex@aartha.app", onboarded: true },
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

      resetAll: () => {
        // The next account's state is nothing like this one's, so the "already
        // pushed" record must go with it or the first sync would be skipped.
        syncedFingerprint = null;
        if (syncTimer) {
          clearTimeout(syncTimer);
          syncTimer = null;
        }
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
          // Signing out must clear the watermark: the next account starts from
          // "has seen nothing", so its first push can never tombstone rows.
          lastSyncedAt: null,
        });
      },
    }),
    {
      name: STORE_KEY,
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as Partial<FinanceState>;

        return {
          ...state,
          // Devices upgrading from the destroy-and-replace era have no
          // watermark. Starting at null makes their first push additive-only,
          // so an old client cannot tombstone rows it never pulled.
          lastSyncedAt: null,
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

/**
 * A debounced save must never be the one that got away.
 *
 * On a phone the app is backgrounded far more often than it is closed, and
 * `pagehide` is the last event that reliably fires in both cases — `unload`
 * does not fire at all on iOS. Flushing here means the longest a change can
 * sit unsent is until the user leaves the app.
 */
if (typeof window !== "undefined") {
  const flush = () => {
    if (document.visibilityState === "hidden") void useFinanceStore.getState().syncWithServer();
  };
  window.addEventListener("pagehide", () => void useFinanceStore.getState().syncWithServer());
  document.addEventListener("visibilitychange", flush);
}

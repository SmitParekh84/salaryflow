import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useFinanceStore } from "./store";
import type { SalaryProfile } from "./types";

const profile: SalaryProfile = {
  amount: 85000,
  salaryDay: 25,
  cycle: "monthly",
  currency: "INR",
  country: "India",
  savingsGoal: 0,
  emergencyFundGoal: 0,
  investmentAmount: 0,
};

describe("completeOnboarding", () => {
  beforeEach(() => {
    useFinanceStore.getState().resetAll();
  });

  it("leaves the notification list empty rather than inventing bills the user never entered", () => {
    useFinanceStore.getState().completeOnboarding({ name: "Smit", email: "s@example.com" }, profile);

    expect(useFinanceStore.getState().notifications).toEqual([]);
  });
});

describe("sync failure reporting", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function stubFetch(impl: () => Promise<unknown>) {
    globalThis.fetch = (() => impl()) as unknown as typeof fetch;
  }

  async function syncOnce() {
    // A change the server has not seen, so the no-op shortcut cannot skip.
    useFinanceStore.getState().addExpense({
      amount: 100,
      category: "Food",
      paymentMethod: "UPI",
      date: new Date().toISOString(),
    });
    return useFinanceStore.getState().syncWithServer();
  }

  beforeEach(() => {
    useFinanceStore.getState().resetAll();
  });

  it("reports a rejected push instead of looking identical to a save", async () => {
    stubFetch(async () => ({ ok: false, status: 413, json: async () => ({}) }));

    await expect(syncOnce()).resolves.toBe(false);
    expect(useFinanceStore.getState().syncStatus).toBe("error");
    expect(useFinanceStore.getState().unsavedSince).not.toBeNull();
  });

  it("names a payload too large for the server, since that is the one a user cannot retry away", async () => {
    stubFetch(async () => ({ ok: false, status: 413, json: async () => ({}) }));

    await syncOnce();

    expect(useFinanceStore.getState().syncError).toMatch(/too large/i);
  });

  it("distinguishes being offline from being rejected", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(syncOnce()).resolves.toBe(false);
    expect(useFinanceStore.getState().syncStatus).toBe("offline");
  });

  it("clears the error and the unsaved marker once a save gets through", async () => {
    stubFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    await syncOnce();
    expect(useFinanceStore.getState().syncStatus).toBe("error");

    stubFetch(async () => ({ ok: true, status: 200, json: async () => ({ data: null }) }));
    await useFinanceStore.getState().syncWithServer();

    expect(useFinanceStore.getState().syncStatus).toBe("idle");
    expect(useFinanceStore.getState().syncError).toBeNull();
    expect(useFinanceStore.getState().unsavedSince).toBeNull();
  });

  it("keeps the first unsaved timestamp across repeated failures, so the age is the real one", async () => {
    stubFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));

    await syncOnce();
    const first = useFinanceStore.getState().unsavedSince;
    await syncOnce();

    expect(useFinanceStore.getState().unsavedSince).toBe(first);
    expect(useFinanceStore.getState().syncFailures).toBe(2);
  });
});

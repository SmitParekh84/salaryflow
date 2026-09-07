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

describe("delta push", () => {
  const realFetch = globalThis.fetch;
  let bodies: Record<string, { rows: unknown[]; ids: string[] }>[] = [];

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  beforeEach(() => {
    useFinanceStore.getState().resetAll();
    bodies = [];
    globalThis.fetch = ((_url: string, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return Promise.resolve({
        ok: true,
        status: 200,
        // No `data`, so the response cannot repopulate state and the test is
        // measuring what this device chose to send.
        json: async () => ({ syncedAt: new Date().toISOString(), protocol: "delta-v1" }),
      });
    }) as unknown as typeof fetch;
  });

  const addExpense = (amount: number) =>
    useFinanceStore.getState().addExpense({
      amount,
      category: "Food",
      paymentMethod: "UPI",
      date: new Date().toISOString(),
    });

  it("sends every row the first time, since this device knows nothing of the server", async () => {
    addExpense(100);
    addExpense(200);
    await useFinanceStore.getState().syncWithServer();

    expect(bodies[0].expenses.rows).toHaveLength(2);
    expect(bodies[0].expenses.ids).toHaveLength(2);
  });

  it("sends only the new row afterwards, while still naming the ones it kept", async () => {
    addExpense(100);
    addExpense(200);
    await useFinanceStore.getState().syncWithServer();

    addExpense(300);
    await useFinanceStore.getState().syncWithServer();

    // The whole point: bodies grow by the change, not by the account.
    expect(bodies[1].expenses.rows).toHaveLength(1);
    expect(bodies[1].expenses.ids).toHaveLength(3);
  });

  it("drops a deleted row from the manifest, which is what authorises the tombstone", async () => {
    addExpense(100);
    addExpense(200);
    await useFinanceStore.getState().syncWithServer();
    const [kept, removed] = useFinanceStore.getState().expenses.map((e) => e.id);

    useFinanceStore.getState().deleteExpense(removed);
    await useFinanceStore.getState().syncWithServer();

    expect(bodies[1].expenses.ids).toContain(kept);
    expect(bodies[1].expenses.ids).not.toContain(removed);
  });

  it("does not shrink the push after a failure, so nothing is dropped on the retry", async () => {
    addExpense(100);
    globalThis.fetch = (() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({}) })) as unknown as typeof fetch;
    await useFinanceStore.getState().syncWithServer();

    // Restore a recording success and retry: the row the server never accepted
    // must still be in the body, or the failed write is lost for good.
    const retried: Record<string, { rows: unknown[] }>[] = [];
    globalThis.fetch = ((_u: string, init: { body: string }) => {
      retried.push(JSON.parse(init.body));
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ protocol: "delta-v1" }) });
    }) as unknown as typeof fetch;
    addExpense(200);
    await useFinanceStore.getState().syncWithServer();

    expect(retried[0].expenses.rows).toHaveLength(2);
  });
});

describe("delta protocol handshake", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  beforeEach(() => {
    useFinanceStore.getState().resetAll();
  });

  const addExpense = (amount: number) =>
    useFinanceStore.getState().addExpense({
      amount,
      category: "Food",
      paymentMethod: "UPI",
      date: new Date().toISOString(),
    });

  /*
   * A server that predates the delta shape skips every collection it cannot
   * read as an array and still answers 200. Believing that would mean marking
   * rows as saved that the server discarded -- so the acknowledgement, not the
   * status code, is what licenses the next push to be a delta.
   */
  it("keeps sending whole collections to a server that does not acknowledge deltas", async () => {
    const bodies: Record<string, { rows: unknown[] }>[] = [];
    globalThis.fetch = ((_u: string, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ syncedAt: null }) });
    }) as unknown as typeof fetch;

    addExpense(100);
    await useFinanceStore.getState().syncWithServer();
    addExpense(200);
    await useFinanceStore.getState().syncWithServer();

    expect(bodies[1].expenses.rows).toHaveLength(2);
  });

  it("switches to deltas once the server acknowledges understanding them", async () => {
    const bodies: Record<string, { rows: unknown[] }>[] = [];
    globalThis.fetch = ((_u: string, init: { body: string }) => {
      bodies.push(JSON.parse(init.body));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ syncedAt: null, protocol: "delta-v1" }),
      });
    }) as unknown as typeof fetch;

    addExpense(100);
    await useFinanceStore.getState().syncWithServer();
    addExpense(200);
    await useFinanceStore.getState().syncWithServer();

    expect(bodies[1].expenses.rows).toHaveLength(1);
  });
});

import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ExpenseModel } from "./models";
import { mergeCollection } from "./sync-merge";

/**
 * Two-device sync regression tests.
 *
 * These reproduce the bug that shipped: an expense added on one phone vanished
 * because the other phone's next sync replaced the whole account with its own
 * stale copy. That behaviour is invisible to a single-device test, so these run
 * against a real Mongo.
 *
 * Opt in with MONGODB_TEST_URI. It must NOT point at the production database —
 * the suite writes and deletes rows for its own scratch user.
 */
const URI = process.env.MONGODB_TEST_URI;
const USER = "sync-merge-test@spendly.local";

const suite = URI ? describe : describe.skip;

function expense(id: string, amount: number) {
  return { id, amount, category: "Food", date: new Date().toISOString() };
}

async function liveIds() {
  const rows = await ExpenseModel.find({ userId: USER, removedAt: null })
    .select("clientId")
    .lean();
  return rows.map((r) => (r as { clientId: string }).clientId).sort();
}

suite("sync merge — two devices on one account", () => {
  beforeAll(async () => {
    await mongoose.connect(URI as string);
  });

  afterAll(async () => {
    await ExpenseModel.deleteMany({ userId: USER });
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await ExpenseModel.deleteMany({ userId: USER });
  });

  it("keeps an expense another device added after this client last pulled", async () => {
    const t0 = new Date(Date.now() - 60_000);

    // Both phones pulled at t0 and hold the same single expense.
    await mergeCollection({
      model: ExpenseModel,
      userId: USER,
      items: [expense("exp_shared", 100)],
      since: null,
      now: t0,
    });

    // iPhone adds one and pushes.
    await mergeCollection({
      model: ExpenseModel,
      userId: USER,
      items: [expense("exp_shared", 100), expense("exp_from_iphone", 250)],
      since: t0,
      now: new Date(Date.now() - 30_000),
    });
    expect(await liveIds()).toEqual(["exp_from_iphone", "exp_shared"]);

    // Android pushes its stale copy — it never saw exp_from_iphone. Under the
    // old delete-and-replace this wiped it; the merge must keep it.
    await mergeCollection({
      model: ExpenseModel,
      userId: USER,
      items: [expense("exp_shared", 100)],
      since: t0,
      now: new Date(),
    });

    expect(await liveIds()).toEqual(["exp_from_iphone", "exp_shared"]);
  });

  it("still deletes an expense the user actually removed", async () => {
    const t0 = new Date(Date.now() - 60_000);

    await mergeCollection({
      model: ExpenseModel,
      userId: USER,
      items: [expense("exp_a", 100), expense("exp_b", 200)],
      since: null,
      now: t0,
    });

    // The device pulled at t1 (after both rows existed), then dropped exp_b.
    const t1 = new Date();
    await mergeCollection({
      model: ExpenseModel,
      userId: USER,
      items: [expense("exp_a", 100)],
      since: t1,
      now: new Date(),
    });

    expect(await liveIds()).toEqual(["exp_a"]);
  });

  it("never tombstones when the client reports no watermark", async () => {
    await mergeCollection({
      model: ExpenseModel,
      userId: USER,
      items: [expense("exp_a", 100), expense("exp_b", 200)],
      since: null,
      now: new Date(),
    });

    // A freshly upgraded client pushes a partial list with since:null.
    await mergeCollection({
      model: ExpenseModel,
      userId: USER,
      items: [expense("exp_a", 100)],
      since: null,
      now: new Date(),
    });

    expect(await liveIds()).toEqual(["exp_a", "exp_b"]);
  });

  it("updates in place instead of duplicating on repeated pushes", async () => {
    const now = new Date();
    for (let i = 0; i < 3; i += 1) {
      await mergeCollection({
        model: ExpenseModel,
        userId: USER,
        items: [expense("exp_a", 100 + i)],
        since: null,
        now,
      });
    }

    const rows = await ExpenseModel.find({ userId: USER }).lean();
    expect(rows).toHaveLength(1);
    expect((rows[0] as { amount: number }).amount).toBe(102);
  });
});

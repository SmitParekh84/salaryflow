import { describe, expect, it } from "vitest";
import { collectionDelta, snapshotOf } from "./sync-delta";

const a = { id: "a", amount: 100 };
const b = { id: "b", amount: 200 };
const c = { id: "c", amount: 300 };

describe("collectionDelta", () => {
  it("sends everything when this device has synced nothing yet", () => {
    expect(collectionDelta([a, b], null)).toEqual({ rows: [a, b], ids: ["a", "b"] });
  });

  it("sends no rows when nothing changed, but still names every row it holds", () => {
    const result = collectionDelta([a, b], snapshotOf([a, b]));

    expect(result.rows).toEqual([]);
    expect(result.ids).toEqual(["a", "b"]);
  });

  it("sends only the row that changed", () => {
    const edited = { ...b, amount: 999 };
    const result = collectionDelta([a, edited], snapshotOf([a, b]));

    expect(result.rows).toEqual([edited]);
    expect(result.ids).toEqual(["a", "b"]);
  });

  it("sends a newly added row", () => {
    const result = collectionDelta([a, b, c], snapshotOf([a, b]));

    expect(result.rows).toEqual([c]);
    expect(result.ids).toEqual(["a", "b", "c"]);
  });

  /*
   * The manifest is what authorises deletion server-side, so this is the
   * assertion that matters most: a deleted row must be missing from `ids`, and
   * a row that merely did not change must not be.
   */
  it("drops a deleted row from the manifest while keeping the untouched ones in it", () => {
    const result = collectionDelta([a], snapshotOf([a, b]));

    expect(result.ids).toEqual(["a"]);
    expect(result.ids).not.toContain("b");
    expect(result.rows).toEqual([]);
  });

  it("notices a change to a nested field, not just a top-level one", () => {
    const nested = { id: "a", split: { friend: 50 } };
    const changed = { id: "a", split: { friend: 75 } };

    expect(collectionDelta([changed], snapshotOf([nested])).rows).toEqual([changed]);
  });

  it("re-sends a row whose fields were reordered rather than risk missing an edit", () => {
    // Key order is not meaningful, but treating a reorder as a change only
    // costs one redundant row; treating a real edit as unchanged loses it.
    const reordered = { amount: 100, id: "a" };

    expect(collectionDelta([reordered], snapshotOf([a])).rows).toEqual([reordered]);
  });
});

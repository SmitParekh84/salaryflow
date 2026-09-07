import { describe, expect, it } from "vitest";
import { parseCollectionPush } from "./sync-payload";

describe("parseCollectionPush", () => {
  it("reads a plain array as the whole account, exactly as older clients send it", () => {
    const rows = [{ id: "a" }, { id: "b" }];

    expect(parseCollectionPush(rows)).toEqual({ rows, manifestIds: null });
  });

  it("reads the delta shape, keeping the manifest apart from the rows sent", () => {
    const result = parseCollectionPush({ rows: [{ id: "a" }], ids: ["a", "b", "c"] });

    expect(result).toEqual({ rows: [{ id: "a" }], manifestIds: ["a", "b", "c"] });
  });

  it("accepts a delta that changed nothing but still vouches for the account", () => {
    expect(parseCollectionPush({ rows: [], ids: ["a", "b"] })).toEqual({
      rows: [],
      manifestIds: ["a", "b"],
    });
  });

  it("treats an absent key as no opinion rather than as an empty account", () => {
    expect(parseCollectionPush(undefined)).toBeNull();
    expect(parseCollectionPush(null)).toBeNull();
  });

  /*
   * The manifest is the delete authority: every live row missing from it is
   * tombstoned. So a malformed one must never be read as a short one -- that
   * would delete the account. Each of these is rejected outright.
   */
  it("refuses a manifest that is not a list of ids, rather than treating it as empty", () => {
    expect(parseCollectionPush({ rows: [], ids: "a,b" })).toBeNull();
    expect(parseCollectionPush({ rows: [], ids: {} })).toBeNull();
    expect(parseCollectionPush({ rows: [], ids: ["a", 7] })).toBeNull();
    expect(parseCollectionPush({ rows: [], ids: ["a", null] })).toBeNull();
  });

  it("refuses a delta whose rows are not a list", () => {
    expect(parseCollectionPush({ rows: "nope", ids: ["a"] })).toBeNull();
  });

  it("refuses an object carrying rows but no manifest, since absence would delete everything", () => {
    expect(parseCollectionPush({ rows: [{ id: "a" }] })).toBeNull();
  });
});

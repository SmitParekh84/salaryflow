import { SYNC_PROTOCOL } from "@/lib/sync-delta";

export { SYNC_PROTOCOL };

/**
 * One collection as it arrived from a client.
 *
 * `manifestIds === null` means the client sent its whole account the old way,
 * so the ids to keep are whatever the rows themselves carry. A non-null
 * manifest means the client sent only what changed and is naming, separately,
 * every row it still holds.
 */
export type CollectionPush = {
  rows: unknown[];
  manifestIds: string[] | null;
};

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry !== "");
}

/**
 * Reads one collection out of a sync body, in either the whole-account or the
 * delta shape.
 *
 * Every rejection here returns null, which the route treats as "this client
 * expressed no opinion about this collection" — nothing is written and, far
 * more importantly, nothing is deleted. That is the only safe way to fail,
 * because the manifest is the delete authority: a live row missing from it gets
 * tombstoned. A malformed manifest read as a short one would empty the account,
 * so a delta is accepted only when both halves are exactly what they claim to
 * be, and an object with rows but no manifest is refused outright rather than
 * being generously treated as naming nothing.
 */
export function parseCollectionPush(value: unknown): CollectionPush | null {
  // The whole-account shape older clients send. Deletion is inferred from
  // absence among the rows, which is what it has always meant.
  if (Array.isArray(value)) return { rows: value, manifestIds: null };

  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.rows)) return null;
  if (!isIdList(record.ids)) return null;

  return { rows: record.rows, manifestIds: record.ids };
}


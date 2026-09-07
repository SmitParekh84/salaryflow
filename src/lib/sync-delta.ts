/**
 * Building the delta half of a sync push.
 *
 * The wire shape is `{ rows, ids }`: full bodies only for rows that changed,
 * plus every id this device still holds. The manifest is what lets the server
 * keep inferring deletion from absence — the rule that protects against one
 * device wiping another's work — while the expensive half of the payload
 * shrinks to what actually changed.
 */

export type SyncSnapshot = Map<string, string>;

export type CollectionDelta<T> = {
  rows: T[];
  ids: string[];
};

/**
 * What was last accepted by the server, as id → serialised row.
 *
 * Taken from state *after* a successful push, so the next comparison is against
 * what the server actually holds rather than what this device tried to send.
 */
export function snapshotOf<T extends { id: string }>(rows: T[]): SyncSnapshot {
  return new Map(rows.map((row) => [row.id, JSON.stringify(row)]));
}

/**
 * Splits a collection into the rows worth sending and the ids worth keeping.
 *
 * A null snapshot means this device has no record of what the server holds —
 * the first push of a session, or the first after signing in — so everything is
 * sent, which is exactly what used to happen every time.
 *
 * Comparison is by serialised value, which counts a key reorder as a change.
 * That is the deliberate direction to be wrong in: a redundant row costs one
 * row of bandwidth, a missed edit costs the edit.
 */
export function collectionDelta<T extends { id: string }>(
  rows: T[],
  snapshot: SyncSnapshot | null,
): CollectionDelta<T> {
  const ids = rows.map((row) => row.id);
  if (!snapshot) return { rows, ids };

  return {
    rows: rows.filter((row) => snapshot.get(row.id) !== JSON.stringify(row)),
    ids,
  };
}

/**
 * Marker a server sends back to say it understood the delta push shape.
 *
 * Lives here, beside the code that builds that shape, rather than in the server
 * module: the client has to check it, and reaching into src/server for a string
 * would pull a server path into the browser bundle for no reason.
 *
 * Bump this only if the wire shape changes incompatibly again — the client
 * treats an unrecognised value exactly like an absent one and falls back to
 * pushing whole collections, which every version of the server can read.
 */
export const SYNC_PROTOCOL = "delta-v1";

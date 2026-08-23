import type { Model } from "mongoose";

/**
 * The schemas in models.ts are declared without generics, so Mongoose infers
 * `Model<any>` for each. Narrowing further here would fight that inference
 * without making the merge any safer — it only ever touches `userId`,
 * `clientId` and `removedAt`, which every synced schema declares.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SyncModel = Model<any>;

/** Fields the client must never dictate. */
const RESERVED = ["_id", "id", "userId", "clientId", "removedAt", "createdAt", "updatedAt"];

export type MergeResult =
  | { ok: true; upserted: number; tombstoned: number }
  | { ok: false; rejected: number; reason: string };

/**
 * Merges one collection's worth of client state into the server.
 *
 * Extracted from the route so the two-device semantics can be tested directly
 * against real models — the behaviour this protects is not observable from a
 * single-device unit test.
 *
 * `since` is the timestamp of the server state the client is pushing from, and
 * it is what makes both deletion and overwriting safe. A server row is only
 * changed on this client's word when `updatedAt <= since` — i.e. the client had
 * already pulled the version it is speaking about. That one test covers the two
 * ways a push can destroy someone else's work:
 *
 *   - a row the client did not send is tombstoned only if it had seen it and
 *     then dropped it, so another device's new row survives;
 *   - a row the client did send overwrites the stored one only if it had seen
 *     the stored one, so a device that has been offline through a correction
 *     cannot silently undo it.
 *
 * Creation is never gated: a row the client minted cannot be stale, and lands
 * through `$setOnInsert`.
 *
 * Passing `since: null` means "this client has seen nothing", making the merge
 * purely additive — no tombstones and no overwrites, only inserts.
 */
export async function mergeCollection({
  model,
  userId,
  items,
  since,
  now,
}: {
  model: SyncModel;
  userId: string;
  items: unknown[];
  since: Date | null;
  now: Date;
}): Promise<MergeResult> {
  const pushedIds: string[] = [];
  const operations = [];

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = { ...(raw as Record<string, unknown>) };
    const clientId = typeof item.id === "string" ? item.id : String(item._id ?? "");
    if (!clientId) continue;

    for (const field of RESERVED) delete item[field];
    pushedIds.push(clientId);

    // Creation is unconditional: a row this client minted cannot be stale.
    // `$setOnInsert` so it never doubles as an overwrite of an existing row —
    // which also means a push that changes nothing must not touch `updatedAt`.
    // Letting Mongoose stamp it here would bump every row on every sync and
    // make the whole account look newer than every client's watermark, so the
    // timestamps are written by hand below and its own are turned off.
    operations.push({
      updateOne: {
        filter: { userId, clientId },
        update: {
          $setOnInsert: {
            ...item,
            userId,
            clientId,
            removedAt: null,
            createdAt: now,
            updatedAt: now,
          },
        },
        upsert: true,
      },
    });

    // Overwriting an existing row is only safe when this client had already
    // pulled the version it is overwriting — the same test `since` applies to
    // deletion, and for the same reason. Without it the push was last-writer-
    // wins per row, so a device that had not pulled since a change was made
    // silently undid it: a corrected statement day reverted to the old one and
    // a deleted duplicate came back (`removedAt: null` resurrects). No
    // watermark at all means the client has seen nothing, so nothing it sends
    // can be an informed overwrite and only the insert above applies.
    //
    // The client is not left guessing: this request's response carries the
    // server's copy, so a stale device converges on the next round trip rather
    // than silently winning.
    if (since) {
      operations.push({
        updateOne: {
          filter: {
            userId,
            clientId,
            // A row written after the watermark is one this client has never
            // seen. Rows predating `timestamps` have no `updatedAt` to judge
            // by, so they stay writable rather than becoming uneditable.
            $or: [{ updatedAt: { $lte: since } }, { updatedAt: { $exists: false } }],
          },
          // `removedAt: null` also resurrects an item restored from the bin.
          update: { $set: { ...item, userId, clientId, removedAt: null, updatedAt: now } },
        },
      });
    }
  }

  let upserted = 0;
  if (operations.length > 0) {
    // Unordered so one bad row cannot abort the rest — but the result is
    // inspected rather than discarded, unlike the old `.catch(() => null)`.
    const result = await model.bulkWrite(operations, { ordered: false, timestamps: false });
    upserted = (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);

    const errors = result.hasWriteErrors?.() ? result.getWriteErrors() : [];
    if (errors.length > 0) {
      return {
        ok: false,
        rejected: errors.length,
        reason: errors[0]?.errmsg ?? "write error",
      };
    }
  }

  let tombstoned = 0;
  if (since) {
    const result = await model.updateMany(
      {
        userId,
        removedAt: null,
        clientId: { $type: "string", $nin: pushedIds },
        updatedAt: { $lte: since },
      },
      { $set: { removedAt: now } },
    );
    tombstoned = result.modifiedCount ?? 0;
  }

  return { ok: true, upserted, tombstoned };
}

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
 * it is what makes deletion safe. A server row the client did not send is only
 * tombstoned when `updatedAt <= since`, i.e. the client had already pulled it and
 * then dropped it. Anything written by another device after this client's last
 * pull is newer than `since` and survives. Passing `since: null` means "this
 * client has seen nothing", making the merge purely additive.
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

    operations.push({
      updateOne: {
        filter: { userId, clientId },
        // `removedAt: null` also resurrects an item restored from the bin.
        update: { $set: { ...item, userId, clientId, removedAt: null, updatedAt: now } },
        upsert: true,
      },
    });
  }

  let upserted = 0;
  if (operations.length > 0) {
    // Unordered so one bad row cannot abort the rest — but the result is
    // inspected rather than discarded, unlike the old `.catch(() => null)`.
    const result = await model.bulkWrite(operations, { ordered: false });
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

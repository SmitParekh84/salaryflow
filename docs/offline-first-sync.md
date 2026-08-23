# Offline-first sync: why the app can show numbers the database does not

The app paints from a copy of the whole account held in `localStorage` and
reconciles underneath. That is what makes it usable on a phone with no signal,
and it is also the reason a figure on screen can disagree with Atlas for as long
as the device goes without pulling.

This matters most for work done **outside** the app — a maintenance script in
`scripts/`, a statement import reconciled on the desktop, a correction applied
straight to the collection. The database is right immediately; the phone is not.

## What each side does

| | |
|---|---|
| `loadFromServer()` | GET `/api/sync`. Runs once per mount, from `AuthProvider`. Replaces local state wholesale. |
| `syncWithServer()` | POST `/api/sync`. Pushes local state, folds the server's response back in. |
| Push triggers | any mutation (debounced 800ms), plus `pagehide` and `visibilitychange` → hidden |

So a pull happens when the app is **opened**, and a push happens when it is
**used or backgrounded**. A device that is never opened never learns about a
server-side change, and the first thing it does when it is finally backgrounded
is talk about a version of the account that no longer exists.

## The rule that keeps a stale device from winning

`mergeCollection` in `src/server/sync-merge.ts` gates every destructive action
on `since` — the timestamp of the server state the client is pushing from:

- **insert** — never gated. A row the client minted cannot be stale.
- **overwrite** — only when the stored row's `updatedAt <= since`, i.e. this
  client had already pulled the version it is speaking about.
- **tombstone** — only when the stored row's `updatedAt <= since`, i.e. the
  client had seen the row and then dropped it.

`since: null` means "this client has seen nothing", so the merge is inserts
only.

Before that rule covered overwrites, a push was last-writer-wins per row and
carried `removedAt: null` on everything it sent. A device that had been offline
across a correction silently undid it on its next sync: a corrected statement
day reverted, and a deleted duplicate came back from the dead. The failure was
invisible — no error, no conflict, the numbers simply went wrong again a day
after being fixed.

A blocked overwrite is not a dead end. The same POST returns the merged server
state, so the stale device converges on that one round trip.

## What this means when changing account data by script

1. Apply the change and verify it read-only (`scripts/db-snapshot.cjs`,
   `scripts/cc-diagnose.cjs`).
2. **Tell the user to open the app and let it pull.** Until they do, they are
   looking at the old numbers, and reporting them as a bug is the correct thing
   for them to do.
3. `scripts/sync-timeline.cjs` prints the last write per collection. If the
   newest `updatedAt` is still your script's run, no device has synced since —
   the fix is intact but has not reached anyone.

## Diagnosing "the app shows something different"

`scripts/fix-provenance.cjs` answers this directly: it prints what the server
holds now and what a device that never pulled would still compute, side by side.
When the second column matches the user's complaint, the data is fine and the
device is behind.

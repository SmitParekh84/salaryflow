# Aartha — Suggestions and Planned Work

Work that is agreed, discovered, or deliberately postponed but not yet built. Shipped work is not
listed here; it lives in git history and in `FINANCE-CALCULATIONS.md`.

Ordered by how much it is worth doing, not by effort.

---

## 0. Known data-loss bug

### Reloading discards local changes the server never received

`auth-provider.tsx` calls `loadFromServer()` on every mount, and that replaces
the whole local state with the server copy. Any change made while a push was
failing — offline, signed out, server down — is silently erased by the next
reload. This destroyed a 418-row statement import on 23 Aug: the upload failed
without a word, the page was reloaded, and the server's 74 expenses overwrote
the local 492.

The import screen now blocks until the push is confirmed and shouts when it is
not, so the worst single case is covered. The general case is not: every other
mutation still relies on a debounced fire-and-forget push.

The obvious fix — push-merge local state on mount instead of pulling — is NOT
safe as-is: on a shared browser, user B logging in would push user A's
leftover localStorage into B's account, because the sync route trusts the
cookie and merges whatever arrives. The fix needs the store to know which
user its persisted state belongs to before any push happens.

---

## 1. Ready to build, waiting on a go-ahead

### Catch-up: offer gaps that sit between recorded days

Catch-up shipped, and its window deliberately opens *after* the most recent entry. A day
missed in the middle — recorded on the 16th and 18th, nothing on the 17th — is therefore
never offered, and never can be. `src/lib/catch-up.test.ts` pins this as intended.

Widening it means deciding when to stop caring about a historic hole, which the current
design sidesteps entirely. Options if it turns out to matter: always sweep the trailing 7
days regardless of the last entry, or offer holes only within the current salary cycle.

Not blocked, but it needs that question answered before it is worth building.

### No component tests anywhere in the app

`vitest.config.mts` has no DOM environment, so nothing under `src/features` is tested. The
catch-up flow is the sharpest example: it is a multi-step state machine driven entirely by
clicks, and its whole correctness rests on reading the code. A remount bug in it was caught
by review, not by a test.

Adding `jsdom` and `@testing-library/react` would be a new dependency and a new convention
for the repo, so it wants a deliberate yes rather than being slipped in alongside a feature.

### Extend autocomplete beyond the expense form

**Title or place** and **Friend's name** now suggest past entries, through `SuggestInput` and
`src/lib/suggestions.ts`. Two extensions were scoped alongside it and left out:

- Same treatment on the Bills **Bill name** field. `src/features/bills/bills-view.tsx` already has
  the form; it needs the same `Controller` plus `SuggestInput` wiring.
- Picking a past merchant also prefills its usual category. Choosing Blinkit would set Groceries,
  still editable. Saves a tap on every repeat expense, but it changes what selecting a suggestion
  *does*, which is a behaviour change rather than autocomplete.

Neither is blocked on anything. Both reuse what already exists.

---

## 2. Known bugs in a family we have already fixed once

Expenses paid from a bank account now move that balance. Two sibling cases still do not.

### Income never credits an account

`addIncome` in `src/lib/store.ts` stores the record and stops. An income carrying an `accountId`
leaves that balance untouched — the exact mirror of the expense bug already fixed, and the reason
a ₹1,000 reimbursement into HDFC never showed up there.

Doing it properly needs what expenses already have: a `balanceApplied` marker on `Income`, plus
reversal on delete and re-application on restore, or the money will double-count the first time a
record is edited.

Latent for now — the app has no add-income screen, so these rows arrive only through sync.

### Investments do not move money either

`addInvestment` in `src/lib/store.ts` never touches a balance, although every SIP row carries an
`accountId` and a real SIP debit does leave a bank account.

This is a genuine question rather than a clear defect. Invariant 7 in `FINANCE-CALCULATIONS.md`
says investment payments are investments, not spending — but that is about *expense totals*, not
about whether cash left the account. Decide the rule before writing code.

### Transfers marked "already transferred" leave balances untouched

Three ICICI transfers (₹5,000, ₹3,000, ₹10,000) are `status: completed` with
`balancesApplied: false`. That is what the "already transferred" mode is meant to do — it assumes
the user's stored balances already reflect the move. It also means those balances quietly drift if
the assumption was wrong. Worth an audit screen, or at least a badge on the transfer.

---

## 3. Decisions needed before anything can be built

- **Bank of Baroda's real balance.** Currently ₹24,843, derived by assuming the stored ₹25,003
  predated the ₹160 Farari Center purchase. Confirm against the bank app.
- **Cashback in savings.** Currently excluded from `cashSavedThisCycle`, alongside reimbursements,
  so it cannot inflate the savings rate against an income figure that leaves it out. It is
  genuinely new money though, so this is reversible if you disagree.
- **The two Swarali ₹1,000 records.** There is a 7 Aug entry where she covered ₹1,000 in full, and
  an 8 Aug ₹1,500 split where she paid ₹1,000 of her own. They look like separate events. If they
  are the same money, one has to go.

---

## 4. Performance, deliberately postponed

The four cheap wins are shipped: instant paint from cache, no sync when nothing changed, no
database round trip on navigation, and notification polling every five minutes behind an ETag.

### Delta sync

Send only changed rows instead of the whole account on every push. It is the largest remaining
win and the reason the current payload is as big as it is.

Held back on purpose. `src/server/sync-merge.ts` is where two-device data loss would live, and its
`since` watermark rule is subtle enough that a rewrite deserves its own design pass and its own
tests rather than being folded into a performance sweep. Measure the current cost first.

### API responses in the service worker

Rejected rather than deferred. `public/sw.js` bypasses `/api/` on purpose. A stale balance served
from a cache is worse than a slow one.

---

## 5. Assistant follow-ups

From the Deferred section of `docs/superpowers/specs/2026-08-16-finance-assistant-design.md`:

- **Streaming replies.** Conflicts with extracting the trailing profile-update JSON in one call.
  Revisit by streaming the text and doing extraction in a second cheap call.
- **Actions with confirmation.** "Shall I create a term-cover goal?" needs tool calling plus a
  confirm UI. The assistant is read-only by design today.
- **App navigation help.** "How do I add a bill?" needs a separate knowledge base of Aartha's
  screens; it is not answerable from financial context.

One operational note: the free Gemini tier allows roughly 20 requests a day. The client already
falls through a list of models on quota errors, but a paid key is the real fix if the assistant
gets daily use.

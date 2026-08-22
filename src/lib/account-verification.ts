import type { BankAccount } from "./types";
import { uid } from "./utils";

/**
 * Balance integrity.
 *
 * A stored balance used to be a bare number: nothing recorded when it was set,
 * an edit overwrote it without a trace, and one set in June looked exactly as
 * trustworthy in August. That is how an account sat ₹12,071 away from the bank
 * for months with nothing able to notice — there was no field a discrepancy
 * could even show up in.
 *
 * The rule now: a balance changes either because a record moved it, or through
 * an explicit correction that stamps when it was confirmed and keeps the delta
 * as a visible adjustment. Corrections are not income and not spending — money
 * is counted once — they are the account owning up to what the bank says.
 */

/** After this many unconfirmed days a balance is flagged as not to be trusted. */
export const BALANCE_STALE_AFTER_DAYS = 14;

/**
 * Corrections kept per account. The trail exists to explain recent drift, not
 * to be a second ledger; it rides the account through every sync, so it must
 * not grow without bound — the same reasoning as the catch-up date pruning.
 */
const MAX_ADJUSTMENTS = 24;

/** Differences below a paisa are float noise, not a correction worth logging. */
const MIN_DELTA = 0.005;

/**
 * The account with its balance confirmed at `actual`.
 *
 * Always stamps `balanceVerifiedAt` — confirming an unchanged figure is real
 * information, it resets the staleness clock. Writes an adjustment only when
 * the figure actually moved, so the trail holds corrections rather than
 * routine check-ins.
 */
export function withCorrectedBalance(
  account: BankAccount,
  actual: number,
  note: string,
  now = new Date(),
): BankAccount {
  const delta = Math.round((actual - account.balance) * 100) / 100;
  const verified: BankAccount = {
    ...account,
    balance: actual,
    balanceVerifiedAt: now.toISOString(),
  };
  if (Math.abs(delta) < MIN_DELTA) return verified;

  return {
    ...verified,
    adjustments: [
      { id: uid("adj"), date: now.toISOString(), amount: delta, note },
      ...(account.adjustments ?? []),
    ].slice(0, MAX_ADJUSTMENTS),
  };
}

export interface VerificationStatus {
  state: "never" | "verified" | "stale";
  /** Whole days since the last confirmation; null when there has never been one. */
  days: number | null;
}

export function verificationStatus(
  account: Pick<BankAccount, "balanceVerifiedAt">,
  now = new Date(),
): VerificationStatus {
  if (!account.balanceVerifiedAt) return { state: "never", days: null };
  const days = Math.floor(
    (now.getTime() - new Date(account.balanceVerifiedAt).getTime()) / 86_400_000,
  );
  return { state: days > BALANCE_STALE_AFTER_DAYS ? "stale" : "verified", days };
}

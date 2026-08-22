import { describe, expect, it } from "vitest";
import {
  BALANCE_STALE_AFTER_DAYS,
  verificationStatus,
  withCorrectedBalance,
} from "./account-verification";
import type { BankAccount } from "./types";

const NOW = new Date(2026, 7, 23, 12, 0);

function account(over: Partial<BankAccount> = {}): BankAccount {
  return {
    id: "bob",
    bankName: "Bank of Baroda",
    accountType: "Savings",
    balance: 18_188,
    status: "active",
    ...over,
  };
}

describe("withCorrectedBalance", () => {
  it("sets the balance and stamps when it was confirmed", () => {
    const corrected = withCorrectedBalance(account(), 6_116.95, "statement", NOW);

    expect(corrected.balance).toBe(6_116.95);
    expect(corrected.balanceVerifiedAt).toBe(NOW.toISOString());
  });

  it("records the delta as a signed adjustment, so history explains the change", () => {
    const corrected = withCorrectedBalance(account(), 6_116.95, "statement", NOW);

    expect(corrected.adjustments).toHaveLength(1);
    expect(corrected.adjustments![0].amount).toBeCloseTo(-12_071.05, 2);
    expect(corrected.adjustments![0].note).toBe("statement");
    expect(corrected.adjustments![0].date).toBe(NOW.toISOString());
  });

  it("confirming an unchanged balance stamps but writes no adjustment", () => {
    const corrected = withCorrectedBalance(account({ balance: 6_470 }), 6_470, "checked", NOW);

    expect(corrected.balanceVerifiedAt).toBe(NOW.toISOString());
    expect(corrected.adjustments ?? []).toHaveLength(0);
  });

  it("keeps newest corrections first and does not grow without bound", () => {
    let current = account({ balance: 0 });
    for (let i = 1; i <= 40; i++) {
      current = withCorrectedBalance(current, i * 10, `fix ${i}`, NOW);
    }

    expect(current.adjustments!.length).toBeLessThanOrEqual(24);
    expect(current.adjustments![0].note).toBe("fix 40");
  });

  it("treats a sub-paisa difference as unchanged rather than logging noise", () => {
    const corrected = withCorrectedBalance(account({ balance: 100 }), 100.001, "check", NOW);
    expect(corrected.adjustments ?? []).toHaveLength(0);
  });
});

describe("verificationStatus", () => {
  it("reports an account whose balance was never confirmed", () => {
    expect(verificationStatus(account(), NOW)).toEqual({ state: "never", days: null });
  });

  it("reports a fresh confirmation with its age", () => {
    const acc = account({ balanceVerifiedAt: new Date(2026, 7, 20, 9, 0).toISOString() });
    expect(verificationStatus(acc, NOW)).toEqual({ state: "verified", days: 3 });
  });

  it("turns stale after the threshold", () => {
    const acc = account({
      balanceVerifiedAt: new Date(2026, 6, 1, 9, 0).toISOString(),
    });
    const status = verificationStatus(acc, NOW);

    expect(status.state).toBe("stale");
    expect(status.days).toBeGreaterThan(BALANCE_STALE_AFTER_DAYS);
  });
});

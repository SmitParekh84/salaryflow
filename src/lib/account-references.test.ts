import { describe, expect, it } from "vitest";
import { fundingAccount } from "./account-references";
import type { BankAccount } from "./types";

const bob: BankAccount = {
  id: "acc_bob",
  bankName: "Bank of Baroda",
  accountType: "Savings",
  balance: 22_843,
  status: "active",
};

const accounts = [bob];

describe("fundingAccount", () => {
  it("resolves an account the record is linked to", () => {
    expect(fundingAccount("acc_bob", accounts)).toEqual({ status: "linked", account: bob });
  });

  it("reports a record that was never linked to an account", () => {
    // The six SIP bills were saved with "No account selected". Paying them
    // recorded the expense and moved no balance, and nothing said so.
    expect(fundingAccount(undefined, accounts)).toEqual({ status: "unlinked" });
    expect(fundingAccount("", accounts)).toEqual({ status: "unlinked" });
  });

  it("separates a link to a deleted account from never having linked one", () => {
    // Both leave the balance untouched, but only this one means data is broken.
    expect(fundingAccount("acc_gone", accounts)).toEqual({
      status: "missing",
      accountId: "acc_gone",
    });
  });

  it("reports unlinked rather than missing when there are no accounts at all", () => {
    expect(fundingAccount(undefined, [])).toEqual({ status: "unlinked" });
  });
});

import { describe, expect, it } from "vitest";
import { accessDecision, displayApprovalStatus } from "./approval";

/**
 * The whole point of these tests is the "absent means approved" case.
 *
 * `approvalStatus` was added to a schema that already had users, with no default
 * and no backfill, so every pre-existing account reads back `undefined`. If this
 * rule is ever inverted to "only an explicit approved may sign in", the app keeps
 * compiling, every test about pending and rejected still passes, and the entire
 * existing user base — admins included — is locked out on deploy. That failure is
 * invisible to types and to any test that only exercises the new states, so it
 * gets explicit coverage here.
 */

describe("accessDecision", () => {
  it("blocks a pending account", () => {
    const decision = accessDecision("pending");
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.status).toBe("pending");
    expect(decision.message).toMatch(/waiting for approval/i);
  });

  it("blocks a rejected account", () => {
    const decision = accessDecision("rejected");
    expect(decision.allowed).toBe(false);
    if (decision.allowed) return;
    expect(decision.status).toBe("rejected");
  });

  it("does not reveal in the rejected message that a decision was made about them", () => {
    const decision = accessDecision("rejected");
    if (decision.allowed) throw new Error("expected rejected to be blocked");
    expect(decision.message).not.toMatch(/reject/i);
    expect(decision.message).not.toMatch(/approv/i);
  });

  it("allows an approved account", () => {
    expect(accessDecision("approved")).toEqual({ allowed: true });
  });

  // The regression tests. Every one of these is an account that existed before
  // approvals did.
  it.each([
    ["undefined", undefined],
    ["null", null],
    ["empty string", ""],
    ["an unrecognised value", "whatever"],
  ])("allows an account whose status is %s", (_label, status) => {
    expect(accessDecision(status)).toEqual({ allowed: true });
  });
});

describe("displayApprovalStatus", () => {
  it("passes through the two blocking states", () => {
    expect(displayApprovalStatus("pending")).toBe("pending");
    expect(displayApprovalStatus("rejected")).toBe("rejected");
  });

  it("collapses anything else to approved, so the console never renders undefined", () => {
    expect(displayApprovalStatus("approved")).toBe("approved");
    expect(displayApprovalStatus(undefined)).toBe("approved");
    expect(displayApprovalStatus(null)).toBe("approved");
  });

  it("agrees with accessDecision on every input", () => {
    for (const status of ["pending", "rejected", "approved", undefined, null, "", "legacy"]) {
      const blocked = !accessDecision(status).allowed;
      expect(displayApprovalStatus(status) !== "approved").toBe(blocked);
    }
  });
});

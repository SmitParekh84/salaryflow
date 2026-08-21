/**
 * Whether an account is allowed to sign in.
 *
 * One module, because the rule is subtle in exactly one way and every caller has
 * to get it right: **an account with no stored status is approved.**
 *
 * `approvalStatus` was added after the app had users, deliberately without a
 * schema default and without a backfill (see the field comment in
 * `server/models.ts`). Mongoose applies defaults on create, never retroactively,
 * so every account that predates approvals reads back `undefined` — and the
 * admins who would have to approve everyone are among them. Blocking anything
 * that is not explicitly `"approved"` would lock out the entire existing user
 * base the moment it deployed.
 *
 * So the rule is stated the safe way round: only an explicit `"pending"` or
 * `"rejected"` denies. Anything else — a missing field, a legacy row, a value
 * some future migration has not normalised yet — is allowed. Getting this
 * backwards fails closed on real users, which is why it lives here with a test
 * rather than being re-typed at each call site.
 */

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; status: "pending" | "rejected"; message: string };

/**
 * User-facing copy for a blocked sign-in.
 *
 * Pending says what is happening and that it needs nothing from them. Rejected
 * is deliberately vaguer: the decision is final, so there is no next step to
 * describe, and the detail belongs in the email rather than on a login form.
 */
const MESSAGES = {
  pending: "Your account is waiting for approval. We'll email you once it is approved.",
  rejected: "This account cannot be accessed.",
} as const;

export function accessDecision(status: unknown): AccessDecision {
  if (status === "pending") return { allowed: false, status: "pending", message: MESSAGES.pending };
  if (status === "rejected") {
    return { allowed: false, status: "rejected", message: MESSAGES.rejected };
  }
  return { allowed: true };
}

/**
 * The stored value as the console should display it, collapsing "no value" to
 * `"approved"` so the UI never has to decide what `undefined` means.
 */
export function displayApprovalStatus(status: unknown): ApprovalStatus {
  if (status === "pending" || status === "rejected") return status;
  return "approved";
}

# Signup approval gate, approval emails, and the profile section

- **Date**: 21 Aug 2026
- **Status**: approved, implementing

Three pieces, approved as one design:

1. Signup creates a **pending** account. An admin approves or rejects it. Only an
   approved account can sign in.
2. Three new transactional emails: approval, rejection, and a new-signup alert to
   the admins.
3. The `/settings` **Profile** section is redesigned and extracted out of
   `settings-view.tsx`.

## 1. Data model

`UserSchema` gains:

| field | type | notes |
| --- | --- | --- |
| `approvalStatus` | `"pending" \| "approved" \| "rejected"` | indexed, **no default** |
| `approvalDecidedAt` | `Date` | when an admin decided |
| `approvalDecidedBy` | `String` | deciding admin's user id |

**`approvalStatus` deliberately has no schema default, and there is no
migration.** Mongoose applies defaults when a document is created, not
retroactively, so every user that already exists reads back `undefined`. The gate
therefore blocks only an *explicit* `"pending"` or `"rejected"`; an absent field
means approved.

This is the whole safety property of the change: deploying it cannot lock out a
single existing account, including the admins who would otherwise have to approve
themselves. A `default: "pending"` is the trap — it looks harmless, does nothing
to existing rows, and then any read path that treats `undefined` as pending locks
everyone out at once. The codebase already reads `onboardingCompleted` the same
defensive way.

`AdminAuditSchema.action` gains `"approve"` and `"reject"` to its enum.

## 2. Signup stops signing you in

`POST /api/auth/verify-register` currently mints a JWT and sets the session
cookie the moment the OTP checks out. It becomes:

- create the user with `approvalStatus: "pending"`
- set **no** cookie and sign **no** token
- respond `201 { data: { status: "pending", email } }`
- fire-and-forget the admin alert email

The OTP step stays. A working address is a prerequisite, not a formality: the
approval decision is delivered by email, so an unverified address means an
approval nobody ever receives.

The admin alert is fire-and-forget on purpose. A dead mail provider must not fail
a signup — the same tolerance `sendOtpEmail` failures already get.

`useAuth.register` stops calling `setUser` and redirecting to `/onboarding`, and
sends the browser to `/pending` instead.

## 3. Login gate

In `POST /api/auth/login`, after the password is verified and before the token is
signed:

- `pending` → `403` "Your account is waiting for approval."
- `rejected` → `403`, deliberately vaguer.

**Placed after password verification, not before.** Checking first would turn the
endpoint into an account-existence oracle: an attacker could tell a real pending
address from an unknown one without a password. The existing rate limits already
cover the route.

Not touched:

- the demo login, which mints its own token and never goes through this route
- `POST /api/admin/login`

## 4. Admin console

`GET /api/admin/users` additionally returns each user's `approvalStatus` and a
`pendingUsers` count.

Approve/reject lands in a **new** `PATCH /api/admin/users/[id]/approval` rather
than being folded into the existing `PUT`, whose `{ isAdmin: boolean }` schema is
clean and worth keeping that way.

The route:

- approve → `approved`, stamp `approvalDecidedAt`/`By`, audit `"approve"`, send the approval email
- reject → `rejected`, same stamps, audit `"reject"`, send the rejection email,
  **and bump `sessionVersion`**

The `sessionVersion` bump is what makes rejection real. `getCurrentUser`
validates the `sv` claim against the stored value, so incrementing it invalidates
every live session — without it, a user who was approved, signed in, and then
rejected keeps working until their cookie expires.

UI: a `Pending` filter tab with a count badge, and Approve/Reject actions on
pending rows.

## 5. Emails

`mail.ts` has its Resend call and error handling inlined inside `sendOtpEmail`.
Extract a shared private `send()` so all four senders share one implementation;
`getMailConfig()` is already factored out and stays as-is.

`layout.ts` gains `renderButton()`. It has no button primitive today because the
OTP email deliberately has none — there is nothing to click when the payload is
six digits you retype. The approval and admin emails do have somewhere to go, so
they get one bulletproof table-based button between them rather than two
hand-rolled ones.

Three new templates in `src/server/emails/`, all on the existing `renderShell`:

| file | to | shape |
| --- | --- | --- |
| `approval-email.ts` | the user | one peak: a CTA to `/login` |
| `rejection-email.ts` | the user | short, no CTA, no reason given |
| `admin-signup-email.ts` | every admin | the new address + a CTA to `/admin` |

## 6. Profile section

Extract the `section === "profile"` block out of the 1292-line
`settings-view.tsx` into `src/features/settings/profile-section.tsx`, restructured
as:

1. **Identity** — avatar picker, name, email
2. **Security** — change password, sign out — **moved in from the System section**
3. **About you** — the existing `AboutYouForm`, as a designed section rather than
   something appended after a bare `<div>` divider

The System section keeps appearance, export and recycle bin, and loses change
password and sign out. Grouping identity with the actions that act on that
identity is the point; those two living under "System" is why the section needed
rethinking at all.

Behaviour is unchanged — this moves and restyles, it does not add or remove a
capability.

## 7. Testing

Vitest, following the existing suite.

- **Login gate**: `pending` → 403, `rejected` → 403, `approved` → 200, and
  **field absent → 200**. The last one is the regression test for the
  no-migration guarantee and is the most important test here.
- **verify-register**: creates `pending`, sets no cookie, returns 201.
- **Approval route**: both transitions, audit rows written, `sessionVersion`
  bumped on reject only, non-admin → 403.
- **Templates**: subject/text/html render for all three.

## Risks

- `/pending` must not be a dead end. It gets a plain "we will email you" state
  and a way back to the marketing site, not a bare sentence.
- The admin alert email goes to every admin on every signup. Fine at current
  volume; if signups ever get noisy this wants batching, which is explicitly out
  of scope now.

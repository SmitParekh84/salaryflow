# Aartha rebrand, input quality, and validation layer

Date: 2026-08-11
Status: Implemented, with the exceptions recorded under "Not done".

## Corrections found during implementation

Two audit findings were wrong as written. Recorded here rather than quietly
adjusted:

- **Finding E overstated the accounts view.** `saveCard` already clamped the
  statement day to 1-31 (`accounts-view.tsx:189`), and `saveTransfer` already
  guarded both the goal-versus-transfer amount and the same-account case. A
  statement day of 99 was never storable there. The genuine unbounded case was
  the rules view, which had no clamp at all and could store a 500% share. The
  accounts clamp was still changed to a visible validation error, because
  silently rewriting a number the user typed conflicts with the product rule
  against inferring financial values.
- **Finding H mis-framed the footer.** The landing page fixes its own palette
  (`--ink`, no dark-scheme branch), so its hardcoded footer colours were
  consistent with a deliberately theme-independent marketing page, not an
  oversight. Making only the footer theme-reactive would have rendered a dark
  footer beneath a permanently light hero. The rebuilt footer therefore keeps
  the landing palette instead of adopting app tokens.

A third detail: the budget rule is a **four**-bucket split (needs, wants,
savings, investments), not three as first specified.

## Goal

Rebrand Spendly to Aartha (domain `aartha.app`), replace the two weakest input
patterns in the app (single-field OTP, raw `type="number"` money fields), and
make Zod the single source of validation truth shared by API routes and client
forms.

## Scope

One pass covering six areas. The UI audit is bounded to the findings listed in
section 6 — it is not an open-ended sweep.

---

## 1. Rebrand

Product name is **Aartha**. The domain `aartha.app` appears only in URLs,
metadata, the email from-address, and the footer — never in body copy.

Brandline, two tiers:

- Full: `Know what's safe to spend today.` — hero, `<title>`, manifest,
  email footer.
- Short: `Know what's safe to spend.` — the `Brand` component's `tagline` slot
  renders at 10px with `truncate` (`src/components/brand.tsx:63`), so the full
  line clips. Replaces the current `Spend with clarity.`

109 occurrences across 36 files. Four need judgment rather than substitution:

| File | Requirement |
| --- | --- |
| `public/sw.js` | Cache name is brand-derived. Bump the cache version key in the same change, or stale caches keep serving old branding. |
| `.env.example` | `MONGODB_URI` database segment `spendly` -> `aartha`. Do **not** modify `.env.local`; renaming a live database points the app at an empty one. |
| `src/server/mail.ts:15` | `DEFAULT_FROM` is `Spendly <noreply@smitparekh.co.in>`. `aartha.app` must be verified in Resend before the sender flips. Parameterize the value; leave the cutover to the operator. |
| `package.json` | `"name": "spendly"` -> `"aartha"`. Safe, but it is the pnpm workspace name. |

`src/lib/finance.test.ts` and `src/server/sync-merge.test.ts` hits are string
fixtures only.

## 2. Footer

New `src/components/site-footer.tsx` replaces the inline footer at
`src/features/landing/landing-hero.tsx:696-705`.

The current footer hardcodes `background: #071d38; color: #fff`
(`src/features/landing/landing.module.css:1185-1209`) and therefore ignores the
theme system. The replacement is built on existing surface tokens so dark mode
works.

Contents: brand lockup with short brandline, three link groups
(Product / Company / Legal), `aartha.app`, copyright line.

Placement: landing and public pages only. Not the authenticated app shell — a
footer beneath a PWA dashboard is noise.

## 3. OtpInput

`src/components/ui/otp-input.tsx`

Six real `<input>` elements, each `maxLength=1`, `inputMode="numeric"`,
`pattern="[0-9]*"`. That combination is what raises the numeric keypad on
mobile. `autoComplete="one-time-code"` is set on the first box only so iOS Mail
autofill lands in the right place.

Behaviour:

- Auto-advance on entry; Backspace on an empty box steps focus back.
- Left/Right arrow keys move between boxes.
- Pasting a 6-digit code into any box fills all six.
- Optional auto-submit when the last digit lands.

Interface: `{ length?: number; value: string; onChange: (v: string) => void;
onComplete?: (v: string) => void; disabled?: boolean; autoFocus?: boolean }`.
Value stays a single string so callers are unchanged in shape.

Consumers: `src/features/auth/auth-page.tsx:695` and the forgot-password flow.

## 4. AmountInput

`src/components/ui/amount-input.tsx`

`type="text"` with `inputMode="decimal"`. This raises the numeric keypad while
avoiding `type="number"`'s defects: scroll-wheel mutation of a focused field, no
thousands separators, and locale-dependent decimal handling.

One component covers both money and integer fields via props — no second
component.

Interface: `{ value: string; onChange: (v: string) => void; decimals?: 0 | 2;
min?: number; max?: number; prefix?: string; ... }` plus standard input props.

Behaviour:

- Accepts digits and at most one decimal separator; other characters are
  rejected on input.
- Indian lakh/crore grouping applied on blur, raw value shown while focused.
- Optional currency adornment.
- Holds a **string**. Empty string and `"0"` are distinct states. Zod coerces to
  number on submit, matching the contract already used by
  `src/features/expenses/expense-form.tsx:93`.

## 5. Validation layer

New `src/lib/schemas/` with one module per domain: `auth`, `expense`, `bill`,
`account`, `goal`, `investment`, `salary`, `rule`.

Each schema is defined once and imported by both the API route and the client
form. Today roughly 18 API routes each redefine their own schema, and only
`expense-form.tsx` validates on the client.

The seven raw-`useState` views migrate to `react-hook-form` + `zodResolver`,
following the pattern already working in `expense-form.tsx`. No new library and
no new pattern is introduced. Inline field errors are added to these views,
which currently display none.

Views to migrate: accounts, bills, goals, investments, onboarding, rules,
settings.

## 6. UI and mobile findings

Derived from reading 12 view files, `src/app/layout.tsx`,
`src/components/ui/input.tsx`, and `landing.module.css`. This list is scoped to
those files; it is not a guarantee about every screen in the app.

| # | Finding | Location |
| --- | --- | --- |
| A | `maximumScale: 1` blocks pinch-zoom. WCAG 2.1 AA 1.4.4 failure. | `src/app/layout.tsx:42` |
| B | Inputs render at 14px, so iOS Safari auto-zooms on focus. | `src/components/ui/input.tsx:15` |
| C | Scroll wheel over a focused number field silently changes a money value. | all 36 `type="number"` sites |
| D | `value={form.amount \|\| ""}` renders a real `0` as blank, and `Number("")` returns `0`, writing a silent zero. | `bills-view.tsx:268`, `accounts-view.tsx:698`, `settings-view.tsx:332`, `investments-view.tsx:188`, and 8 more |
| E | `min`/`max` are advisory only; `Number()` bypasses them. `statementDay` accepts 99, rule percentage accepts 500. | `accounts-view.tsx:928-933`, `rules-view.tsx:288-293` |
| F | `<Label>` without `htmlFor`/`id`: not screen-reader associated, and tapping the label does not focus the field. | `bills-view.tsx:265`, `investments-view.tsx:185,193,202` |
| G | `updateProfile` fires on every keystroke, persisting partial values mid-typing. | `settings-view.tsx:333` |
| H | Footer hardcodes hex colours and ignores dark mode. | `landing.module.css:1185-1209` |
| I | OTP is a single wide input. | `auth-page.tsx:695` |

D and E are correctness bugs rather than polish: both can write wrong numbers
into a finance app. A and B are accessibility failures. The rest are quality.

Fixes: A and B are direct edits. C, D, E are resolved by `AmountInput` plus the
schema layer. F is fixed during the view migrations. H is fixed by
`SiteFooter`. I is fixed by `OtpInput`.

## Testing

`vitest` is already configured (`vitest.config.mts`).

- `AmountInput`: parse/format round-trip, decimal clamping, empty-vs-zero
  distinction, min/max rejection.
- `OtpInput`: paste handling, auto-advance, Backspace stepping, arrow keys.
- Schemas: boundary cases per domain, especially `statementDay` (1-31), rule
  percentages (0-100), and non-negative amounts.

## Not done

Views still holding money as numbers behind `type="number"`. Each needs the
same string-draft plus schema treatment applied elsewhere:

- **Accounts transfer form** — `amount` and `goalAmount` feed interlocking
  clamp logic at four call sites (`accounts-view.tsx` 772, 799, 824, 856).
  Worth migrating on its own rather than as a rider.
- `goals-view.tsx` (2 fields), `allocation-sheet.tsx` (2),
  `funding-plan-view.tsx` (1), `salary-history/page.tsx` (1).
- `expense-form.tsx` (7) already validates through `react-hook-form` +
  `zodResolver`, so it needs only the `AmountInput` swap, not a validation
  change.

Also outstanding: the ~18 API routes still define their own schemas rather than
importing from `src/lib/schemas`. The shared module exists and the client forms
use it; pointing the routes at it is a mechanical follow-up.

## Out of scope

- Visual redesign beyond the footer.
- Changing the Resend sending domain (operator step).
- Renaming an existing production database.
- Screens not listed in section 6.

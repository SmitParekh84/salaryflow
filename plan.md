# Spendly — Build Plan

Premium salary-cycle PWA. Next.js 16 (App Router, Turbopack), React 19, TS, Tailwind v4,
Zustand (persisted), Framer Motion, Recharts, next-themes, RHF+Zod, Lucide.

## UI system decision

Use **shadcn/ui** as the source-owned component system and keep Spendly's existing color,
spacing, typography, and radius tokens. Add components selectively through the shadcn CLI; do
not replace the app with a stock shadcn theme or add a second full design system.

- **Behavior layer:** Prefer shadcn components backed by Radix primitives for accessible keyboard
  behavior, focus management, portals, and ARIA semantics.
- **Icons:** Use `lucide-react` for all general interface icons. Do not mix icon libraries or add
  custom SVGs when a suitable Lucide icon exists. Keep icon sizes consistent: 16px in controls,
  20px in navigation, and larger icons only for intentional empty states or metrics.
- **Forms:** Feature code must use shared UI components instead of raw `<select>` or
  `<input type="checkbox">` elements. Standardize on `Select`, `Checkbox`, `RadioGroup`, `Switch`,
  `Input`, `Textarea`, `Label`, and form validation/error patterns.
- **Overlays:** Standardize menus and overlays on `DropdownMenu`, `Dialog`, `AlertDialog`,
  `Popover`, `Tooltip`, and `Command`. Portalled components prevent clipping and provide reliable
  keyboard and screen-reader behavior.
- **Feedback:** Use shared `Toast`/`Sonner`, `Skeleton`, `Progress`, `Badge`, and `EmptyState`
  components. Destructive actions use `AlertDialog`; binary preferences use `Switch`; multi-select
  choices use `Checkbox`.
- **Composition:** Import primitives only from `@/components/ui/*`. Feature folders may compose
  primitives but must not create a second button, select, checkbox, dialog, or dropdown style.
- **Accessibility:** Every control needs a visible label or accessible name, visible focus state,
  disabled state, keyboard support, and an error state where validation applies.

### Incremental migration order

Status: this remains an incremental backlog, not a prerequisite for the shipped product. Spendly
currently uses source-owned shared components, with Radix-backed `Dialog`, `AlertDialog`, menus,
popover, progress, select, and checkbox behavior where implemented. The remaining migration work is
to standardize `Switch`, `Tooltip`, `Sonner`, `Command`, and remaining native control call sites.

1. Initialize shadcn for the existing Tailwind v4 token system without resetting `globals.css`.
2. Add `Checkbox`, `Select`, `DropdownMenu`, `Dialog`, `AlertDialog`, `Switch`, `Tooltip`, and
   `Sonner` first.
3. Replace raw checkboxes in login, accounts, and expense forms with the shared `Checkbox`.
4. Replace the native `Select` wrapper and feature selects with shadcn `Select`; preserve React
   Hook Form integration and existing values.
5. Replace the custom modal with `Dialog`/`AlertDialog`, including focus trapping and destructive
   confirmation behavior.
6. Audit buttons and icon-only actions for consistent Lucide icons, sizes, labels, and tooltips.
7. Verify each migrated control on keyboard, mobile, light theme, and dark theme before moving to
   the next component family.

## Architecture (feature-based)

- src/lib: types, utils, calculations (safe-to-spend), currency, seed data, store (zustand)
- src/components/ui: reusable primitives (Card, Button, Progress, Badge, Input, Modal, Skeleton)
- src/components: shared shell (Sidebar, TopBar, ThemeToggle, StatCard, EmptyState)
- src/features: dashboard, expenses, goals, bills, investments, analytics, settings
- src/app: landing (/), onboarding, (app)/dashboard|expenses|goals|bills|investments|analytics|settings
- API + Mongoose models available for persistence (Mongo cluster via env)

## Core feature

Safe To Spend = remaining balance / remaining days until salary. Color-coded green/yellow/red.

## AI integration plan

Use Gemini only through authenticated Next.js server routes. Store `GEMINI_API_KEY` in local and
Vercel environment variables; never expose it through `NEXT_PUBLIC_*`, client code, logs, or the
database. The existing reference API at `smitparekh-api` demonstrates REST calls, model fallback,
rate-limit cooldowns, and bounded inputs. Spendly should reuse those patterns, but use the
correctly spelled environment variable and finance-specific validation.

### Recommended AI features

1. **Receipt and bill extraction:** Upload or photograph a receipt, resize it in the browser, and
   send it to `/api/ai/receipt`. Gemini Vision returns strict JSON for merchant, date, total,
   category, payment method, line items, and confidence. Validate with Zod, show an editable
   preview, and create the expense only after explicit confirmation.
2. **Monthly financial coach:** Explain four-bucket progress, unusual category changes, upcoming
   bills, and goal tradeoffs using server-computed aggregates. AI may recommend actions but must
   never move balances, mark bills paid, activate rules, or save expenses automatically.
3. **Expense categorization:** Suggest a category and merchant normalization when a user types a
   description. Keep deterministic mappings first and use AI only for ambiguous entries.
4. **Goal planning:** Compare deadlines against the cash-savings bucket and propose contribution
   splits. Recommendations must preserve the active rule total and clearly identify assumptions.
5. **Natural-language insights:** Answer questions such as “Why did safe-to-spend fall?” from a
   minimal, redacted monthly summary rather than sending complete transaction or account records.

### Receipt flow and deployment constraints

- Accept JPEG, PNG, or WebP only; reject unsupported content and client-resize to about 2–3 MB.
- Do not permanently store receipt images for extraction-only use. If receipt history is later
  required, add dedicated object storage with signed URLs and retention controls.
- Vercel Hobby can run this as a serverless route without purchasing a separate Vercel service.
  Gemini free-tier quotas and Vercel request-size/runtime limits still apply and can change.
- For reliable free deployment, compress before upload, process one image per request, add per-user
  rate limits, enforce a timeout, and return a retryable error when Gemini is unavailable.
- Treat extracted data as untrusted input. Validate amounts and dates, reject prompt instructions
  found inside images, avoid logging financial contents, and require user confirmation before sync.
- Add usage metering before enabling AI broadly. Paid Gemini or external image storage is only
  needed if free-tier quotas, image retention, or production traffic outgrow the free limits.

## Milestones

1. [x] Scaffold + deps
2. [x] Design system foundation (tokens, dark mode, shared primitives, Lucide icon standard)
3. [x] Types + calculations + store + seed
4. [ ] Complete UI primitive migration (`Switch`, `Tooltip`, `Sonner`, `Command`, remaining native controls)
5. [x] App shell (sidebar/topbar/theme)
6. [x] Onboarding flow
7. [x] Dashboard
8. [x] Expenses / Goals / Bills / Investments / Analytics / Settings
9. [x] PWA (manifest + SW + icons)
10. [x] Build + verify

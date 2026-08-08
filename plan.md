# SalaryFlow — Build Plan

Premium salary-cycle PWA. Next.js 16 (App Router, Turbopack), React 19, TS, Tailwind v4,
Zustand (persisted), Framer Motion, Recharts, next-themes, RHF+Zod, Lucide.

## UI system decision

Use **shadcn/ui** as the source-owned component system and keep SalaryFlow's existing color,
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

## Milestones
1. [x] Scaffold + deps
2. [ ] Design system (tokens, dark mode, shadcn primitives, Lucide icon standard)
3. [ ] Types + calculations + store + seed
4. [ ] UI primitives (migrate native selects, checkboxes, menus, dialogs, and feedback)
5. [ ] App shell (sidebar/topbar/theme)
6. [ ] Onboarding flow
7. [ ] Dashboard
8. [ ] Expenses / Goals / Bills / Investments / Analytics / Settings
9. [ ] PWA (manifest + SW + icons)
10. [ ] Build + verify

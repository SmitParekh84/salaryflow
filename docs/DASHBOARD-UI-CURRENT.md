# Current Dashboard UI — as-built reference

A written snapshot of what the Aartha dashboard looks like today, detailed enough
to hand to an image model (or a designer) as the "before" for a redesign.

Source files:

- `src/app/(app)/dashboard/page.tsx` — route, title only
- `src/features/dashboard/dashboard-view.tsx` — the whole page composition
- `src/features/dashboard/safe-to-spend-hero.tsx` — hero card
- `src/components/stat-card.tsx`, `src/components/ui/card.tsx` — primitives
- `src/components/app-layout-client.tsx`, `sidebar.tsx`, `topbar.tsx` — app shell
- `src/app/globals.css` — design tokens (two layers: palette → semantic)

---

## 1. App shell

Product name: **Aartha** — a personal salary / cash-flow app. Currency defaults to
INR (`₹`), Indian financial-year framing.

**Desktop (≥1024px)**

- Fixed left sidebar, `w-64` (256px), translucent `bg-surface/60` with
  `backdrop-blur-xl`, hairline right border, 16px horizontal / 24px vertical padding.
  - Brand mark (cyan ribbon logo + "Aartha" wordmark) at top, 32px gap below.
  - Vertical nav, 4px gaps, each row: 18px lucide icon + label, rounded pill,
    hover `bg-surface-2`. Active row = primary-tinted background plus a 4×20px
    cyan bar pinned flush to the left edge.
  - Nav order: Dashboard, Salary plan, Accounts, Expenses, Shared spending, Bills,
    Goals, Investments, Analytics, Assistant, Settings.
  - Bottom: a small "Pro tip 💡" card on `bg-surface-2/50`, no shadow.
- Content column offset by `lg:pl-64`, centered `max-w-6xl`, 32px side padding.

**Top bar** — sticky, `bg-background/70` + `backdrop-blur-xl`, bottom hairline.
Left: hamburger (mobile only) / back arrow when deep-linked, then the page title
(`text-lg font-semibold tracking-tight`) — here "Dashboard". Right cluster:
a ghost "Search… ⌘K" button, bell icon with a red count badge, theme toggle, and
a circular avatar with a cyan→cyan/60 gradient and bold initials.

**Mobile** — sidebar becomes a hamburger drawer (`w-72`) plus a bottom tab bar:
5 pinned tabs + "More", 64px tall + safe-area inset, `bg-surface/95` blurred, icon
over a 10px label, active tab marked by a 2px cyan bar along the *top* edge.

## 2. Dashboard page composition (top → bottom, 24px vertical rhythm)

1. **Greeting row** — left: "Welcome back 👋" (`text-sm text-muted`, waving-hand
   lucide icon) with "N days until your next salary" beneath in `text-xs`.
   Right: a primary **+ Add** button opening a dropdown (Expense / Save to goal /
   Transfer money).

2. **Catch-up card** *(conditional)* — only when expense days are unlogged.

3. **Safe-to-spend hero** — the visual anchor. Glass card (`--glass`,
   `rounded-2xl`), 24–32px padding, two columns on ≥640px.
   - Left: eyebrow "SAFE TO SPEND TODAY" (uppercase, tracked, muted), then the
     amount at `text-5xl`/`text-6xl` bold, **colored by status** — green on track,
     amber watch pace, red overspending. Below it a row of pills: a status pill
     tinted 15% of the status color with a trend arrow ("You're on track"), an
     optional "✓ Using confirmed salary" pill, and a primary-tinted pill reading
     "₹X cash + ₹Y investments protected".
   - Right: two stacked stats — "Days to salary" (calendar icon) and
     "Balance left", each `text-2xl` bold over a muted label.
   - Bottom: a 10px-tall progress bar in the status color, captioned
     "Spent today ₹…" (left) / "Daily budget ₹…" (right).

4. **Four stat tiles** — one seamless block: a `rounded-2xl` grid with `gap-px`
   over `bg-border`, so the tiles read as panes divided by hairlines rather than
   separate cards. 4-up desktop, 2-up tablet, stacked mobile. Each tile: a 40px
   rounded-xl icon chip tinted 15% of its accent, then muted label, `text-2xl`
   bold value, and an 11px muted hint. They fade + rise in with a 50ms stagger.
   - Invested this cycle (cyan, TrendingUp) — "Target ₹…"
   - Total spent (orange, Receipt) — "Includes card purchases · Fixed ₹…"
   - Cash saved this cycle (green, PiggyBank) — "Target ₹… · net savings activity"
   - Health score `NN/100` (purple, HeartPulse) — Excellent / Good / Fair / Needs work

5. **Salary-day funding plan** — single-row card: cyan icon chip + title +
   subtitle "Cards, bills, SIPs, and your active savings rule" on the left; the
   total in `text-xl` bold and a "View transfers" link on the right.

6. **Budget rule card** *(conditional)* — same header shape, right side shows
   `NN/100` over a tiny "adherence" caption plus a "View rule" link. A full-width
   progress bar beneath. Then, above a top border, a 4-up sub-grid for Needs /
   Wants / Cash savings / Investments — each with label, "₹X limit", the used
   amount in `text-lg` bold, "Spent this cycle", and a green "₹N remaining" or
   red "₹N over" line.

7. **Cash flow chart** — full-width card, title "Cash flow · FY 2026-27" with a
   muted subtitle. Grouped monthly bars: income (cyan) vs spending (orange).

8. **Two-column row (2:1)** — "Spending trend · 14 days" area/line chart with
   "₹X today" in the header, beside a "By category · this cycle" donut using the
   20-hue category palette. The donut is scoped to the current salary cycle and
   excludes investments, so its slices add up to the "Total spent" tile.

9. **Two-column row (2:1)** — "Recent transactions": six compact rows, each a
   colored category icon + merchant/note on the left, amount and date right.
   Empty state = receipt glyph, "No expenses yet", and an "Add expense" button.
   The right rail stacks:
   - **Fuel card** (conditional, mileage / ₹-per-km)
   - **Smart insights** — sparkle-icon header, up to 4 rows as `bg-surface-2/60`
     rounded-xl chips, each with an Activity glyph, sliding in from the left.
   - **Upcoming bills** — amber clock header, up to 3 rows: category icon + name,
     amount bold with the due date beneath. Empty = green check "No pending bills".
     The collapsed badge counts *all* pending bills, not just the three listed.

10. **Goals row (2-up)** — "Top goal · <name>" with the projected completion date
    in the header, the saved amount at `text-2xl` bold, "of ₹target" right-aligned,
    and a cyan progress bar. Beside it "Emergency fund" with "NN% funded" in green
    and a green progress bar.

Overlays: the expense form sheet and the goal-allocation sheet.

## 3. Visual language

- **Type**: Geist Sans (Geist Mono for numerics where used). Headings are small
  and dense — card titles are only `text-sm font-semibold`; the size jumps live in
  the *numbers* (`text-2xl` … `text-6xl` bold, tight tracking).
- **Shape**: `rounded-2xl` cards, `rounded-xl` inner chips, fully-round pills.
- **Depth**: very light — `0 1px 2px rgba(0,0,0,.04), 0 4px 8px rgba(0,0,0,.035)`
  and hairline borders (`rgba(60,60,67,.14)` light / `rgba(255,255,255,.09)` dark).
  Blur / translucency on the shell and the hero; flat surfaces everywhere else.
- **Color**: cyan brand ("flow ribbon"), navy ink, teal for protected money, lime
  as a sparse highlight.
  - Light: bg `#f3f7fa`, surface `#ffffff`, text `#152333`, muted `#607080`,
    primary `#087b99`, success `#078b6d`, warning `#d97706`, danger `#dc2626`.
  - Dark: elevation ramp `#151d29` → `#202a38` → `#2c3849`, text `#f4f8fb`,
    muted `#a4b5c6`, primary `#27bccd`.
  - Charts: income = primary cyan, expense = orange `#f97316`, savings = green,
    invest = amber, goal = purple. 20 fixed category hues.
- **Motion**: framer-motion — cards fade + rise 12px on an easeOutExpo curve with
  small staggers; insights slide in from the left; the hero amount re-animates
  when the value changes.
- **Density**: information-dense but airy — 16–20px card padding, 24px between
  sections, `text-xs` / `text-[11px]` for all supporting copy.

## 4. Honest read on what is weak (redesign starting points)

- Nine stacked full-width sections make the page long and flat; there is no clear
  second-tier hierarchy after the hero.
- Two "single row summary" cards (funding plan, budget rule) look nearly identical
  and compete for the same slot.
- Three separate progress-bar treatments (hero, budget rule, goals) with no shared
  gauge language.
- Charts use three different idioms (bars, area, donut) sitting adjacent.
- The right rail is a catch-all: fuel, insights and bills all share one column.
- Shadows and borders are so light that the grid can read as an undifferentiated
  wash.

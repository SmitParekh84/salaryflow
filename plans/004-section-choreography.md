# 004 — Choreograph every landing section (stagger, not a wall of fades)

> [!IMPORTANT]
> **DONE — do not run this plan.**
>
> The steps, features, compare, setup and FAQ containers are already
> `RevealGroup` / `RevealItem` in `main`. See [README.md](README.md) for the
> current state of the code and for what is actually left to do.

- **Status**: DONE
- **Commit**: 9e2004b
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens; Missed opportunities
- **Estimated scope**: 1 file, ~14 call sites

## Problem

Every group on the landing page is a set of independent `Reveal`s, each with its
own viewport trigger:

```tsx
/* src/features/landing/landing-hero.tsx — current, the steps grid */
<div className={styles.stepsGrid}>
  {[ … ].map(([number, title, copy, Icon]) => (
    <Reveal key={String(number)} className={styles.stepCard}>
```

Three cards side by side cross 15% of the viewport within a few pixels of each
other, so they fire near-simultaneously but not quite — the result is a shimmer of
almost-together fades rather than either a clean group entrance or a deliberate
sequence. The same pattern repeats in `featureGrid` (4 cards), `setupGrid` (3),
`privacyPoints`, `faqList` (every FAQ row) and the marketing pages' `.cards`
grids. A 30-80ms stagger is what turns this into a sequence.

Two other seams on this page:

- `balanceStory` (`.balanceCard` → `.commitmentStack` → `.storyArrow` →
  `.answerCard`) is an argument told left to right: bank balance, minus
  commitments, therefore this. It animates as one block, so the argument's order
  is lost.
- `cycleTrack` is a five-stop timeline ending on the highlighted `cycleToday`
  cell. It also animates as one block, so the timeline does not read as a
  progression.

## Target

Group entrances use `RevealGroup` / `RevealItem` from plan 001 (stagger
**60ms**, spring `{ type: "spring", duration: 0.5, bounce: 0.2 }`). Section
headings keep the plain `Reveal`. Per section, exactly:

| Section (class) | Wrapper | Children | Notes |
| --- | --- | --- | --- |
| `problemSection` `.balanceStory` | `RevealGroup` | `RevealItem` per card, stack, arrow, answer card | Left-to-right; DOM order already matches reading order |
| `#how-it-works` `.stepsGrid` | `RevealGroup` | `RevealItem` per step card | |
| `productSection` `.dashboardMockup` | keep `Reveal` | — | Single object; nothing to sequence |
| `#features` `.featureGrid` | `RevealGroup` | `RevealItem` per feature card | 4 cards × 60ms = 180ms tail, still under half a second |
| `calmSection` `.compareGrid` | `RevealGroup` | `RevealItem` per panel | Before, then after — the whole point is the order |
| `cycleSection` `.cycleTrack` | `RevealGroup` | `RevealItem` per stop | 5 stops, ends on `cycleToday` |
| `.allocationBoard` | keep `Reveal` | — | One board |
| `#waitlist` `.setupGrid` | `RevealGroup` | `RevealItem` per setup card | |
| `#privacy` `.privacyPoints` | `RevealGroup` | `RevealItem` per point row | |
| `#faq` `.faqList` | `RevealGroup` | `RevealItem` per `<details>` | |
| `finalCta` `.finalInner` | `RevealGroup` | `RevealItem` for copy, `RevealItem` for card | |

Marketing pages, same treatment on their card rows:
`src/features/marketing/about-view.tsx` (`.forGrid`, `landing.stepsGrid`),
`pricing-view.tsx` (`.cards`), `contact-view.tsx` (both `.cards`),
`waitlist-view.tsx` (`.cards`), `src/features/download/download-view.tsx`
(`.cards`).

## Repo conventions to follow

- `RevealGroup` and `RevealItem` are added by plan 001 in
  `src/features/landing/section.tsx`. **This plan depends on 001.**
- The wrapper must keep the grid class it replaces. Today the grid class sits on
  a plain `<div>` and each child `Reveal` carries the card class. After this
  change: `<RevealGroup className={styles.stepsGrid}>` and
  `<RevealItem className={styles.stepCard}>`. The DOM shape is unchanged — one
  wrapper element, one element per child, both still `div`s — so no CSS needs
  touching.
- Marketing views import styles as two namespaces: `landing` for
  `landing.module.css` and `styles` for `marketing-page.module.css`. Preserve
  whichever namespace each class already uses.

## Steps

1. In `src/features/landing/landing-hero.tsx`, import `RevealGroup` and
   `RevealItem` alongside the existing `Reveal, SectionHeading` from `./section`.

2. Work down the table in **Target** in order. For each row marked `RevealGroup`:
   replace the plain `<div className={styles.X}>` with
   `<RevealGroup className={styles.X}>`, and change each child `<Reveal
   className={styles.Y}>` to `<RevealItem className={styles.Y}>`. Where a child
   is currently a bare element rather than a `Reveal` (the `balanceStory` cards,
   the `cycleTrack` stops, the `faqList` rows), wrap each in `RevealItem` with the
   class it already has.

3. `balanceStory` special case: it is currently `<Reveal className={styles.balanceStory}>`
   with four bare children. Change the outer to `RevealGroup` with the same class
   and wrap each of the four children in `RevealItem`. The arrow
   (`<ArrowRight className={styles.storyArrow} />`) cannot take a className swap —
   wrap it: `<RevealItem><ArrowRight className={styles.storyArrow} /></RevealItem>`.
   Check in the browser that this extra wrapper does not break
   `.balanceStory`'s `grid-template-columns: 1fr 1.2fr auto 1fr`; if the arrow
   column collapses, give that `RevealItem` the class `styles.storyArrowCell` and
   add `.storyArrowCell { display: flex; align-items: center }` to
   `landing.module.css`.

4. `finalInner` special case: it is a two-column grid whose children are already
   two `Reveal`s. Swap the outer `<div className={styles.finalInner}>` to
   `RevealGroup` and the two children to `RevealItem`.

5. Repeat step 2 for the five marketing/download views listed in **Target**. Each
   has exactly one or two `.cards` grids with `Reveal` children.

6. Re-read the whole diff and confirm no `Reveal` remains **inside** a
   `RevealGroup`. A `Reveal` has its own trigger and would ignore the parent's
   stagger, which is the bug this plan exists to remove.

## Boundaries

- Do NOT change any grid, gap, padding, colour or copy.
- Do NOT add stagger to the hero (plan 003 owns it) or to `SectionHeading`.
- Do NOT stagger anything in the signed-in app (`src/features/dashboard/**`,
  `src/features/expenses/**`): those lists are seen dozens of times a day, where
  the correct amount of entrance animation is none.
- Do NOT raise the stagger above 80ms. Six items at 100ms is 600ms of waiting for
  the last card, which reads as jank, not choreography.
- Do NOT add dependencies.

## Verification

- **Mechanical**: `pnpm typecheck`, `pnpm lint`, `pnpm build` clean.
- **Feel check**: `pnpm dev`, scroll `/` slowly top to bottom:
  - Each card row enters left to right as one gesture, not as a scatter.
  - The balance story reads in argument order: balance, commitments, arrow,
    answer.
  - The cycle timeline finishes on the highlighted "Today" cell.
  - No row takes longer than about half a second from first to last card.
  - Buttons and links inside a staggering row are clickable **before** the row
    finishes animating (stagger must never gate interaction).
  - DevTools → Rendering → *prefers-reduced-motion: reduce*: rows fade in
    together with no stagger and no travel.
  - Scroll back up and down again: nothing re-animates.
- **Done when**: `grep -c "RevealItem" src/features/landing/landing-hero.tsx` is
  at least 20, and no `<Reveal ` appears between a `<RevealGroup` and its closing
  tag anywhere in the diff.

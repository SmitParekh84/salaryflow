# 005 — Animate the FAQ, the nav on scroll, and the ambient details

> [!IMPORTANT]
> **DONE — all three sections are in `main`. Do not run again.**
>
> B (nav on scroll) and C (ambient) shipped earlier. A (the FAQ accordion) is
> now done too: `src/features/landing/faq-accordion.tsx`. One deviation from
> section A as written — under reduced motion the height duration is 0 rather
> than 0.15s, because the Target above asks for "no height animation, opacity
> only" and the snippet's single `{ duration: 0.15 }` would have animated both.
> See [README.md](README.md) for the verification status of the whole set.

- **Status**: DONE
- **Commit**: 9e2004b
- **Severity**: MEDIUM (FAQ), LOW (nav, ambient)
- **Category**: Interruptibility; Missed opportunities
- **Estimated scope**: 3 files, ~110 lines

## Problem

**A. The FAQ teleports.** The accordion is a native `<details>`:

```tsx
/* src/features/landing/landing-hero.tsx — current, #faq */
<details open={index === 0}>
  <summary>
    {question}
    <ChevronDown />
  </summary>
  <p>{answer}</p>
</details>
```

`<details>` has no open/close animation, so the answer appears instantly and
everything below it jumps down by the answer's height. The only motion is the
chevron:

```css
/* src/features/landing/landing.module.css:1130 — current */
transition: transform .2s ease;
```

The one element that does animate uses the browser's weakest curve, and the
content it points at does not animate at all. This is the most-interacted control
on the page after the buttons.

**B. The nav never acknowledges scroll.** `.nav`
(`src/features/landing/landing.module.css:50`) is `position: fixed` with
`height: 72px` and `backdrop-filter: blur(24px) saturate(160%)`, identical at
scroll 0 and at the footer. Over a hero with a bright radial glow behind it, the
bar has no edge until it happens to sit over content.

**C. Two static things claim to be live.** `.livePill i`
(`landing.module.css`, the dot beside "Updated today") is a 6px lime circle that
never moves, and `.heroGlow` is a fixed 680px radial gradient. `globals.css`
already ships a `floaty` keyframe (line 557) and a `shimmer` keyframe (line 531)
with reduced-motion handling — the vocabulary exists and is unused here.

## Target

**FAQ** — a controlled accordion whose height animates, so nothing jumps:

- One item open at a time, first item open on load (matches today's `open={index === 0}`).
- Open: height `0 → auto` and opacity `0 → 1`, `260ms` (`--duration-panel`) with
  `--ease-out`.
- Close: the same, reversed, `200ms`.
- Chevron: `transform: rotate(180deg)` over `--duration-popover` (200ms) with
  `--ease-out`.
- Must be **interruptible**: clicking a second row while the first is still
  opening retargets from the current height rather than restarting. Framer's
  `animate={{ height: "auto" }}` does this; CSS keyframes do not.
- Reduced motion: no height animation, opacity only.
- Accessibility is non-negotiable: `<button aria-expanded>` per row controlling a
  region with `id`/`aria-controls`, full keyboard operation, and the answer text
  present in the DOM for crawlers (the FAQ is mirrored in
  `src/features/landing/structured-data.tsx` as `FAQPage` markup, so the visible
  copy must stay in the HTML — do not lazy-mount it).

**Nav** — a two-state bar:

```css
/* target — src/features/landing/landing.module.css */
.nav {
    transition: height var(--duration-panel) var(--ease-out),
                box-shadow var(--duration-panel) var(--ease-out),
                background var(--duration-panel) var(--ease-out)
}

.navScrolled {
    background: rgba(255, 255, 255, .92);
    box-shadow: 0 1px 0 rgba(7, 24, 47, .06), 0 8px 24px rgba(7, 24, 47, .05);
    height: 60px
}
```

Toggled past **48px** of scroll. `height` is a layout property, but this is one
element, once, on a scroll threshold — acceptable, and it is what the shrink is.
Do not animate the nav's `padding` as well.

**Ambient** — two small additions, both keyframe-based and both already
reduced-motion-safe via the `globals.css` block that sets
`animation-duration: 0.01ms` under `prefers-reduced-motion`:

- `.livePill i`: a 2.4s pulse, `opacity: 1 → 0.45 → 1` plus
  `box-shadow: 0 0 0 0 → 0 0 0 4px` in the lime at 25% alpha. `ease-in-out`,
  infinite. Opacity and box-shadow only — no `transform`, no layout.
- `.heroGlow`: reuse the existing `floaty` idea at a much slower rate — a 14s
  `ease-in-out infinite` drift of `translateY(0 → -18px → 0)` and
  `scale(1 → 1.04 → 1)` written as one `transform` keyframe. It is a
  `position: absolute` decorative div with no children, so this composites
  cleanly.

## Repo conventions to follow

- Tokens `--duration-panel`, `--duration-popover`, `--ease-out` come from plan
  001. **This plan depends on 001.**
- Keyframes live in the `Motion` section of `src/app/globals.css` (line 528+),
  named lowercase (`shimmer`, `floaty`). Add `livepulse` and `heroDrift` there,
  next to them, and add both to the existing
  `@media (prefers-reduced-motion: reduce)` list that currently names
  `.floaty, .shimmer::after { animation: none }`.
- The FAQ data is `FAQS` in `src/features/landing/faqs.ts`, an array of
  `[question, answer]` tuples, consumed by both `landing-hero.tsx` and
  `structured-data.tsx`. Do not change its shape.
- `AnimatePresence` is already used in this codebase — see
  `src/components/sidebar.tsx:405` and `src/components/ui/modal.tsx` for the
  house pattern.

## Steps

1. Create `src/features/landing/faq-accordion.tsx` as a `"use client"` component
   that takes `items: readonly [string, string][]` and renders the list. Structure
   per row (keep the existing classes so the CSS still applies):

   ```tsx
   <div className={styles.faqRow}>
     <button
       type="button"
       className={styles.faqSummary}
       aria-expanded={isOpen}
       aria-controls={`faq-answer-${index}`}
       id={`faq-question-${index}`}
       onClick={() => setOpenIndex(isOpen ? -1 : index)}
     >
       {question}
       <ChevronDown />
     </button>
     <motion.div
       id={`faq-answer-${index}`}
       role="region"
       aria-labelledby={`faq-question-${index}`}
       initial={false}
       animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
       transition={
         reduceMotion
           ? { duration: 0.15 }
           : { height: { duration: isOpen ? 0.26 : 0.2, ease: [0.23, 1, 0.32, 1] },
               opacity: { duration: isOpen ? 0.26 : 0.15, ease: [0.23, 1, 0.32, 1] } }
       }
       style={{ overflow: "hidden" }}
     >
       <p>{answer}</p>
     </motion.div>
   </div>
   ```

   `initial={false}` matters: without it every row animates from height 0 on
   mount and the section reflows on load.

2. In `src/features/landing/landing.module.css`, rename the FAQ selectors from
   element-based to class-based, keeping every declaration byte-identical:
   `.faqList details` → `.faqRow`, `.faqList summary` → `.faqSummary`,
   `.faqList summary svg` → `.faqSummary svg`,
   `.faqList details[open] summary svg` → `.faqSummary[aria-expanded="true"] svg`,
   `.faqList details p` → `.faqRow p`. Also delete
   `.faqList summary::-webkit-details-marker { display: none }` (no `<summary>`
   remains) and add `background: none; border: 0; width: 100%; text-align: left;`
   to `.faqSummary`, since it is now a `<button>` and browsers give buttons a
   background, a border and centred text.

3. In `landing-hero.tsx`, replace the `#faq` section's inner `<div
   className={styles.faqList}>…</div>` block with `<FaqAccordion items={faqs} />`,
   and drop the now-unused `ChevronDown` import if nothing else uses it.

4. Nav scroll state — in `src/features/landing/site-nav.tsx`:

   ```tsx
   const [scrolled, setScrolled] = useState(false);
   useEffect(() => {
     const onScroll = () => setScrolled(window.scrollY > 48);
     onScroll();
     window.addEventListener("scroll", onScroll, { passive: true });
     return () => window.removeEventListener("scroll", onScroll);
   }, []);
   ```

   and `className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}`. Add
   the two CSS rules from **Target**. `{ passive: true }` is required — a
   non-passive scroll listener blocks scrolling on touch.

5. Ambient keyframes — add to the `Motion` section of `src/app/globals.css`:

   ```css
   @keyframes livepulse {
     0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(136, 232, 77, 0.25); }
     50% { opacity: 0.45; box-shadow: 0 0 0 4px rgba(136, 232, 77, 0.25); }
   }

   @keyframes heroDrift {
     0%, 100% { transform: translateY(0) scale(1); }
     50% { transform: translateY(-18px) scale(1.04); }
   }
   ```

   Add `.livePill i` and `.heroGlow` cannot be named from `globals.css` (they are
   CSS-module-scoped), so apply the animations **in
   `src/features/landing/landing.module.css`** instead:
   `animation: livepulse 2.4s ease-in-out infinite` on `.livePill i`, and
   `animation: heroDrift 14s ease-in-out infinite` on `.heroGlow`. Add both to
   the module's own `@media(prefers-reduced-motion:reduce)` block with
   `animation: none`.

## Boundaries

- Do NOT change any FAQ question or answer text, and do NOT change
  `src/features/landing/faqs.ts` or `structured-data.tsx`. The visible copy and
  the `FAQPage` markup must stay identical, or the page loses its rich result.
- Do NOT lazy-mount answers. All answer text stays in the HTML at all times.
- Do NOT make the accordion multi-open; one at a time, first open on load.
- Do NOT animate the nav's `padding`, `font-size` or the logo's size.
- Do NOT add a scroll-linked parallax to anything other than `.heroGlow`, and do
  not drive it from a scroll listener — it is a time-based keyframe.
- Do NOT add dependencies.

## Verification

- **Mechanical**: `pnpm typecheck`, `pnpm lint`, `pnpm build` clean.
- **Feel check**: `pnpm dev`, open `/`:
  - Click FAQ row 3: row 1 closes and row 3 opens in one motion, nothing below
    jumps.
  - Click rows 2, 4, 5 rapidly: the panel retargets smoothly and never restarts
    from zero height.
  - Tab to a question and press Enter and Space: both toggle it. A screen reader
    announces expanded/collapsed.
  - `curl -s localhost:3001/ | grep -c "safe to spend"` — the answer text is still
    in the server HTML.
  - Scroll 60px: the bar shortens by 12px and gains a shadow, in one smooth step,
    with no flicker at the threshold.
  - The "Updated today" dot pulses about twice every five seconds; the hero glow
    drift should be almost subliminal — if you can see it moving without looking
    for it, it is too fast.
  - DevTools → Rendering → *prefers-reduced-motion: reduce*: the dot and glow
    stop entirely, the FAQ cross-fades without height motion, the nav still
    changes state.
  - DevTools → Performance with CPU 4× throttle, scrolling the full page: no
    long tasks from the scroll listener, and the glow's animation stays on the
    compositor (check *Layers*).
- **Done when**: no `<details>` or `<summary>` remains in
  `src/features/landing/`, and `grep -n "aria-expanded" src/features/landing/faq-accordion.tsx`
  matches.

# 003 — Rebuild the hero entrance and count the daily number up

> [!IMPORTANT]
> **DONE — do not run this plan.**
>
> The hero stagger, the parallax and `count-up.tsx` are in `main`. Note that
> the shipped hero wraps the visual in a `heroParallax` element that this plan
> does not mention: Framer cannot arbitrate a `style` motion value and an
> `animate` target for the same `y`, so the scroll and the entrance need
> separate elements. See [README.md](README.md) for the current state of the
> code and for what is actually left to do.

- **Status**: DONE
- **Commit**: 9e2004b
- **Severity**: MEDIUM
- **Category**: Physicality & origin; Missed opportunities; Performance
- **Estimated scope**: 2 files, ~120 lines

## Problem

**A. The hero copy slides without fading.**

```tsx
/* src/features/landing/landing-hero.tsx:106 — current */
<motion.div
  className={styles.heroCopy}
  initial={{ y: 22 }}
  animate={{ y: 0 }}
  transition={{ type: "spring", bounce: 0, duration: 0.6 }}
>
```

No `opacity`, so the headline is fully painted at frame one and then shoves
itself upward. A slide with no fade is the 2014 "wow" entrance, and it is the
first thing a visitor sees.

**B. The visual scales in from 0.96 with a hand-typed second spring.**

```tsx
/* src/features/landing/landing-hero.tsx (heroVisual) — current */
initial={{ scale: 0.96, y: 24 }}
animate={{ scale: 1, y: 0 }}
transition={{ type: "spring", bounce: 0, duration: 0.7, delay: 0.12 }}
```

Two blocks, two different durations (0.6 / 0.7), `bounce: 0` on both, so nothing
settles — it decelerates to a dead stop.

**C. Framer's `y` / `scale` shorthands are used throughout.** These are written
to the element as separate style properties on the main thread rather than as one
composited transform, on a page that also paints a 680px radial-gradient glow
(`.heroGlow`) and a `backdrop-filter: blur(24px) saturate(160%)` nav.

**D. The daily number never animates, and it is the entire product.**
`DailyNumber` (`src/features/landing/landing-hero.tsx`, the component rendering
`<strong>₹1,029</strong>`) prints a static string. The page's whole claim is
"one number, recalculated" and the number simply exists. This is the page's one
rare, high-emotion moment and it is spending none of its delight budget.

## Target

One shared spring (from plan 001), a real fade, transforms written as full
transform strings, and a count-up that runs once when the card is first seen:

```tsx
/* target — hero copy */
initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(20px)" }}
animate={reduceMotion ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" }}
transition={SPRING}

/* target — hero visual, 80ms behind the copy */
initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(20px) scale(0.97)" }}
animate={reduceMotion ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px) scale(1)" }}
transition={{ ...SPRING, delay: 0.08 }}
```

Count-up spec, exactly:

- Counts `0 → 1029`, formatted with the same `₹` prefix and thousands separator
  the static string uses (`₹1,029`).
- Duration **900ms** (marketing copy may exceed the 300ms UI budget; this is
  explanatory motion, not a control).
- Eased with `cubic-bezier(0.23, 1, 0.32, 1)` sampled in JS, so it decelerates
  like everything else on the page rather than running linear.
- Fires **once**, when the card first enters the viewport, never on re-entry.
- Under `prefers-reduced-motion: reduce`, renders the final value immediately.
- The final DOM text must be identical to today's (`₹1,029`) so nothing else
  shifts, and the element must reserve its width so the layout does not reflow
  while digits change: `font-variant-numeric: tabular-nums`.

## Repo conventions to follow

- `SPRING` and `Reveal` come from `src/features/landing/section.tsx` after plan
  001. **This plan depends on 001.**
- Reduced-motion branching pattern to imitate exactly: `src/components/sidebar.tsx:436-450`.
- Currency is formatted elsewhere in the app with the `en-IN` locale; check
  `src/lib/` for an existing formatter (`grep -rn "en-IN" src/lib`) and reuse it
  rather than writing a new one. If one exists, use it; if not, use
  `new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 })`.
- `landing-hero.tsx` is already `"use client"`.

## Steps

1. In `src/features/landing/landing-hero.tsx`, import what plan 001 exports and
   Framer's reduced-motion hook:

   ```tsx
   import { motion, useReducedMotion } from "framer-motion";
   import { Reveal, SPRING, SectionHeading } from "./section";
   ```

   Add `const reduceMotion = useReducedMotion();` as the first line of
   `LandingHero`.

2. Replace the `heroCopy` `motion.div` props with the target block above.

3. Replace the `heroVisual` `motion.div` props with the target block above.

4. Create `src/features/landing/count-up.tsx` as a new `"use client"` module
   exporting `useCountUp`:

   ```tsx
   "use client";

   import { useEffect, useRef, useState } from "react";

   /** The page's easing, sampled in JS so the count decelerates like the rest. */
   function easeOut(t: number) {
     // cubic-bezier(0.23, 1, 0.32, 1) approximated by its dominant term; exact
     // enough for a 900ms number roll and cheaper than a bezier solver.
     return 1 - Math.pow(1 - t, 3);
   }

   /**
    * Counts to `target` once, when `start` first becomes true.
    *
    * requestAnimationFrame rather than CSS because the animated thing is text
    * content, which CSS cannot interpolate. Cancels on unmount so a fast route
    * change cannot leave a frame loop running.
    */
   export function useCountUp(target: number, start: boolean, durationMs = 900) {
     const [value, setValue] = useState(0);
     const done = useRef(false);

     useEffect(() => {
       if (!start || done.current) return;
       done.current = true;

       const reduce =
         typeof window !== "undefined" &&
         window.matchMedia("(prefers-reduced-motion: reduce)").matches;
       if (reduce) {
         setValue(target);
         return;
       }

       let frame = 0;
       const startedAt = performance.now();
       const tick = (now: number) => {
         const progress = Math.min(1, (now - startedAt) / durationMs);
         setValue(Math.round(target * easeOut(progress)));
         if (progress < 1) frame = requestAnimationFrame(tick);
       };
       frame = requestAnimationFrame(tick);
       return () => cancelAnimationFrame(frame);
     }, [start, target, durationMs]);

     return value;
   }
   ```

5. In `landing-hero.tsx`, make `DailyNumber` count. It is rendered four times on
   the page (hero, product mockup, compare panel, final CTA), so gate the
   animation behind a prop and only turn it on for the hero instance:

   - Add `{ animateValue = false }` to `DailyNumber`'s props.
   - Wrap its root `div` in a `motion.div` with
     `onViewportEnter={() => setSeen(true)}` and `viewport={{ once: true, amount: 0.4 }}`,
     holding `const [seen, setSeen] = useState(false)`.
   - `const shown = useCountUp(1029, animateValue && seen);`
   - Render `<strong>{animateValue ? formatted(shown) : "₹1,029"}</strong>`.
   - Pass `animateValue` from the hero call site only: `<DailyNumber animateValue />`.

6. In `src/features/landing/landing.module.css`, add
   `font-variant-numeric: tabular-nums` to the `.dailyNumber>strong` rule so the
   digits do not jitter in width while counting.

## Boundaries

- Do NOT change the final rendered figures anywhere: `₹1,029`, `₹85,000`,
  `₹25,298`, `₹15,000`, `₹10,000` and the `12 days until payday` line all stay
  exactly as they read now.
- Do NOT animate the other three `DailyNumber` instances. Four numbers counting
  on one page is a slot machine.
- Do NOT add a count-up to any figure in the app shell (the real dashboard) —
  that is a live value a signed-in user checks many times a day and must be
  instant.
- Do NOT introduce `layout` or `layoutId` props; they measure and reflow.
- Do NOT add dependencies.

## Verification

- **Mechanical**: `pnpm typecheck`, `pnpm lint`, `pnpm build` clean; `pnpm test`
  still 416 passing.
- **Feel check**: `pnpm dev`, hard-reload `/`:
  - The headline **fades** as it rises. It must never be fully opaque while
    moving.
  - The card arrives just behind the copy, not simultaneously, and settles with a
    barely perceptible overshoot.
  - `₹1,029` rolls up once, in under a second, and stops exactly on `₹1,029`.
    Scroll away and back: it does not roll again.
  - The card does not change width while counting.
  - DevTools → Rendering → *prefers-reduced-motion: reduce*: the number is
    correct instantly, the hero fades with no travel.
  - DevTools → Performance, record the reload with CPU throttled 4×: no dropped
    frames during the hero entrance, and the count-up's rAF work stays under 1ms
    per frame.
- **Done when**: the hero has one `SPRING` reference instead of two literal
  spring objects, and `grep -n "initial={{ y: 22 }}" src/features/landing/landing-hero.tsx`
  returns nothing.

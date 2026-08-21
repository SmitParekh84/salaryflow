# 001 — Add motion tokens and rebuild the Reveal primitive

> [!IMPORTANT]
> **DONE — do not run this plan.**
>
> The tokens and the `Reveal` / `RevealGroup` / `RevealItem` primitives are in
> `main`. The "current code" quoted below is the pre-001 file and no longer
> matches `section.tsx`. See [README.md](README.md) for the current state of
> the code and for what is actually left to do.

- **Status**: DONE
- **Commit**: 9e2004b
- **Severity**: HIGH
- **Category**: Cohesion & tokens; Accessibility
- **Estimated scope**: 3 files, ~90 lines

## Problem

**A. There are no motion tokens.** `src/app/globals.css` defines a full colour
palette in layers but not one easing or duration token (its only motion block is
two keyframe animations at line 528+). Every curve on the public pages is
hand-typed, and they do not agree:

```css
/* src/features/landing/landing.module.css:1130 — current */
transition: transform .2s ease;
/* src/features/landing/landing.module.css:1252 — current */
transition: color .15s ease
/* src/features/landing/landing.module.css:1299 — current */
transition: background .16s ease, border-color .16s ease, color .16s ease;
```

`ease` is the browser's weak default curve. On movement (the FAQ chevron at
:1130) it reads as sludge, and three near-identical durations (.15s/.16s/.2s)
are three decisions where there should be one.

**B. The same spring is typed out three times** with three different values:

```tsx
/* src/features/landing/landing-hero.tsx:110 — current */
transition={{ type: "spring", bounce: 0, duration: 0.6 }}
/* src/features/landing/section.tsx:17 — current */
transition={{ type: "spring", bounce: 0, duration: 0.55 }}
```

**C. Reduced motion is not honoured by any Framer animation on these pages.**
The only guard is CSS-only:

```css
/* src/features/landing/landing.module.css:1723 — current */
@media(prefers-reduced-motion:reduce) {
    .page *, .page *::before, .page *::after {
        scroll-behavior: auto !important;
        transition-duration: .01ms !important
    }
}
```

That clamps CSS *transitions*. Framer Motion writes inline transforms via JS and
is untouched, so a reader who has asked their OS for less motion still gets
every section of the landing page sliding 28px on scroll. `Reveal`
(`src/features/landing/section.tsx:11`) wraps roughly twenty blocks on the
landing page and every section of `/about`, `/pricing`, `/contact`, `/waitlist`
and `/download`, so this one component is the whole page's motion.

**D. `Reveal` cannot stagger.** Each instance is its own independent
`whileInView`, so a 3-card grid animates as three unrelated events at whatever
moment each card crosses 15% of the viewport.

## Target

Tokens in `globals.css` (values copied exactly, do not round):

```css
/* target — add to src/app/globals.css */
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);

  --duration-press: 160ms;
  --duration-hover: 160ms;
  --duration-popover: 200ms;
  --duration-panel: 260ms;
}
```

A single exported spring, and a `Reveal` that drops travel (never opacity) under
reduced motion and can stagger its children:

```tsx
/* target — src/features/landing/section.tsx */
export const SPRING = { type: "spring", duration: 0.5, bounce: 0.2 } as const;
export const REVEAL_STAGGER = 0.06; // 60ms, inside the 30-80ms band
```

## Repo conventions to follow

- Tokens live in `src/app/globals.css`. It is layered and commented: LAYER 1 —
  PALETTE, LAYER 2 — SEMANTIC TOKENS, then a `MARKETING SURFACE` block, then
  `@theme inline`, then a `Motion` section at line 528. Put the new tokens in a
  `LAYER 3 — MOTION` block placed immediately **before** the existing
  `/* Motion */` comment at line 528, and mirror the house comment style: say
  *why* a value is what it is, not what it is.
- Reduced motion in TypeScript is already done correctly once — imitate it
  exactly: `src/components/sidebar.tsx:402` (`const reduceMotion =
  useReducedMotion();`) and `src/components/sidebar.tsx:436-450`, which branches
  `initial`/`animate`/`exit` so the reduced variant keeps opacity and arrangement
  and loses the flight.
- `src/features/landing/section.tsx` is a `"use client"` module. Keep it one.
- Do not add a dependency: `framer-motion` is already imported here and exports
  `useReducedMotion`.

## Steps

1. In `src/app/globals.css`, immediately before the existing
   `/* ==== Motion ==== */` banner (line 528), add a `LAYER 3 — MOTION` banner in
   the same `/* ===== */` style as the other layer banners, containing the four
   easing/duration declarations from **Target** inside `:root`. Add one comment
   line stating that `--ease-out` is the default for entering and exiting, and
   `--ease-in-out` only for something already on screen moving to a new place.

2. In the same file, add the two curves to the `@theme inline` block (which
   currently starts at the line containing `--color-marketing-ink:`), so Tailwind
   utilities can reach them:

   ```css
   --ease-out: var(--ease-out);
   --ease-in-out: var(--ease-in-out);
   ```

   If Tailwind rejects self-referential names, name the theme keys
   `--ease-out-strong` / `--ease-in-out-strong` instead and leave the `:root`
   names alone. Do not delete anything already in that block.

3. Replace the body of `src/features/landing/section.tsx` with the version below.
   Keep the file's existing doc comment, extend it, keep both exports, and add
   the three new exports:

   ```tsx
   "use client";

   import { motion, useReducedMotion } from "framer-motion";
   import type { ReactNode } from "react";
   import styles from "./landing.module.css";

   /** One spring for the whole public surface. Apple-ish: fast, barely bounces. */
   export const SPRING = { type: "spring", duration: 0.5, bounce: 0.2 } as const;

   /** 60ms — inside the 30-80ms band where stagger reads as sequence, not delay. */
   export const REVEAL_STAGGER = 0.06;

   /** Travel distance for a reveal, in px. */
   const REVEAL_Y = 24;

   export function Reveal({
     children,
     className = "",
     delay = 0,
   }: {
     children: ReactNode;
     className?: string;
     /** Seconds. Use RevealGroup instead of hand-computing these. */
     delay?: number;
   }) {
     const reduceMotion = useReducedMotion();
     return (
       <motion.div
         initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: REVEAL_Y }}
         whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
         viewport={{ once: true, amount: 0.15 }}
         transition={reduceMotion ? { duration: 0.2 } : { ...SPRING, delay }}
         className={className}
       >
         {children}
       </motion.div>
     );
   }

   /**
    * Staggers direct children as one group, so a card row reads left to right
    * instead of firing in whatever order the cards cross the viewport.
    *
    * The parent owns the trigger; children must be `RevealItem`, which inherits
    * it. Stagger is decoration and must never gate interaction, so the children
    * are visible to hit-testing throughout.
    */
   export function RevealGroup({
     children,
     className = "",
   }: {
     children: ReactNode;
     className?: string;
   }) {
     const reduceMotion = useReducedMotion();
     return (
       <motion.div
         initial="hidden"
         whileInView="shown"
         viewport={{ once: true, amount: 0.15 }}
         variants={{
           hidden: {},
           shown: { transition: { staggerChildren: reduceMotion ? 0 : REVEAL_STAGGER } },
         }}
         className={className}
       >
         {children}
       </motion.div>
     );
   }

   export function RevealItem({
     children,
     className = "",
   }: {
     children: ReactNode;
     className?: string;
   }) {
     const reduceMotion = useReducedMotion();
     return (
       <motion.div
         variants={{
           hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: REVEAL_Y },
           shown: reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 },
         }}
         transition={reduceMotion ? { duration: 0.2 } : SPRING}
         className={className}
       >
         {children}
       </motion.div>
     );
   }
   ```

   `SectionHeading` stays exactly as it is, still rendering `<Reveal
   className={styles.sectionHeading}>`.

4. Replace the three hand-typed CSS curves with tokens, changing nothing else on
   those lines:
   - `src/features/landing/landing.module.css:1130` →
     `transition: transform var(--duration-popover) var(--ease-out);`
   - `src/features/landing/landing.module.css:1252` →
     `transition: color var(--duration-hover) var(--ease-out)`
   - `src/features/landing/landing.module.css:1299` →
     `transition: background var(--duration-hover) var(--ease-out), border-color var(--duration-hover) var(--ease-out), color var(--duration-hover) var(--ease-out);`

5. In `src/features/landing/landing.module.css:1723`, raise the reduced-motion
   clamp from `.01ms` to `120ms` and add a one-line comment saying reduced motion
   means gentler, not dead, so colour and opacity feedback survives:

   ```css
   @media(prefers-reduced-motion:reduce) {
       .page *,
       .page *::before,
       .page *::after {
           scroll-behavior: auto !important;
           transition-duration: .12s !important
       }
   }
   ```

## Boundaries

- Do NOT change any markup, copy, class name or layout property.
- Do NOT touch `src/features/landing/landing-hero.tsx` — plans 003 and 004 own it.
- Do NOT convert any other hand-typed transition in the app (`src/components/**`,
  `src/features/dashboard/**`); this plan is the public surface only.
- Do NOT add dependencies.
- If a cited line number does not contain the quoted code, find it by the quoted
  string in the same file; if it is absent entirely, STOP and report.

## Verification

- **Mechanical**: `pnpm typecheck` and `pnpm lint` both exit 0. `pnpm build`
  compiles. `pnpm test` stays at 416 passing.
- **Feel check**: run `pnpm dev`, open `/`, and confirm:
  - Sections still fade up once and never re-animate on scroll back up.
  - In DevTools → Rendering → *Emulate prefers-reduced-motion: reduce*, reload
    and scroll the whole page: content still **fades** in, nothing **moves**
    vertically, and hover colours still change.
  - In DevTools → Animations, set playback to 10% and confirm a reveal has no
    visible overshoot wobble (bounce 0.2 should read as a soft settle, not a
    bounce).
- **Done when**: `grep -rn "\.15s ease\|\.16s ease\|\.2s ease" src/features/landing/` returns
  nothing, and `grep -rn "useReducedMotion" src/features/landing/section.tsx`
  matches.

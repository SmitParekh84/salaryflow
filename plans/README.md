# Landing page animation plans

Motion work for the public pages (`/`, `/about`, `/pricing`, `/contact`,
`/waitlist`, `/download`).

## Read this before running any plan

**The brief changed on 21 Aug 2026, and 001, 003 and 004 have already been
executed against the new one.** An earlier version of this file told an executor
that *"anything that draws attention to itself as an animation is the failure
mode"*. That is no longer the goal, and a plan run against the old sentence will
undo work that is already in `main`. The file list under "What shipped" is the
source of truth for the current state of the code; the plan documents 001, 003
and 004 describe a starting point that no longer exists.

What did **not** change is the vocabulary. Same easing family, same spring, same
stagger, same travel distance — every value in the table below survived the
rewrite unaltered. The difference is scope: the page now leads the reader
through a scroll rather than only reacting to one.

## Goal

**Deliberate, scroll-led, and cheap.** The page should feel authored — the
reader is walked from a bank balance to a daily number — while never costing
more than a composited `transform` or `opacity`. Two failure modes, and they
pull in opposite directions:

- **Fussy.** Every section performing for attention. A reveal is not an event.
  Exactly one section on the page is allowed to hold the reader still, and it is
  the payday cycle, because a controlled flow from payday to payday *is* the
  brand idea. Everything else reveals and gets out of the way.
- **Inert.** A 493-line landing page where nothing acknowledges the scroll,
  which is what shipped before 001.

And, unconditionally: no motion at all for a reader who has asked their OS for
less. Under `prefers-reduced-motion` the travel is dropped, the pin is
released, the aurora stops drifting, the count-up is skipped, and the opacity
fade survives so content still announces itself.

## Plans

| # | Title | Severity | Status |
| --- | --- | --- | --- |
| [001](001-motion-tokens-and-reveal-primitive.md) | Add motion tokens and rebuild the Reveal primitive | HIGH | **DONE** |
| [002](002-press-and-hover-feedback.md) | Fix press feedback and hover transitions | HIGH | **DONE** |
| [003](003-hero-entrance-and-daily-number.md) | Rebuild the hero entrance, count the daily number up | MEDIUM | **DONE** |
| [004](004-section-choreography.md) | Choreograph every landing section (stagger) | MEDIUM | **DONE** |
| [005](005-faq-nav-and-ambient.md) | Animate the FAQ, the nav on scroll, the ambient details | MEDIUM / LOW | **DONE** |

### What is actually left

**Nothing.** All five plans are executed and the set has been verified — see
"Verifying the set as a whole" below for what was checked at runtime and what
still needs a human at a browser.

Executing 002 and 005A also turned up two defects in the previously shipped
work, both of which were silent — no error, no warning, nothing in a build log.
They are recorded here because both are easy to re-introduce:

- **The motion tokens were never actually declared.** `landing.module.css` used
  `var(--ease-out)`, `var(--ease-in-out)` and `var(--dur-base)` in six places,
  but no rule anywhere defined them. An invalid `var()` substitution makes the
  whole declaration invalid at computed-value time, so the aurora never drifted,
  the payday stops never faded between states, and the allocation bars never
  filled — the `animation` shorthand carrying `var(--ease-out)` was dropped
  entirely, taking the animation *name* with it. Only the nav survived, because
  its rule happened to spell its tokens with literal fallbacks
  (`var(--dur-base, 320ms)`). The tokens are now declared on `.page`, and
  `--ease-out` / `--dur-base` are repeated on `.nav` for the legal-page shell,
  which renders `SiteNav` outside `.page`.
- **The landmine below had in fact been re-laid.** `.page` was still
  `overflow: hidden`, so the payday cycle never pinned — the section scrolled
  past like any other. It is now `overflow-x: clip`.

Note on token names: 002 and 005 refer to `--duration-press`, `--duration-hover`,
`--duration-panel` and `--duration-popover`. The shipped code uses the shorter
`--dur-*` spelling, so the tokens actually declared are `--dur-press` (160ms),
`--dur-fast` (200ms) and `--dur-base` (320ms). Same values, and `--dur-base`'s
320ms is taken from the fallback the shipped nav rule already declared rather
than estimated. `--dur-slow` is not declared, because nothing uses it and the
tables below give no value for it.

## What shipped

| File | State | What it now owns |
| --- | --- | --- |
| `src/features/landing/section.tsx` | rewritten | `SPRING`, `Reveal`, `RevealGroup`, `RevealItem`, `SectionHeading` |
| `src/features/landing/payday-cycle.tsx` | new | The pinned scroll sequence |
| `src/features/landing/count-up.tsx` | new | en-IN rupee count-up |
| `src/features/landing/faq-accordion.tsx` | new | The controlled, interruptible FAQ accordion (005A) |
| `src/features/landing/landing-hero.tsx` | edited | Hero stagger + parallax; five grids converted to staggered reveals |
| `src/features/landing/site-nav.tsx` | edited | Condense on scroll, scroll-progress hairline |
| `src/features/landing/landing.module.css` | edited | Tokens, aurora, pinned stage, scroll-driven bar fill, nav states |

Specifically:

- **Tokens.** `--ease-out`, `--ease-in-out`, `--dur-press`, `--dur-fast`,
  `--dur-base`, `--dur-slow`, declared on `.page`.
- **Reveal primitives.** `Reveal` for a single element; `RevealGroup` +
  `RevealItem` for anything that should arrive in sequence. A `RevealItem`
  outside a `RevealGroup` never leaves its hidden state — nothing drives it to
  `shown`. This is the most likely way to make content silently invisible.
- **Hero.** Six-line staggered entrance on mount (not on scroll — it is above
  the fold). The card parallaxes to `-72px` across the section.
- **Payday cycle.** The one pinned section. 420vh stage, `position: sticky`
  pin, rail fills in `--ribbon-gradient`, five stops light in turn. Unpinned
  below 900px and under reduced motion.
- **Allocation bars.** Fill via `animation-timeline: view()` — no JS, no
  IntersectionObserver. Requires the `@property --bar` registration directly
  above the rule; without it the custom property is an opaque string and jumps
  straight to its end value instead of tweening.
- **Nav.** Condenses 72px → 60px past 48px of scroll, with 24px of hysteresis
  so it cannot flicker. Ribbon-gradient progress hairline driven by `scaleX`.
- **Ambient.** Three blurred ribbon-coloured blobs behind the hero on 28/34/40s
  drifts, plus an SVG turbulence grain that kills the banding the blurs would
  otherwise show on a wide-gamut display.

## The landmine, so nobody re-lays it

`.page` used to declare `overflow: hidden`. That makes it a scroll container,
which **silently disables `position: sticky` on every descendant** — no error,
no warning, the element simply never sticks. It is now `overflow-x: clip`, which
still contains the aurora but leaves sticky working. If a pinned section ever
stops pinning, check this first.

This has already happened once. An earlier revision of this file claimed the
change had been made when it had not: `.page` was still `overflow: hidden` when
002 and 005A were picked up, and the payday cycle was not pinning at all. Do not
trust this paragraph — run the check. `getComputedStyle` on the `.page` element
must report `overflow-x: clip` **and** `overflow-y: visible`; `overflow: clip`
on its own sets both axes and is not what you want here.

## Values these plans share

Do not let an executor substitute its own. Every one of these is copied from the
audit catalogue, not estimated, and all of them survived the brief change:

| Thing | Value |
| --- | --- |
| Entering / exiting | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Moving on screen | `cubic-bezier(0.77, 0, 0.175, 1)` |
| Spring (everything in Framer) | `{ type: "spring", duration: 0.5, bounce: 0.2 }` |
| Press feedback | `scale(0.97)`, 160ms |
| Group stagger | 60ms per child |
| Reveal travel | 24px |
| Panel open / close | 260ms / 200ms |
| Reduced motion | opacity survives, travel does not |

Added by the shipped work, same rules apply:

| Thing | Value |
| --- | --- |
| Pin stage height | 420vh (~100vh per stop, five stops) |
| Hero parallax travel | `-72px`, spring-smoothed |
| Count-up | 1.1s, `cubic-bezier(0.23, 1, 0.32, 1)`, fires once at 60% visible |
| Nav condense | 72px → 60px, threshold 48px, release 24px |
| Aurora drift | 28s / 34s / 40s, `alternate` |

`ease-in` appears nowhere. Nothing scales from `0`. Nothing animates `width`,
`height`, `margin` or `top`/`left` **except** the nav's height, which is called
out and justified in `landing.module.css`: the header is `position: fixed`, out
of flow, with no siblings to reflow, so the cost is a repaint of 72 pixels of
bar and nothing else.

## No dependencies were added, and none should be

`framer-motion@13` is already a dependency and covers every case here. GSAP +
ScrollTrigger was considered and rejected: ~70KB gzipped on a page whose primary
metric is LCP, to buy pinning that `position: sticky` already does better —
sticky keeps the scrollbar honest, keeps the back button working, and does not
hold a reader hostage who is flicking past at speed.

## Verifying the set as a whole

**Mechanical checks: done and clean.** `pnpm typecheck`, `pnpm lint`,
`pnpm build` and `pnpm test` (416 passed, 7 skipped) all pass on the full set.
Framer Motion 13's typings turned out to be a non-issue — `useScroll`'s
`target`, `useInView`'s options and `viewport.margin` all typecheck as written,
so nothing needed loosening.

**Runtime checks: done in Chrome**, against `next dev`:

- The payday cycle pins. `.cyclePin` holds at `getBoundingClientRect().top === 0`
  across the full 420vh stage, the rail fills to `scaleX(0.91)` by the last stop,
  and the five stops light in order.
- The aurora drifts, on 28s/34s/40s with `cubic-bezier(0.77, 0, 0.175, 1)`.
- The allocation bars run on a real `ViewTimeline` and resolve to distinct
  `--bar` percentages (28/18/12/42%).
- The FAQ animates rather than teleports — a screenshot mid-gesture catches one
  row collapsing while another expands. `aria-expanded`/`aria-controls` are
  wired per row, Enter operates it from the keyboard, and every answer's text is
  in the DOM in both states.
- Press feedback resolves to `transform 160ms cubic-bezier(0.23, 1, 0.32, 1)` on
  `.page button`, and `.page a:active` is gone. The marketing button's
  transition list now carries `filter`.
- The waitlist shell's focus ring lands on
  `0 0 0 3px rgba(0, 184, 148, .18)` with `border-color: var(--flow)`, over 200ms.

**Still needs a human at a browser** — none of these can be driven from a
headless harness, and none of them are confirmed:

1. Reduced motion. Every path is gated in source — `y: still ? 0 : TRAVEL`,
   `position: static` on `.cyclePin`, `animation: none` on `.ambient i`,
   `if (still || !inView) return` in `CountUp`, and a `height` duration of 0 in
   the FAQ — but the media query was never actually flipped. Do item 1 below.
2. The CPU-throttled Performance profile (item 2). Not run.
3. The Animations panel at 10% (item 3). Not run, though every curve on the page
   was read back from `getComputedStyle` and each one is one of the two
   cubic-beziers in the table above.
4. Firefox (item 5). Not run. Correct by construction — `animation` is declared
   before `animation-timeline`, so dropping the unsupported line leaves the 1s
   time-based fill with `both`, which ends full rather than empty.

The five-point checklist, on `/`:

1. Reload with DevTools → Rendering → **prefers-reduced-motion: reduce**. Scroll
   the whole page and open the FAQ. Nothing should travel, the cycle section
   should not pin, the aurora should be still, the daily number should read
   `₹1,029` immediately — and everything should still fade and still respond.
2. Reload with CPU throttled 4× and record a Performance profile while scrolling
   top to bottom. No long tasks, no layout thrash from the reveals, and the pin
   must not drop frames.
3. Watch the page at 10% playback (DevTools → Animations). Every curve should
   look like the same curve.
4. Scroll the payday cycle on a trackpad and on a mouse wheel. The rail should
   advance about one stop per comfortable gesture in both.
5. Check the allocation bars in Firefox, where `animation-timeline` is still
   behind a flag. They must degrade to a one-second fill on load, not to empty.

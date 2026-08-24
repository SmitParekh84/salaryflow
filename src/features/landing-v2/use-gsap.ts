"use client";

import { formatMoney } from "@/lib/utils";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect, useRef, type RefObject } from "react";

/* ---------------------------------------------------------------------------
   The one place GSAP is configured, and the only file in this feature that
   imports it directly. Sections describe scenes; this decides how they are
   registered, scoped, torn down, and what happens to a reader who asked for
   less motion.

   Two rules the whole feature depends on:

   1. Every scene is built inside a `gsap.matchMedia()` branch, never bare. A
      bare ScrollTrigger survives a route change as a stale listener measuring
      an element that no longer exists; matchMedia reverts the lot on unmount
      and re-runs it when the query flips, so rotating a phone rebuilds the
      scene against the new layout instead of keeping the old numbers.

   2. Reduced motion is a real branch, not a smaller version of the animation.
      `.reveal` elements start at `opacity: 0` in CSS so nothing flashes at
      full opacity before the scene builds — which means if the reduced-motion
      branch did nothing, the page would stay invisible. `still()` exists to
      put content on screen, and every section must call it.
   --------------------------------------------------------------------------- */

/** Matches `--ease-out` in landing-v2.module.css, so a tween and a CSS
 *  transition on the same element agree about how it moves. */
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

const MOTION = "(prefers-reduced-motion: no-preference)";
const STILL = "(prefers-reduced-motion: reduce)";

/** Pins are only created where the stylesheet keeps the stage tall. Below
 *  901px the stages collapse to `height: auto` and the pins go `static`, so
 *  creating a ScrollTrigger pin there would measure a stage that no longer
 *  has any scroll distance to give it. Keep this threshold in step with the
 *  `max-width: 900px` block in landing-v2.module.css. */
const PINNED = `(min-width: 901px) and ${MOTION}`;

/* Deliberately excludes reduced motion as well, so `pinned`, `narrow` and
   `still` are three mutually exclusive branches and exactly one of them runs.
   An overlapping `narrow` would animate a reveal for a narrow-screen reader who
   had asked for less motion, because `still` running too does not undo it. */
const NARROW = `(max-width: 900px) and ${MOTION}`;

let registered = false;

function register() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  registered = true;
}

export type SceneApi = {
  /** Full motion. Runs only when the reader has not asked for less. */
  motion: (build: () => void) => void;
  /** Reduced motion. Must leave every `.reveal` element visible. */
  still: (build: () => void) => void;
  /** Full motion, and only wide enough for the pinned stages to exist. */
  pinned: (build: () => void) => void;
  /**
   * Full motion, but too narrow for a pinned stage. A section with a `pinned`
   * scene needs this as well, or its content stays hidden on a phone: `still`
   * only runs for a reader who asked for less motion.
   */
  narrow: (build: () => void) => void;
};

/**
 * Builds one section's scenes, scoped to the returned ref.
 *
 * The builder runs once on mount. It is held in a ref rather than listed as an
 * effect dependency because a scene is a description of the section's own
 * layout, not of its props — rebuilding it on every render would tear down and
 * re-measure every ScrollTrigger on the page on each parent re-render.
 */
export function useScene<T extends HTMLElement = HTMLDivElement>(
  build: (api: SceneApi, root: T) => void,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  // Captured from the first render and never reassigned. Refreshing it on every
  // render would be both a ref write during render (which React forbids, and
  // eslint catches) and pointless: the scene is built once on mount, so the
  // only builder that is ever called is this one.
  const builder = useRef(build);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    register();
    const mm = gsap.matchMedia();
    const api: SceneApi = {
      motion: (fn) => mm.add(MOTION, fn, root),
      still: (fn) => mm.add(STILL, fn, root),
      pinned: (fn) => mm.add(PINNED, fn, root),
      narrow: (fn) => mm.add(NARROW, fn, root),
    };

    builder.current(api, root);

    // One refresh after the branches have run. Sections mount independently and
    // a pin created late shifts every trigger below it; without this the last
    // sections on the page start their reveals at the wrong scroll position.
    ScrollTrigger.refresh();

    return () => {
      mm.revert();
    };
  }, []);

  return ref;
}

/**
 * The house reveal: rise and fade, once, as the element enters.
 *
 * `start: "top 82%"` fires before the element is squarely in view, so for a
 * tall card the reveal has finished by the time the reader is actually looking
 * at it — the animation should not be performed *for* them.
 */
export function revealIn(
  targets: gsap.TweenTarget,
  options: { stagger?: number; y?: number; trigger?: Element } = {},
) {
  const { stagger = 0.08, y = 28, trigger } = options;
  return gsap.fromTo(
    targets,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration: 0.85,
      ease: EASE_OUT,
      stagger,
      scrollTrigger: {
        trigger: trigger ?? (targets as Element),
        start: "top 82%",
        once: true,
      },
    },
  );
}

/** The reduced-motion counterpart to `revealIn`: content, in place, now. */
export function showNow(targets: gsap.TweenTarget) {
  gsap.set(targets, { opacity: 1, y: 0, clearProps: "transform" });
}

/**
 * Counts a money figure up as it enters view.
 *
 * `snap` keeps every intermediate frame a whole rupee — tweening the raw value
 * printed ₹1,028.6417 for most of the animation, which reads as a rendering
 * fault rather than a count. The final frame is written from `to` rather than
 * from the tweened value so the number that settles is exactly the one asked
 * for, never a rounding of it.
 */
export function countTo(el: Element, to: number, duration = 1.6) {
  const state = { value: 0 };
  return gsap.to(state, {
    value: to,
    duration,
    ease: "power2.out",
    snap: { value: 1 },
    onUpdate: () => {
      el.textContent = formatMoney(state.value);
    },
    onComplete: () => {
      el.textContent = formatMoney(to);
    },
    scrollTrigger: { trigger: el, start: "top 88%", once: true },
  });
}

/**
 * Splits a heading into lines and characters for a staggered entrance.
 *
 * Returns a cleanup-aware split: GSAP's matchMedia revert calls the returned
 * `revert()`, which puts the original markup back. That matters for more than
 * tidiness — SplitText leaves a span per character behind, and a screen reader
 * walking 40 sibling spans announces the heading one letter at a time.
 * `aria-label` on the heading plus `aria-hidden` on the pieces is handled by
 * SplitText's own `aria: "auto"` default; reverting restores the plain text.
 */
export function splitHeading(el: Element) {
  return SplitText.create(el, {
    type: "lines,chars",
    linesClass: "v2-line",
    autoSplit: true,
  });
}

export { gsap, ScrollTrigger };

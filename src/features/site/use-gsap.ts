"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect, useRef, type RefObject } from "react";

/* ---------------------------------------------------------------------------
   Scene plumbing. Duplicated per draft on purpose — v2, v3 and v4 are competing
   drafts and two of them will be deleted, so nothing is shared between them
   except the brand strings.

   Four branches, exactly one of which runs at a time:
     motion  full motion at any width
     pinned  full motion, wide enough for a pinned stage to exist
     narrow  full motion, too narrow for one
     still   the reader asked for less motion, at any width

   `.reveal` starts hidden in CSS so nothing flashes before its scene builds,
   which means every branch has to put content on screen.
   --------------------------------------------------------------------------- */

const MOTION = "(prefers-reduced-motion: no-preference)";
const PINNED = `(min-width: 981px) and ${MOTION}`;
const NARROW = `(max-width: 980px) and ${MOTION}`;
const STILL = "(prefers-reduced-motion: reduce)";

let registered = false;

function register() {
  if (registered) return;
  // ScrollTrigger for the reveals, SplitText for the line-by-line headings.
  // Draggable and InertiaPlugin are deliberately absent — nothing on the public
  // site is dragged, so they never enter the bundle.
  gsap.registerPlugin(ScrollTrigger, SplitText);
  registered = true;
}

export type SceneApi = {
  motion: (build: () => void) => void;
  pinned: (build: () => void) => void;
  narrow: (build: () => void) => void;
  still: (build: () => void) => void;
};

export function useScene<T extends HTMLElement = HTMLDivElement>(
  build: (api: SceneApi, root: T) => void,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  // Captured on the first render and never reassigned: the scene is built once
  // on mount, so a later builder would never run, and writing a ref during
  // render is not allowed.
  const builder = useRef(build);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    register();
    const mm = gsap.matchMedia();
    builder.current(
      {
        motion: (fn) => mm.add(MOTION, fn, root),
        pinned: (fn) => mm.add(PINNED, fn, root),
        narrow: (fn) => mm.add(NARROW, fn, root),
        still: (fn) => mm.add(STILL, fn, root),
      },
      root,
    );

    // Sections mount independently; one that settles to its real height after a
    // later section has measured leaves every trigger below it miscalibrated.
    ScrollTrigger.refresh();

    return () => {
      mm.revert();
    };
  }, []);

  return ref;
}

/** Rise and fade, once, as the element enters. */
export function revealIn(
  targets: gsap.TweenTarget,
  options: { stagger?: number; y?: number; trigger?: Element } = {},
) {
  const { stagger = 0.08, y = 14, trigger } = options;
  return gsap.fromTo(
    targets,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out",
      stagger,
      scrollTrigger: { trigger: trigger ?? (targets as Element), start: "top 84%", once: true },
    },
  );
}

/** Content, in place, now — the reduced-motion counterpart to `revealIn`. */
export function showNow(targets: gsap.TweenTarget) {
  gsap.set(targets, { opacity: 1, y: 0, clearProps: "transform" });
}

/**
 * Counts a figure up as it enters view, written through `format`.
 *
 * `snap` keeps every frame a whole unit, and the final frame is written from
 * `to` rather than from the tweened value, so the number that settles is exactly
 * the one asked for rather than a rounding of it.
 */
export function countTo(
  el: Element,
  to: number,
  format: (value: number) => string,
  duration = 1.2,
) {
  const state = { value: 0 };
  return gsap.to(state, {
    value: to,
    duration,
    ease: "power2.out",
    snap: { value: 1 },
    onUpdate: () => {
      el.textContent = format(state.value);
    },
    onComplete: () => {
      el.textContent = format(to);
    },
    scrollTrigger: { trigger: el, start: "top 92%", once: true },
  });
}

/**
 * Reveals a heading line by line as it enters.
 *
 * Restrained on purpose. The reference this was asked against — razorpay.com/
 * careers — turns out to animate nothing at all on scroll: ten below-fold
 * elements were measured entering the viewport and none changed opacity,
 * transform or clip-path. Its smoothness is large light type, whitespace and an
 * un-hijacked scroll. So this is a short, quiet rise, not a performance: 0.7s,
 * a 0.07s stagger, and each line travelling only its own height.
 *
 * Two details that decide whether it looks broken:
 *
 *   · awaiting document.fonts.ready before splitting. Lines are measured from
 *     the rendered text, so splitting while the fallback face is still in place
 *     bakes in the wrong line breaks and they never recover.
 *   · mask: "lines", which wraps each line in its own overflow-hidden box. That
 *     is what lets a line rise out of nothing instead of appearing mid-air above
 *     its own baseline.
 *
 * autoSplit re-splits on resize, and the returned revert restores the original
 * markup — which matters for more than tidiness: SplitText leaves a span per
 * line, and a screen reader walking those announces the heading in fragments.
 */
export async function revealLines(
  elements: ArrayLike<HTMLElement>,
  options: { stagger?: number; duration?: number } = {},
) {
  const { stagger = 0.07, duration = 0.7 } = options;
  const list = Array.from(elements);
  if (!list.length) return;

  await document.fonts.ready;

  for (const el of list) {
    gsap.set(el, { opacity: 1 });

    /*
     * The animation is built inside `onSplit`, and returned from it, which is
     * not optional with `autoSplit`.
     *
     * `autoSplit` re-splits the element whenever the text is remeasured — when a
     * webfont finishes loading, and on resize. A re-split discards the line
     * elements and builds new ones, so a tween created once against the first
     * set is left pointing at detached nodes: the visible lines then have no
     * animation at all and simply sit at their resting position. That is exactly
     * how this first went wrong — the split was correct, the masks were correct,
     * and nothing moved.
     *
     * Returning the tween hands it to SplitText, which reverts it before each
     * re-split and calls this again for the new lines.
     */
    /*
     * The previous tween and its trigger are killed explicitly on every split.
     *
     * Returning the animation from `onSplit` is the documented contract and it
     * does revert the tween — but the ScrollTrigger it created survives. That
     * was measured: after one re-split the heading had two triggers, one of them
     * still holding two targets that were no longer in the document. Since
     * `autoSplit` re-splits on every resize, that is one orphaned trigger per
     * resize, each still measuring a dead element on every scroll.
     */
    let tween: gsap.core.Tween | undefined;

    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) => {
        tween?.scrollTrigger?.kill();
        tween?.kill();
        tween = gsap.from(self.lines, {
          yPercent: 110,
          duration,
          ease: "power3.out",
          stagger,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
        return tween;
      },
    });
  }
}

export { gsap, ScrollTrigger };

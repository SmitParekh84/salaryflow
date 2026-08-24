"use client";

import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, type RefObject } from "react";

/* ---------------------------------------------------------------------------
   Scene plumbing for the v3 draft.

   Deliberately duplicated from landing-v2 rather than shared: these are two
   competing drafts and one of them is going to be deleted. A shared module
   between them would mean deleting the loser breaks the winner.

   Three mutually exclusive branches, so exactly one runs at any time:
     pinned  wide enough for the one pinned scene, and motion allowed
     narrow  too narrow for it, motion allowed
     still   the reader asked for less motion, at any width

   `.reveal` starts hidden in CSS so nothing flashes before its scene builds,
   which means every branch must put content on screen.
   --------------------------------------------------------------------------- */

export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

const MOTION = "(prefers-reduced-motion: no-preference)";
const PINNED = `(min-width: 901px) and ${MOTION}`;
const NARROW = `(max-width: 900px) and ${MOTION}`;
const STILL = "(prefers-reduced-motion: reduce)";

let registered = false;

function register() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);
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
  // Captured on first render and never reassigned: the scene is built once on
  // mount, so a later builder would never be called, and writing a ref during
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

    // Sections mount independently, and a section that changes height after a
    // later one has measured leaves every trigger below it calibrated wrong.
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
  const { stagger = 0.08, y = 26, trigger } = options;
  return gsap.fromTo(
    targets,
    { opacity: 0, y },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: EASE_OUT,
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
 * Counts an integer up as it enters view, writing through `format`.
 *
 * `snap` keeps every frame a whole unit, and the last frame is written from
 * `to` rather than from the tweened value, so the figure that settles is
 * exactly the one asked for rather than a rounding of it.
 */
export function countTo(
  el: Element,
  to: number,
  format: (value: number) => string,
  duration = 1.5,
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
    scrollTrigger: { trigger: el, start: "top 90%", once: true },
  });
}

export { gsap, ScrollTrigger };

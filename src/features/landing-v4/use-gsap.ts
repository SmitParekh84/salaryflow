"use client";

import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
  // InertiaPlugin has to be registered for Draggable's `inertia: true` to do
  // anything: without it a throw stops dead the moment the pointer lifts, which
  // is the difference between a carousel that feels physical and one that feels
  // broken.
  gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin);
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
  const { stagger = 0.08, y = 24, trigger } = options;
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

export { Draggable, InertiaPlugin, gsap, ScrollTrigger };

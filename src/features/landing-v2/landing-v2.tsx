"use client";

import { AarthaAi } from "./aartha-ai";
import { Close } from "./close";
import { Cycle } from "./cycle";
import { FeatureRail } from "./feature-rail";
import { Hero } from "./hero";
import styles from "./landing-v2.module.css";
import { Nav } from "./nav";
import { Together } from "./together";
import { Trust } from "./trust";

/**
 * Landing v2 — the dark, GSAP-driven surface.
 *
 * Deliberately separate from `src/features/landing`, which stays exactly as it
 * is and continues to serve `/`. Nothing is shared between the two but the
 * brand strings and the `BrandMark`, so work here cannot regress the live page.
 *
 * The section order is an argument, not a list:
 *
 *   Hero      the promise, and the number that embodies it
 *   Cycle     why the promise is needed — the pinned scene that earns the page
 *   Aartha AI the thing no budget app can answer
 *   Rail      the breadth, once the reader is persuaded there is a point
 *   Together  the two objections that stop people moving their real money in
 *   Trust     why the numbers are safe here
 *   Close     the price and the ask
 *
 * Each section owns its own scenes through `useScene`, so a section can be
 * reordered, removed or reworked without touching any other. Nothing here
 * coordinates them.
 */
export function LandingV2() {
  return (
    <div className={styles.page}>
      {/* Reveals are hidden in CSS so nothing flashes at full opacity before its
          scene builds, which means a reader with no JavaScript would be handed a
          blank page. This puts it all back. It cannot help with a *broken*
          script, only an absent one — but that is the case it is honest to
          cover. */}
      <noscript>
        <style>{`
          [class*="reveal"], [class*="heroTitle"], [class*="closeTitle"] { opacity: 1 !important }
        `}</style>
      </noscript>

      <Nav />

      <main>
        <Hero />
        <Cycle />
        <AarthaAi />
        <FeatureRail />
        <Together />
        <Trust />
        <Close />
      </main>
    </div>
  );
}

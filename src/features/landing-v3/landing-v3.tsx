"use client";

import { Close, Nav } from "./chrome";
import { Hero } from "./hero";
import styles from "./landing-v3.module.css";
import { Proof } from "./proof";
import { Split } from "./split";
import { Tour } from "./tour";

/**
 * Landing v3 — the product, drawn.
 *
 * The second draft. v2 was rejected for being text with placeholder boxes in it,
 * and this is the correction, not a refinement of it: every screen, chart and
 * diagram here is markup, the display type is two steps smaller, and there is
 * one pinned scene rather than three.
 *
 * Five sections instead of seven:
 *
 *   Hero   the number, on two surfaces, in six words
 *   Tour   the one pinned scene: four real screens in one phone
 *   Split  the subtractive argument, as a drawn diagram
 *   Proof  four figures and all thirteen features as tiles
 *   Close  the price and the ask
 *
 * v2 lives on at /v2 and shares nothing with this but the brand strings and the
 * `BrandMark`, so whichever one is dropped takes nothing with it.
 */
export function LandingV3() {
  return (
    <div className={styles.page}>
      {/* Reveals start hidden so nothing flashes before its scene builds, which
          would leave a reader with no JavaScript looking at a blank page. This
          covers an absent script; it cannot help with a broken one. */}
      <noscript>
        <style>{`[class*="reveal"]{opacity:1!important}`}</style>
      </noscript>

      <Nav />

      <main>
        <Hero />
        <Tour />
        <Split />
        <Proof />
        <Close />
      </main>
    </div>
  );
}

"use client";

import { Close, Nav } from "./chrome";
import { Deck } from "./deck";
import { Exploded } from "./exploded";
import { Hero } from "./hero";
import styles from "./landing-v4.module.css";
import { ShaderField } from "./shader-field";

/**
 * Landing v4 — the cycle as an object in space.
 *
 * The third draft. v2 was text with placeholder boxes; v3 drew the product's
 * screens but stayed a flat page of cards. This one commits to a single idea and
 * builds the whole page around it: your month is a loop, so the loop is the
 * hero — thirty days on a ring you turn by scrolling, with the day you are
 * standing on facing you.
 *
 * Four sections, because a page with one strong idea does not need seven:
 *
 *   Hero      the ring, and the figure for the day in front of you
 *   Exploded  a month of salary pulled apart in 3D, ending on what is yours
 *   Deck      thirteen features on a plane that leans with the pointer
 *   Close     the figure once more, at the size it deserves
 *
 * Behind all of it, a fragment shader painting the brand colours (see
 * shader-field.tsx). No 3D library, and no new dependency of any kind.
 */
export function LandingV4() {
  return (
    <div className={styles.page}>
      {/* Reveals start hidden so nothing flashes before its scene builds, which
          would leave a reader with no JavaScript on a blank page. This covers an
          absent script; it cannot help with a broken one. */}
      <noscript>
        <style>{`[class*="reveal"]{opacity:1!important}`}</style>
      </noscript>

      <ShaderField />
      <Nav />

      <main>
        <Hero />
        <Exploded />
        <Deck />
        <Close />
      </main>
    </div>
  );
}

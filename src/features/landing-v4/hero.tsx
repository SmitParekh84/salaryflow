"use client";

import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import { ACCOUNT } from "./cycle";
import { DayRing } from "./day-ring";
import styles from "./landing-v4.module.css";
import { gsap, showNow, useScene } from "./use-gsap";

/**
 * The fold is the object, not the copy.
 *
 * Seven words of headline and one line under it, then the cycle. Everything the
 * reader needs to understand the product is in the ring: a month that starts at
 * payday, a figure for the day they are standing on, and thirty days of shape
 * showing that the figure moves.
 */
export function Hero() {
  const ref = useScene<HTMLElement>((api, root) => {
    const items = root.querySelectorAll<HTMLElement>("[data-item]");

    api.motion(() => {
      // Copy first and quickly, so the reader has the sentence before the ring
      // finishes arriving and has something to look at while it does.
      gsap.fromTo(
        items,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power2.out", stagger: 0.08 },
      );
    });

    api.still(() => showNow(items));
  });

  return (
    <section className={styles.hero} ref={ref}>
      <div className={styles.heroCopy}>
        <p className={`${styles.eyebrow} ${styles.reveal}`} data-item>
          Day {ACCOUNT.today} of {ACCOUNT.daysInCycle}
        </p>
        <h1 className={`${styles.display} ${styles.reveal}`} data-item>
          Your month is a <span className={styles.accent}>loop.</span>
        </h1>
        <p className={`${styles.lead} ${styles.reveal}`} data-item>
          It starts the day you are paid, not the first of the month. Aartha works to
          that loop and tells you what today is worth.
        </p>
        <div className={`${styles.heroActions} ${styles.reveal}`} data-item>
          <Link href="/login?demo=1" className={styles.btn}>
            <Play aria-hidden />
            Open the demo
          </Link>
          <Link href="/waitlist" className={styles.btnGhost}>
            Join the waitlist
            <ArrowRight aria-hidden />
          </Link>
        </div>
        <p className={`${styles.hint} ${styles.reveal}`} data-item>
          Scroll to travel the cycle &middot; move your pointer to look around
        </p>
      </div>

      <DayRing />
    </section>
  );
}

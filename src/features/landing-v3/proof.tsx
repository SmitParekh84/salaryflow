"use client";

import { formatMoney } from "@/lib/utils";
import styles from "./landing-v3.module.css";
import { DEMO, FEATURES } from "./app-mock";
import { EASE_OUT, countTo, gsap, revealIn, showNow, useScene } from "./use-gsap";

/**
 * Four facts as figures, then every feature as a tile.
 *
 * The figures are all things the product does rather than claims about it, and
 * each one is countable, which is why they are figures and not sentences. The
 * tiles are icon-and-name only: the reader needs to know the ground is covered,
 * not to read thirteen descriptions of it.
 */
const FACTS = [
  // Counted from the list rather than written out, so the headline figure cannot
  // drift from the number of tiles printed directly below it.
  { value: FEATURES.length, format: (v: number) => String(v), label: "parts of your money, in one app" },
  { value: 1, format: (v: number) => String(v), label: "number to check each day" },
  { value: 0, format: (v: number) => formatMoney(v), label: "per month in early access" },
  { value: 0, format: (v: number) => String(v), label: "bank logins handed over" },
] as const;

export function Proof() {
  const ref = useScene<HTMLElement>((api, root) => {
    const head = root.querySelectorAll<HTMLElement>("[data-head]");
    const cells = root.querySelectorAll<HTMLElement>("[data-cell]");
    const figures = root.querySelectorAll<HTMLElement>("[data-figure]");
    const tiles = root.querySelectorAll<HTMLElement>("[data-tile]");

    api.motion(() => {
      revealIn(head, { trigger: root, stagger: 0.08 });
      revealIn(cells, { trigger: cells[0], stagger: 0.09, y: 20 });
      // Tiles are small and there are thirteen of them, so the stagger is tight
      // — at the section stagger they would take nearly two seconds to land.
      revealIn(tiles, { trigger: tiles[0], stagger: 0.03, y: 16 });

      figures.forEach((figure, index) => {
        const fact = FACTS[index];
        // A count from zero to zero is a count to nothing, so the two zeroes are
        // written directly rather than tweened.
        if (!fact || fact.value === 0) return;
        countTo(figure, fact.value, fact.format, 1.1);
      });

      gsap.fromTo(
        root.querySelectorAll("[data-bar]"),
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.8,
          ease: EASE_OUT,
          stagger: 0.06,
          transformOrigin: "0 50%",
          scrollTrigger: { trigger: root, start: "top 70%", once: true },
        },
      );
    });

    api.still(() => {
      showNow(head);
      showNow(cells);
      showNow(tiles);
    });
  });

  return (
    <section id="everything" className={styles.section} ref={ref}>
      <div className={`${styles.sectionHead} ${styles.center}`}>
        <p className={`${styles.eyebrow} ${styles.reveal}`} data-head>
          What you get
        </p>
        <h2 className={`${styles.h2} ${styles.reveal}`} data-head>
          Everything that moves your money, <span className={styles.accent}>in one place.</span>
        </h2>
      </div>

      <div className={styles.proof}>
        {FACTS.map((fact) => (
          <div key={fact.label} className={`${styles.proofCell} ${styles.reveal}`} data-cell>
            <strong className={`${styles.proofFigure} ${styles.tnum}`} data-figure>
              {fact.format(fact.value)}
            </strong>
            <span className={styles.proofLabel}>{fact.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.tiles} style={{ marginTop: 20 }}>
        {FEATURES.map(({ Icon, label }) => (
          <span key={label} className={`${styles.tile} ${styles.reveal}`} data-tile>
            <Icon aria-hidden />
            {label}
          </span>
        ))}
      </div>

      <p className={styles.proofLabel} style={{ marginTop: 22, textAlign: "center" }}>
        Every figure on this page comes from one demo account: {formatMoney(DEMO.salary)} a
        month, {formatMoney(DEMO.bills)} of bills, {formatMoney(DEMO.available)} left for the
        cycle.
      </p>
    </section>
  );
}

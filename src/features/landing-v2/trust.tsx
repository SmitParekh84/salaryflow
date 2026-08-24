"use client";

import { CloudOff, Eye, Smartphone, Trash2 } from "lucide-react";
import styles from "./landing-v2.module.css";
import { revealIn, showNow, useScene } from "./use-gsap";

/* Each of these is a property of how the app is actually built, not a promise
   about intent. Offline-first is the sync design in docs/offline-first-sync.md;
   "no bank connection" is true because there is no aggregator integration to
   speak of; the recycle bin is a real screen. */
const POINTS = [
  {
    Icon: CloudOff,
    title: "Works with no signal",
    copy: "Your numbers live on the device and are computed there. Lose connection mid-entry and nothing is lost; it reconciles when you are back.",
  },
  {
    Icon: Eye,
    title: "No bank connection",
    copy: "There is no account to link and no credentials to hand over. You decide what Aartha knows by choosing what you put in it.",
  },
  {
    Icon: Trash2,
    title: "Nothing vanishes",
    copy: "Deleting sends a record to the recycle bin, not into nothing. Balance corrections are stamped and adjusted, never silently overwritten.",
  },
  {
    Icon: Smartphone,
    title: "Install it like an app",
    copy: "Add it to your home screen and it opens like anything else on your phone. No store, no download, no update to remember.",
  },
] as const;

export function Trust() {
  const ref = useScene<HTMLElement>((api, root) => {
    const head = root.querySelectorAll<HTMLElement>("[data-head]");
    const cells = root.querySelectorAll<HTMLElement>("[data-cell]");

    api.motion(() => {
      revealIn(head, { trigger: root, stagger: 0.09 });
      revealIn(cells, { trigger: cells[0], stagger: 0.1, y: 24 });
    });

    api.still(() => {
      showNow(head);
      showNow(cells);
    });
  });

  return (
    <section id="privacy" className={styles.section} ref={ref}>
      <div className={`${styles.sectionHead} ${styles.sectionHeadWide}`}>
        <p className={`${styles.eyebrow} ${styles.reveal}`} data-head>
          Your money, your device
        </p>
        <h2 className={`${styles.h2} ${styles.reveal}`} data-head>
          Built to be trusted with <span className={styles.accent}>the real numbers.</span>
        </h2>
      </div>

      <div className={styles.trustGrid}>
        {POINTS.map(({ Icon, title, copy }) => (
          <div key={title} className={`${styles.trustCell} ${styles.reveal}`} data-cell>
            <Icon aria-hidden />
            <strong>{title}</strong>
            <p>{copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

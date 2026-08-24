"use client";

import { FileUp, Users } from "lucide-react";
import styles from "./landing-v2.module.css";
import { Placeholder } from "./placeholder";
import { gsap, revealIn, showNow, useScene } from "./use-gsap";

/**
 * The two capabilities that answer "but my money is not that simple".
 *
 * Shared spending and statement import are the two things people ask about
 * before they will move their real finances into an app, and the current
 * landing page mentions neither. They sit together because they are the same
 * objection twice: the app has to cope with money you do not control alone, and
 * with the months that happened before you installed it.
 */
export function Together() {
  const ref = useScene<HTMLElement>((api, root) => {
    const head = root.querySelectorAll<HTMLElement>("[data-head]");
    const panels = root.querySelectorAll<HTMLElement>("[data-panel]");
    const arts = root.querySelectorAll<HTMLElement>("[data-art]");

    api.motion(() => {
      revealIn(head, { trigger: root, stagger: 0.09 });
      revealIn(panels, { trigger: panels[0], stagger: 0.12, y: 34 });

      // A slight parallax on the second panel's artwork as the section passes.
      // Deliberately on the art rather than on the panel: the panel is a reveal
      // target, and two tweens driving `y` on one element means the scrub fights
      // the reveal for the first half-second and the card visibly stutters.
      // Small on purpose, too — enough for depth, not enough that a reader
      // trying to look at it is chasing it.
      gsap.to(arts[1], {
        y: -28,
        ease: "none",
        scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: 0.8 },
      });
    });

    api.still(() => {
      showNow(head);
      showNow(panels);
    });
  });

  return (
    <section className={styles.section} ref={ref}>
      <div className={`${styles.sectionHead} ${styles.sectionHeadWide}`}>
        <p className={`${styles.eyebrow} ${styles.reveal}`} data-head>
          Real money is messy
        </p>
        <h2 className={`${styles.h2} ${styles.reveal}`} data-head>
          Split costs and old statements, <span className={styles.accent}>both handled.</span>
        </h2>
      </div>

      <div className={styles.twoUp}>
        <article className={`${styles.panel} ${styles.reveal}`} data-panel>
          <span className={styles.panelTag}>
            <Users aria-hidden />
            Shared spending
          </span>
          <h3 className={styles.h3}>Money you do not spend alone.</h3>
          <p>
            Mark an expense as shared and it stops distorting your own number. Aartha
            tracks what you covered, what came back to you, and what is still outstanding
            &mdash; month by month, so a flatmate settling up in March does not quietly
            rewrite February.
          </p>
          <div className={styles.panelArt} data-art>
            <Placeholder label="Shared spending, one month" ratio="16 / 10" note="/shared" />
          </div>
        </article>

        <article className={`${styles.panel} ${styles.reveal}`} data-panel>
          <span className={styles.panelTag}>
            <FileUp aria-hidden />
            Statement import
          </span>
          <h3 className={styles.h3}>Your history, without the typing.</h3>
          <p>
            Bring in months of bank and card activity in one go. Every row is matched
            against what is already there before anything is written, so a second import
            of the same statement changes nothing rather than doubling your spending.
          </p>
          <div className={styles.panelArt} data-art>
            <Placeholder label="Import review, before committing" ratio="16 / 10" note="/import" />
          </div>
        </article>
      </div>
    </section>
  );
}

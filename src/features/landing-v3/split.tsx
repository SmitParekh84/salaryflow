"use client";

import styles from "./landing-v3.module.css";
import { SplitDiagram } from "./app-mock";
import { EASE_OUT, gsap, showNow, useScene } from "./use-gsap";

/**
 * The subtractive argument, as a diagram rather than as three paragraphs.
 *
 * v2 spent a pinned section and about eighty words making this point. Here the
 * paths draw themselves as the section enters and the reader has it in two
 * seconds without reading anything but four labels and four figures.
 */
export function Split() {
  const ref = useScene<HTMLElement>((api, root) => {
    const head = root.querySelectorAll<HTMLElement>("[data-head]");
    const flows = root.querySelectorAll<SVGPathElement>("[data-flow]");
    const nodes = root.querySelectorAll<SVGElement>("[data-node]");

    api.motion(() => {
      gsap.fromTo(head, { opacity: 0, y: 22 }, {
        opacity: 1, y: 0, duration: 0.7, ease: EASE_OUT, stagger: 0.08,
        scrollTrigger: { trigger: root, start: "top 80%", once: true },
      });

      const timeline = gsap.timeline({
        scrollTrigger: { trigger: root, start: "top 65%", once: true },
      });

      // DrawSVG animates the stroke's visible span, so the line genuinely draws
      // from the salary node outwards. A width or opacity fade would arrive as a
      // finished picture, which is not the same claim.
      timeline
        .fromTo(flows, { drawSVG: "0%" }, {
          drawSVG: "100%", duration: 0.75, ease: "power2.inOut", stagger: 0.13,
        })
        .fromTo(nodes, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.13 }, 0.28);
    });

    api.still(() => {
      showNow(head);
      gsap.set(flows, { drawSVG: "100%" });
      gsap.set(nodes, { opacity: 1 });
    });
  });

  return (
    <section id="how" className={styles.section} ref={ref}>
      <div className={`${styles.sectionHead} ${styles.center}`}>
        <p className={`${styles.eyebrow} ${styles.reveal}`} data-head>
          Where it goes
        </p>
        <h2 className={`${styles.h2} ${styles.reveal}`} data-head>
          Your balance is not <span className={styles.accent}>your money.</span>
        </h2>
      </div>

      <SplitDiagram />
    </section>
  );
}

"use client";

import { formatMoney } from "@/lib/utils";
import { useState, type CSSProperties } from "react";
import { ACCOUNT, AVAILABLE } from "./cycle";
import styles from "./landing-v4.module.css";
import { ScrollTrigger, gsap, showNow, useScene } from "./use-gsap";

/* ---------------------------------------------------------------------------
   One block of money, pulled apart.

   Rebuilt after the first version was rejected, and the criticism was fair. It
   had four problems, all of them the same problem: the slabs were blank.

     · the labels lived in a table off to the right, so the eye had to travel
       between a shape and its name and hold the pairing in memory
     · the salary figure was printed above the stack and the top slab covered it
     · nothing responded to the pointer, so a 3D object read as a flat picture

   Now every slab carries its own name, amount and percentage share, and hovering
   one lifts it while the others fall back — the reader can take the stack apart
   themselves instead of only watching it happen.

   The share is height plus a printed percentage, and deliberately not width:
   width was proportional in the rebuild and had to be reverted, because a slab
   at 30%% of the stack is 132px and its own label needs about 290px, so every
   piece of text overflowed the block it belonged to.
   --------------------------------------------------------------------------- */

const SLABS = [
  { key: "bills", label: "Bills & commitments", amount: ACCOUNT.bills, tone: "warn" },
  { key: "savings", label: "Savings", amount: ACCOUNT.savings, tone: "calm" },
  { key: "investments", label: "Investments", amount: ACCOUNT.investments, tone: "calm" },
  { key: "available", label: "Yours to spend", amount: AVAILABLE, tone: "live" },
] as const;

/** Total column height in px at the desktop size. Slab heights are shares of it. */
const COLUMN = 380;

export function Exploded() {
  const [hovered, setHovered] = useState<number | null>(null);

  const ref = useScene<HTMLElement>((api, root) => {
    const stage = root.querySelector<HTMLElement>("[data-stage]");
    const stack = root.querySelector<HTMLElement>("[data-stack]");
    const slabs = root.querySelectorAll<HTMLElement>("[data-slab]");
    const head = root.querySelectorAll<HTMLElement>("[data-head]");

    api.pinned(() => {
      if (!stage || !stack) return;

      gsap.fromTo(head, { opacity: 0, y: 22 }, {
        opacity: 1, y: 0, duration: 0.8, ease: "power2.out", stagger: 0.08,
        scrollTrigger: { trigger: stage, start: "top 70%", once: true },
      });

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: stage, start: "top top", end: "bottom bottom", scrub: 0.8 },
      });

      timeline
        // Turn towards the reader while the block is still whole. It ends nearly
        // flat-on, because the slabs now carry text and text on a steeply
        // rotated plane is unreadable.
        .fromTo(stack, { rotateX: 46, rotateZ: -22 }, { rotateX: 4, rotateZ: -1.5, duration: 0.45 })
        // `from: "end"` so the slab they keep is the last to move: the reader
        // watches the commitments leave and what stays behind is theirs, which
        // is the argument in the right order.
        .to(slabs, { "--gap": 1, duration: 0.45, stagger: { each: 0.08, from: "end" } }, 0.3)
        .to(slabs, { "--ink": 1, duration: 0.25, stagger: { each: 0.08, from: "end" } }, 0.36);

      ScrollTrigger.refresh();
    });

    const settle = () => {
      showNow(head);
      gsap.set(stack, { rotateX: 0, rotateZ: 0 });
      gsap.set(slabs, { "--gap": 1, "--ink": 1 });
    };

    api.narrow(settle);
    api.still(settle);
  });

  return (
    <section id="split" className={styles.sectionDeep} ref={ref}>
      <div className={styles.explodeStage} data-stage>
        <div className={styles.explodePin}>
          <div className={styles.explodeCopy}>
            <p className={`${styles.eyebrow} ${styles.reveal}`} data-head>
              Where it goes
            </p>
            <h2 className={`${styles.h2} ${styles.reveal}`} data-head>
              Your balance is one block.
              <br />
              <span className={styles.accent}>Almost none of it is yours.</span>
            </h2>
            <p className={`${styles.lead} ${styles.reveal}`} data-head>
              Scroll to pull a month of salary apart &mdash; or hover a piece to lift it
              out. Each block is as tall as its share of {formatMoney(ACCOUNT.salary)}.
            </p>
          </div>

          <div className={styles.explodeStack3d}>
            {/*
              The salary total sits beside the stack, not above it: printed above,
              the top slab rose straight through it as the block came apart.
            */}
            <p className={styles.stackTotal}>
              <span>One month</span>
              <b className={styles.tnum}>{formatMoney(ACCOUNT.salary)}</b>
            </p>

            <div
              className={styles.stack}
              data-stack
              style={{ "--column": `${COLUMN}px` } as CSSProperties}
              onPointerLeave={() => setHovered(null)}
            >
              {SLABS.map((slab, index) => (
                <div
                  key={slab.key}
                  className={`${styles.slab} ${styles[slab.tone]} ${
                    hovered === index ? styles.slabHot : ""
                  } ${hovered !== null && hovered !== index ? styles.slabDim : ""}`}
                  data-slab
                  onPointerEnter={() => setHovered(index)}
                  style={
                    {
                      "--share": slab.amount / ACCOUNT.salary,
                      // Each slab lifts further than the one below it, so the
                      // stack opens evenly instead of sliding as a unit.
                      "--rank": SLABS.length - index,
                    } as CSSProperties
                  }
                >
                  <span className={styles.slabName}>{slab.label}</span>
                  <b className={`${styles.slabAmount} ${styles.tnum}`}>
                    {formatMoney(slab.amount)}
                  </b>
                  <span className={`${styles.slabShare} ${styles.tnum}`}>
                    {Math.round((slab.amount / ACCOUNT.salary) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { formatMoney } from "@/lib/utils";
import { ArrowRight, PiggyBank, ReceiptText, TrendingUp } from "lucide-react";
import { useRef } from "react";
import styles from "./landing-v2.module.css";
import { EASE_OUT, gsap, showNow, useScene } from "./use-gsap";

/* The demo account the whole page cites. One set of figures everywhere: a
   landing page that says ₹85,000 in one section and ₹90,000 in the next reads
   as carelessness about exactly the thing it is asking to be trusted with. */
const SALARY = 85_000;
const COMMITMENTS = [
  { Icon: ReceiptText, label: "Bills", amount: 25_298 },
  { Icon: PiggyBank, label: "Savings", amount: 15_000 },
  { Icon: TrendingUp, label: "Investments", amount: 10_000 },
] as const;
const AVAILABLE = SALARY - COMMITMENTS.reduce((sum, item) => sum + item.amount, 0);
const SAFE_TODAY = 1029;

/**
 * The page's one pinned scene.
 *
 * The argument the product is built on is subtractive — the balance is not
 * yours, here is what is already spoken for, here is what is left — and that is
 * an argument that reads far better performed than described. So the number
 * counts down while each commitment leaves, one per scroll gesture, and the
 * reader arrives at the daily figure having watched it be derived.
 *
 * The pin is `position: sticky` inside a tall stage, not a scroll hijack: the
 * scrollbar stays honest and someone flicking past at speed is not held.
 */
export function Cycle() {
  const numberRef = useRef<HTMLSpanElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);

  const ref = useScene<HTMLElement>((api, root) => {
    const number = numberRef.current;
    const caption = captionRef.current;
    const chips = root.querySelectorAll<HTMLElement>("[data-chip]");
    const verdict = root.querySelector<HTMLElement>("[data-verdict]");
    const stage = root.querySelector<HTMLElement>("[data-stage]");
    const head = root.querySelectorAll<HTMLElement>("[data-head]");

    const write = (value: number) => {
      if (number) number.textContent = formatMoney(value);
    };

    api.pinned(() => {
      gsap.fromTo(head, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.8, ease: EASE_OUT, stagger: 0.08,
        scrollTrigger: { trigger: stage, start: "top 70%", once: true },
      });

      // One timeline scrubbed across the stage's whole scroll distance. Each
      // commitment gets an equal share, so adding a fourth lengthens the stage
      // in CSS rather than making the existing three race past.
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.7,
        },
      });

      // One object tweened down through the commitments in turn, rather than a
      // fresh one per step. Scrubbing backwards then reverses the same tweens,
      // so the figure climbs back to the salary on the way up without any
      // reverse-specific arithmetic.
      const state = { value: SALARY };
      let running = SALARY;

      COMMITMENTS.forEach((commitment, index) => {
        const chip = chips[index];
        running -= commitment.amount;

        timeline
          .to({}, { duration: 0.12 })
          .fromTo(
            chip,
            { opacity: 0, scale: 0.9, y: 18 },
            { opacity: 1, scale: 1, y: 0, duration: 0.3, ease: EASE_OUT },
          )
          .to(
            state,
            {
              value: running,
              duration: 0.5,
              // Whole rupees on every frame. Tweening the raw value printed
              // ₹72,431.8153 for most of the animation, which reads as a
              // rendering fault rather than as a figure coming down.
              snap: { value: 1 },
              onUpdate: () => write(state.value),
            },
            "<",
          )
          // The chip dims once its money has been taken out of the figure: it
          // is now a statement about the past, and leaving three of them at
          // full strength competed with the number they were explaining.
          .to(chip, { opacity: 0.45, duration: 0.25 });
      });

      timeline
        .to({}, { duration: 0.2 })
        .call(() => {
          if (caption) caption.textContent = "Available this cycle";
        })
        .fromTo(
          verdict,
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.5, ease: EASE_OUT },
        );

      // Scrubbing backwards has to restore the caption too, or scrolling up
      // leaves "Available this cycle" over the full salary figure.
      timeline.eventCallback("onReverseComplete", () => {
        if (caption) caption.textContent = "In your account";
        write(SALARY);
      });
    });

    // Two fallbacks, one for each reason the scene may not run: the reader asked
    // for less motion, or the viewport is too narrow for the stage to exist. In
    // both cases the section still has to make its point, so it states the end
    // of the story rather than the start of it.
    const settle = () => {
      showNow(head);
      showNow(chips);
      showNow(verdict);
      gsap.set(chips, { opacity: 1 });
      write(AVAILABLE);
      if (caption) caption.textContent = "Available this cycle";
    };

    api.still(settle);
    api.narrow(settle);
  });

  return (
    <section id="cycle" className={styles.sectionLift} ref={ref}>
      <div className={styles.cycleStage} data-stage>
        <div className={styles.cyclePin}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-head>
            The real problem
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-head style={{ marginTop: 18 }}>
            Your bank balance is <span className={styles.accent}>not your money.</span>
          </h2>
          <p
            className={`${styles.lead} ${styles.reveal}`}
            data-head
            style={{ marginTop: 20, marginLeft: "auto", marginRight: "auto" }}
          >
            Most of what is sitting in your account already has a job. Aartha takes each
            one out in front of you, so what is left is a number you can actually act on.
          </p>

          <div className={styles.cycleBoard}>
            <p className={styles.cycleCaption} ref={captionRef}>
              In your account
            </p>
            <strong className={`${styles.cycleNumber} ${styles.figure}`} ref={numberRef}>
              &#8377;85,000
            </strong>

            <div className={styles.cycleChips}>
              {COMMITMENTS.map(({ Icon, label, amount }) => (
                <span key={label} className={`${styles.cycleChip} ${styles.reveal}`} data-chip>
                  <Icon aria-hidden />
                  <b className={styles.figure}>&minus;{formatMoney(amount)}</b>
                  <span>{label}</span>
                </span>
              ))}
            </div>

            <div className={`${styles.cycleVerdict} ${styles.reveal}`} data-verdict>
              <ArrowRight aria-hidden style={{ color: "var(--cyan)" }} />
              <span className={styles.h3}>
                Which makes{" "}
                <span className={`${styles.accentCyan} ${styles.figure}`}>
                  {formatMoney(SAFE_TODAY)}
                </span>{" "}
                safe to spend today.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

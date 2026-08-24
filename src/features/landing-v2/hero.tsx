"use client";

import { formatMoney } from "@/lib/utils";
import { ArrowRight, CalendarDays, Check, Clock, Play, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import styles from "./landing-v2.module.css";
import { EASE_OUT, countTo, gsap, showNow, splitHeading, useScene } from "./use-gsap";

const CHECKS = ["Bills accounted for", "Savings protected", "Investments included"];

const TRUST = [
  { Icon: ShieldCheck, label: "No bank connection" },
  { Icon: Check, label: "Private by design" },
  { Icon: Clock, label: "Set up in minutes" },
];

/** The safe-to-spend figure, matching the demo account the whole page cites. */
const SAFE_TODAY = 1029;

export function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const ref = useScene<HTMLElement>((api, root) => {
    const title = titleRef.current;
    const number = numberRef.current;
    const card = cardRef.current;
    const items = root.querySelectorAll<HTMLElement>("[data-hero-item]");

    api.motion(() => {
      // The headline arrives by character, everything under it by block. Doing
      // the whole hero character by character would take about four seconds to
      // finish, and the reader is already looking at the CTA by then.
      const timeline = gsap.timeline({ defaults: { ease: EASE_OUT } });

      if (title) {
        // The heading is hidden in CSS and revealed here in the same frame the
        // characters are pushed below their line. Without that pairing there is
        // one painted frame of the finished headline before the split applies,
        // which reads as the page glitching on load.
        const split = splitHeading(title);
        timeline
          .set(title, { opacity: 1 })
          .from(split.chars, { yPercent: 120, duration: 0.9, stagger: 0.014 });
      }

      timeline
        .fromTo(items, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.32)
        .fromTo(
          card,
          { opacity: 0, y: 42, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 1 },
          0.18,
        );

      if (number) countTo(number, SAFE_TODAY, 1.4);

      // The card drifts up and dims as the hero leaves. Tied to the hero's own
      // scroll range rather than the viewport so it finishes exactly as the
      // next section takes over, and scrubbed so it tracks the reader's scroll
      // instead of playing at its own pace over the top of it.
      if (card) {
        gsap.to(card, {
          y: -80,
          opacity: 0.35,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      }
    });

    api.still(() => {
      if (title) showNow(title);
      showNow(items);
      showNow(card);
      if (number) number.textContent = formatMoney(SAFE_TODAY);
    });
  });

  return (
    <section className={styles.hero} ref={ref}>
      <div className={styles.aurora} aria-hidden>
        <i />
        <i />
        <i />
      </div>

      <div className={styles.heroCopy}>
        <p className={`${styles.eyebrow} ${styles.reveal}`} data-hero-item>
          Salary-cycle money app
        </p>

        <h1 className={`${styles.display} ${styles.heroTitle}`} ref={titleRef}>
          Know what&rsquo;s <span className={styles.accent}>safe to spend</span> today.
        </h1>

        <p className={`${styles.lead} ${styles.reveal}`} data-hero-item>
          Your salary, bills, goals, investments and shared costs become one calm daily
          number &mdash; paced to your next payday, and recalculated every time something
          changes.
        </p>

        <div className={`${styles.heroActions} ${styles.reveal}`} data-hero-item>
          <Link href="/waitlist" className={styles.btnPrimary}>
            Join the waitlist
            <ArrowRight aria-hidden />
          </Link>
          <Link href="/login?demo=1" className={styles.btnGhost}>
            <Play aria-hidden />
            Explore live demo
          </Link>
        </div>

        <div className={`${styles.trustRow} ${styles.reveal}`} data-hero-item>
          {TRUST.map(({ Icon, label }) => (
            <span key={label}>
              <Icon aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.heroVisual}>
        <div className={`${styles.glass} ${styles.reveal}`} ref={cardRef}>
          <div className={styles.cardTop}>
            <span className={styles.cardLabel}>Safe to spend today</span>
            <span className={styles.livePill}>
              <i />
              Updated today
            </span>
          </div>

          {/* Starts at the final figure rather than at zero: if the script never
              runs, the card still states the number the page is about. The
              counter overwrites it from 0 on its first frame. */}
          <strong className={`${styles.bigNumber} ${styles.figure}`} ref={numberRef}>
            &#8377;1,029
          </strong>

          <p className={styles.cardMeta}>
            <CalendarDays aria-hidden />
            12 days until payday
          </p>

          <div className={styles.cardDivider} />

          <div className={styles.cardChecks}>
            {CHECKS.map((check) => (
              <span key={check}>
                <Check aria-hidden />
                {check}
              </span>
            ))}
          </div>

          <p className={styles.onTrack}>
            <Check aria-hidden />
            You&rsquo;re on track
          </p>
        </div>
      </div>
    </section>
  );
}

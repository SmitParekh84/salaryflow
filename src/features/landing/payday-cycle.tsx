"use client";

import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { CalendarDays, PiggyBank, ReceiptText, Wallet } from "lucide-react";
import { useRef, useState } from "react";
import styles from "./landing.module.css";
import { SectionHeading } from "./section";

const STOPS = [
  { Icon: CalendarDays, title: "25 Aug", copy: "Payday" },
  { Icon: ReceiptText, title: "Protected", copy: "Bills" },
  { Icon: PiggyBank, title: "Reserved", copy: "Goals" },
  { Icon: Wallet, title: "₹1,029", copy: "Today" },
  { Icon: CalendarDays, title: "25 Sep", copy: "Next payday" },
] as const;

/**
 * The one section on the page that holds the reader still.
 *
 * The brand idea is a controlled flow from payday to payday, so this is the
 * section that earns a pinned scroll: the track stays on screen while the
 * reader scrolls through the cycle a stop at a time, and the rail fills behind
 * them. Every other section reveals and gets out of the way.
 *
 * The pin is CSS `position: sticky` inside a tall stage, not a JS scroll
 * hijack — the scrollbar stays honest, the back button works, and a reader who
 * flicks past at speed is not held hostage. Below 900px the stage collapses to
 * its natural height (see landing.module.css) and this reads as an ordinary
 * section that happens to fill its rail as it passes.
 */
export function PaydayCycle() {
  const stageRef = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start start", "end end"],
  });

  // Ease the raw progress so the rail does not twitch with a trackpad.
  const eased = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.3 });
  const fill = useTransform(eased, [0.04, 0.92], [0, 1], { clamp: true });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(STOPS.length - 1, Math.max(0, Math.floor(v * STOPS.length)));
    setActive(next);
  });

  return (
    <section className={styles.cycleSection}>
      <div className={styles.cycleStage} ref={stageRef}>
        <div className={styles.cyclePin}>
          <SectionHeading
            eyebrow="Built around your payday"
            copy="Calendar months are arbitrary. Your real financial rhythm begins when your salary arrives."
          >
            Your month starts when <span>you get paid.</span>
          </SectionHeading>

          <div className={styles.cycleTrack}>
            <div className={styles.cycleRail} aria-hidden>
              <motion.i style={still ? { scaleX: 1 } : { scaleX: fill }} />
            </div>

            {STOPS.map(({ Icon, title, copy }, index) => {
              const on = still || index <= active;
              return (
                <div
                  key={`${title}-${copy}`}
                  className={`${styles.cycleStop} ${on ? styles.cycleStopOn : ""} ${
                    index === active && !still ? styles.cycleToday : ""
                  }`}
                >
                  <Icon />
                  <strong>{title}</strong>
                  <span>{copy}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

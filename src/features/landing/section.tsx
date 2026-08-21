"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import styles from "./landing.module.css";

/**
 * Motion primitives shared by the landing page and the marketing pages, so both
 * animate and set type identically.
 *
 * One easing family for the whole surface. `SPRING` is the only transition that
 * moves anything; everything else is a duration on the CSS tokens in
 * landing.module.css. Under `prefers-reduced-motion` the travel is dropped and
 * the opacity fade survives — a reader who asked for less motion still gets the
 * cue that content arrived, just without the movement.
 */
export const SPRING = { type: "spring", duration: 0.5, bounce: 0.2 } as const;

const TRAVEL = 24;
const STAGGER = 0.06;

/** How the group's children are released. The group itself never moves. */
export const groupVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: STAGGER, delayChildren: 0.04 } },
};

export function useItemVariants(): Variants {
  const still = useReducedMotion();
  return {
    hidden: { opacity: 0, y: still ? 0 : TRAVEL },
    shown: { opacity: 1, y: 0, transition: SPRING },
  };
}

/**
 * A single element that fades and rises into view once.
 *
 * `amount: 0.15` fires when 15% of the element is visible, which for a tall
 * card means it starts before the reader is looking straight at it — the reveal
 * should be finished by the time it has their attention, not performed for them.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const still = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: still ? 0 : TRAVEL }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -80px 0px" }}
      transition={{ ...SPRING, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Wraps a row or grid so its children arrive one after another rather than
 * together. Pair with `RevealItem`; a `RevealItem` outside a `RevealGroup` will
 * never leave its hidden state, because nothing drives it to `shown`.
 */
export function RevealGroup({
  children,
  className = "",
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount, margin: "0px 0px -80px 0px" }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  const variants = useItemVariants();
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  children,
  copy,
}: {
  eyebrow: string;
  children: ReactNode;
  copy?: string;
}) {
  return (
    <RevealGroup className={styles.sectionHeading} amount={0.3}>
      <RevealItem>
        <p className={styles.eyebrow}>{eyebrow}</p>
      </RevealItem>
      <RevealItem>
        <h2>{children}</h2>
      </RevealItem>
      {copy && (
        <RevealItem>
          <p className={styles.sectionCopy}>{copy}</p>
        </RevealItem>
      )}
    </RevealGroup>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import styles from "./landing.module.css";
import { RevealItem } from "./section";

/**
 * The landing FAQ.
 *
 * Replaces a native `<details>`, which has no open/close animation at all: the
 * answer appeared instantly and shoved everything below it down by its own
 * height. This is the most-interacted control on the page after the buttons, so
 * it is worth the component.
 *
 * `height: auto` in a Framer `animate` target is what makes this
 * interruptible — clicking a second row while the first is still opening
 * retargets from the height it has reached rather than restarting from zero.
 * CSS keyframes cannot do that, which is the reason this is not a class toggle.
 *
 * The answer stays mounted in both states and is only clipped by
 * `overflow: hidden`, never unmounted. The same copy is emitted as `FAQPage`
 * structured data in structured-data.tsx, and markup that does not match the
 * visible page is treated as spam — so lazy-mounting the answers would be an
 * SEO regression, not an optimisation.
 *
 * Renders `RevealItem` rows and nothing else, so it must stay inside the
 * `RevealGroup` in landing-hero.tsx: a `RevealItem` with no group above it has
 * nothing to drive it to `shown` and stays invisible.
 */
export function FaqAccordion({ items }: { items: readonly (readonly [string, string])[] }) {
  // One open at a time, and the first open on load — the same starting state
  // the `open={index === 0}` attribute used to give.
  const [openIndex, setOpenIndex] = useState(0);
  const still = useReducedMotion();

  return (
    <>
      {items.map(([question, answer], index) => {
        const isOpen = index === openIndex;
        return (
          <RevealItem key={question}>
            <div className={styles.faqRow}>
              <button
              type="button"
              className={styles.faqSummary}
              aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
                id={`faq-question-${index}`}
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
              >
                {question}
                <ChevronDown aria-hidden />
              </button>
              <motion.div
                id={`faq-answer-${index}`}
                role="region"
                aria-labelledby={`faq-question-${index}`}
                /*
                 * `initial={false}` adopts the current target as the starting
                 * state instead of animating towards it. Without it every row
                 * animates up from height 0 on mount and the whole section
                 * reflows on load.
                 */
                initial={false}
                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                /*
                 * Under reduced motion the height snaps and only the opacity
                 * fades: the height change is the part that moves the page, and
                 * a reader who asked for less motion should still get the cue
                 * that the answer arrived. 260ms to open, 200ms to close —
                 * closing is faster because the reader has already decided.
                 */
                transition={
                  still
                    ? { height: { duration: 0 }, opacity: { duration: 0.15 } }
                    : {
                        height: { duration: isOpen ? 0.26 : 0.2, ease: [0.23, 1, 0.32, 1] },
                        opacity: { duration: isOpen ? 0.26 : 0.15, ease: [0.23, 1, 0.32, 1] },
                      }
                }
                style={{ overflow: "hidden" }}
              >
                <p>{answer}</p>
              </motion.div>
            </div>
          </RevealItem>
        );
      })}
    </>
  );
}

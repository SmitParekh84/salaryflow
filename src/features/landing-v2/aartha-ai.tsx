"use client";

import { BRAND } from "@/lib/brand";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import styles from "./landing-v2.module.css";
import { Placeholder } from "./placeholder";
import { revealIn, showNow, useScene } from "./use-gsap";

/* What the adviser is actually given. Drawn from the fields the app records for
   it (see features/chat/about-you-form.tsx) rather than invented: a landing page
   that promises the assistant knows something it was never told is a promise
   the product breaks on first use. */
const CONTEXT = [
  "Your salary, payday and where this cycle stands",
  "Every bill and commitment you have entered",
  "Goals you are saving towards, and their deadlines",
  "People who depend on your income, and any loans",
  "Life and health cover you already hold",
];

/**
 * The conversation is a single exchange, not a scripted demo reel.
 *
 * One question and one answer that could not be produced by a budget app — it
 * needs the salary cycle, the bills, the goal and the cover all at once. A
 * longer thread tested worse: readers stopped reading at the third bubble and
 * the point was already made by the second.
 */
const THREAD = [
  {
    who: "you" as const,
    text: "Can I book a ₹40,000 trip for December?",
  },
  {
    who: "ai" as const,
    text: "Not out of this cycle — that would take today's safe number to zero for eleven days. But you are ₹15,000 ahead on the emergency goal, and December is three paydays out. Put ₹13,400 aside each cycle and it is covered without touching your bills or the goal deadline.",
  },
] as const;

export function AarthaAi() {
  const ref = useScene<HTMLElement>((api, root) => {
    const copy = root.querySelectorAll<HTMLElement>("[data-copy]");
    const bubbles = root.querySelectorAll<HTMLElement>("[data-bubble]");
    const art = root.querySelectorAll<HTMLElement>("[data-art]");

    api.motion(() => {
      revealIn(copy, { trigger: root, stagger: 0.09 });

      // The bubbles arrive in reading order with a real gap between them, so
      // the exchange reads as a reply rather than as two blocks appearing. The
      // 0.45s stagger is roughly how long the question takes to read.
      revealIn(bubbles, { trigger: bubbles[0], stagger: 0.45, y: 18 });
      revealIn(art, { trigger: art[0], y: 22 });
    });

    api.still(() => {
      showNow(copy);
      showNow(bubbles);
      showNow(art);
    });
  });

  return (
    <section id="ai" className={styles.section} ref={ref}>
      <div className={styles.aiGrid}>
        <div>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-copy>
            {BRAND.assistantName}
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-copy style={{ marginTop: 18 }}>
            An adviser that has <span className={styles.accent}>read your numbers.</span>
          </h2>
          <p className={`${styles.lead} ${styles.reveal}`} data-copy style={{ marginTop: 22 }}>
            Not a chatbot bolted onto a budget app. {BRAND.assistantName} answers with your
            salary cycle, your commitments and your goals already in hand &mdash; so the
            answer is about your money, not about money in general.
          </p>

          <div className={`${styles.aiKnows} ${styles.reveal}`} data-copy>
            {CONTEXT.map((item) => (
              <span key={item}>
                <Check aria-hidden />
                {item}
              </span>
            ))}
          </div>

          <div className={styles.reveal} data-copy style={{ marginTop: 34 }}>
            <Link href="/waitlist" className={styles.btnGhost}>
              Ask it yourself
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </div>

        <div>
          <div className={styles.thread}>
            {THREAD.map((message) => (
              <div
                key={message.who}
                className={`${styles.bubble} ${styles.reveal} ${
                  message.who === "ai" ? styles.bubbleAi : styles.bubbleUser
                }`}
                data-bubble
              >
                {message.who === "ai" ? (
                  <p className={styles.bubbleWho}>
                    <Sparkles aria-hidden />
                    {BRAND.assistantName}
                  </p>
                ) : null}
                {message.text}
              </div>
            ))}
          </div>

          <div className={styles.reveal} data-art style={{ marginTop: 26 }}>
            <Placeholder
              label={`${BRAND.assistantName} conversation, in the app`}
              ratio="4 / 5"
              note="/assistant on mobile"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

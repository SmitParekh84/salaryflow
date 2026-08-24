"use client";

import { BRAND } from "@/lib/brand";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import styles from "./site.module.css";
import { Rise, SectionPage } from "./site-shell";
import { WaitlistForm } from "./waitlist-form";

/**
 * Waitlist.
 *
 * One field, and the demo offered beside it. Anyone willing to hand over an
 * address will usually rather look first, and a page that only collects the
 * address loses them.
 */
const ON_THE_DAY = [
  "An invite to a real account, not a sandbox",
  "The salary plan, bills, goals and investments, all of it",
  `${BRAND.assistantName}, with your own numbers in hand`,
  "Statement import, so the first month is not typed in by hand",
  "Free, with no card and no trial clock",
];

export function WaitlistView() {
  return (
    <SectionPage
      hero={{
        eyebrow: "Early access",
        title: (
          <>
            Leave an address, and <span className={styles.accentWord}>nothing else.</span>
          </>
        ),
        lede: "No name, no phone number, no card. One field, and only early-access updates — nothing else is ever sent to it.",
      }}
    >
      <Rise className={`${styles.section} ${styles.band}`} as="section">
        <div className={styles.reveal} data-rise>
          <WaitlistForm id="waitlist-page" />
        </div>

        <p className={`${styles.lead} ${styles.reveal}`} data-rise style={{ marginTop: 28 }}>
          Would rather look first? The demo is a full seeded account, and it needs no address
          at all.
        </p>

        <div className={styles.reveal} data-rise style={{ marginTop: 20 }}>
          <Link href="/login?demo=1" className={styles.btnQuiet}>
            Open the demo
            <ArrowRight aria-hidden />
          </Link>
        </div>
      </Rise>

      <Rise className={styles.section} as="section">
        <div className={styles.sectionHead}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
            What you get
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-rise>
            On the day you are let in.
          </h2>
        </div>

        <ul className={`${styles.tickList} ${styles.reveal}`} data-rise>
          {ON_THE_DAY.map((item) => (
            <li key={item}>
              <Check aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </Rise>
    </SectionPage>
  );
}

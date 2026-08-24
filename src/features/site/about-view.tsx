"use client";

import { BRAND } from "@/lib/brand";
import { formatMoney } from "@/lib/utils";
import { CloudOff, Eye, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { DemoButton } from "./demo-button";
import styles from "./site.module.css";
import { Rise, SectionPage } from "./site-shell";

/**
 * About.
 *
 * Not a company page — Aartha has no company story worth a page yet. It is the
 * argument the product is built on, stated once and at length, for the reader
 * who wants to know why it works the way it does before trusting it with real
 * figures.
 */
const SALARY = 85_000;
const BILLS = 25_298;
const AVAILABLE = 34_702;
const SAFE_TODAY = 1_029;

const PRINCIPLES = [
  {
    Icon: Eye,
    title: "One number, not a dashboard",
    body: "Every screen in the app exists to produce a single figure for today. If a feature cannot change that figure, it does not belong on the home screen.",
  },
  {
    Icon: CloudOff,
    title: "The device is the source",
    body: "Your numbers are held and computed on your own device and reconciled underneath. That is what lets the app work on a phone with no signal, and it means there is no server deciding what you are allowed to see.",
  },
  {
    Icon: Trash2,
    title: "Nothing disappears quietly",
    body: "Deleting sends a record to the recycle bin. A balance correction is stamped and adjusted rather than overwritten, so the history of a number is always recoverable.",
  },
  {
    Icon: Sparkles,
    title: "Advice with the numbers in hand",
    body: `${BRAND.assistantName} answers using your salary cycle, your commitments and your goals. General financial advice is easy to find and worth what you pay for it.`,
  },
];

export function AboutView() {
  return (
    <SectionPage
      hero={{
        eyebrow: "About",
        title: (
          <>
            A calendar month is not <span className={styles.accentWord}>your month.</span>
          </>
        ),
        lede: "Aartha is built around the salary cycle, because that is the rhythm people are actually paid on — and almost no money app is.",
      }}
    >
      <Rise className={`${styles.section} ${styles.band}`} as="section">
        <div className={styles.sectionHead}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
            The problem
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-lines>
            Your balance is the least useful number you own.
          </h2>
        </div>

        <div className={styles.reveal} data-rise>
          <p className={styles.lead}>
            {formatMoney(SALARY)} lands and the account says {formatMoney(SALARY)}. But{" "}
            {formatMoney(BILLS)} of it is rent and bills that have not left yet, some is going to
            savings, some to investments. What is genuinely free to spend is{" "}
            {formatMoney(AVAILABLE)} — and spread across the days until the next payday, that is{" "}
            {formatMoney(SAFE_TODAY)} today.
          </p>
          <p className={styles.lead} style={{ marginTop: 18 }}>
            Nobody does that arithmetic every morning. So people either check their balance and
            overspend, or they keep a spreadsheet, or they simply stop looking. Aartha exists to
            do the arithmetic and hand over the one figure it produces.
          </p>
        </div>
      </Rise>

      <Rise className={styles.section} as="section">
        <div className={styles.sectionHead}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
            How it is built
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-lines>
            Four decisions everything else follows from.
          </h2>
        </div>

        <div className={styles.cardGrid}>
          {PRINCIPLES.map(({ Icon, title, body }) => (
            <div key={title} className={`${styles.cardCell} ${styles.reveal}`} data-rise>
              <Icon aria-hidden />
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </Rise>

      <Rise className={`${styles.section} ${styles.band}`} as="section">
        <div className={styles.sectionHead}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
            Where it is
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-lines>
            Early access, and honest about it.
          </h2>
          <p className={`${styles.lead} ${styles.reveal}`} data-rise>
            {BRAND.name} is new and small. Everything described on this site is built and
            working, and the demo account is the whole app with real data in it &mdash; but it is
            early, and the fastest way to find out whether it suits you is to open it.
          </p>
        </div>
        <div className={`${styles.heroActions} ${styles.reveal}`} data-rise>
          <DemoButton />
          <Link href="/contact" className={styles.btnQuiet}>
            Get in touch
          </Link>
        </div>
      </Rise>
    </SectionPage>
  );
}

"use client";

import { BRAND } from "@/lib/brand";
import { ArrowRight, Check, CloudOff, Eye, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import styles from "./site.module.css";
import { Rise, SectionPage } from "./site-shell";

/**
 * Pricing.
 *
 * The price is ₹0, so the page's real job is not to justify a number — it is to
 * answer the question a free money app immediately raises: what is funding it,
 * and what happens to my data. Stating the price and then dodging that is what
 * makes free look expensive.
 */
const INCLUDED = [
  "Every one of the thirteen parts of the app",
  "Aartha AI, with your own numbers in hand",
  "Unlimited accounts, bills, goals and investments",
  "Statement import, and shared spending",
  "Offline use, and installing it as an app",
];

const NOT_FUNDING = [
  {
    Icon: Eye,
    title: "Not advertising",
    body: "There are no ads and no ad network, so nothing about you is worth selling to one.",
  },
  {
    Icon: Wallet,
    title: "Not selling your data",
    body: "There is no data business here. The app has no bank connection to harvest and nothing to broker.",
  },
  {
    Icon: CloudOff,
    title: "Not a trial that expires",
    body: "No feature stops working after a month, and nothing you have entered is held behind a paywall later.",
  },
];

export function PricingView() {
  return (
    <SectionPage
      hero={{
        eyebrow: "Pricing",
        title: (
          <>
            Free while {BRAND.name} is in <span className={styles.accentWord}>early access.</span>
          </>
        ),
        lede: "No card, no trial clock, and no feature held back. When that changes, it will change with notice and not quietly.",
      }}
    >
      <Rise className={`${styles.section} ${styles.band}`} as="section">
        <div className={`${styles.priceBlock} ${styles.reveal}`} data-rise>
          <span className={`${styles.priceValue} ${styles.tnum}`}>&#8377;0</span>
          <span className={styles.priceUnit}>per month, no card needed</span>
        </div>

        <div className={styles.reveal} data-rise style={{ marginTop: 34 }}>
          <p className={styles.eyebrow}>What that includes</p>
          <ul
            style={{ display: "grid", gap: 12, listStyle: "none", margin: "18px 0 0", padding: 0 }}
          >
            {INCLUDED.map((item) => (
              <li
                key={item}
                style={{ alignItems: "center", display: "flex", gap: 12, fontSize: "15px" }}
              >
                <Check aria-hidden style={{ color: "var(--accent)", height: 16, width: 16, flex: "none" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.reveal} data-rise style={{ marginTop: 36 }}>
          <Link href="/login?demo=1" className={styles.btn}>
            Open the demo
            <ArrowRight aria-hidden />
          </Link>
        </div>
      </Rise>

      <Rise className={styles.section} as="section">
        <div className={styles.sectionHead}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
            And not at your expense
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-rise>
            Free usually has a funding model behind it.
          </h2>
          <p className={`${styles.lead} ${styles.reveal}`} data-rise>
            Here is what is not funding this one.
          </p>
        </div>

        <div className={styles.cardGrid}>
          {NOT_FUNDING.map(({ Icon, title, body }) => (
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
            <Sparkles aria-hidden style={{ display: "none" }} />
            When it stops being free
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-rise>
            You will hear it from us first.
          </h2>
          <p className={`${styles.lead} ${styles.reveal}`} data-rise>
            If Aartha ever charges, everyone on the waitlist and everyone already using it will
            be told before it happens, not billed and informed afterwards. Nothing you have
            entered will be locked behind the change.
          </p>
        </div>
        <div className={styles.reveal} data-rise>
          <Link href="/waitlist" className={styles.btnQuiet}>
            Join the waitlist
            <ArrowRight aria-hidden />
          </Link>
        </div>
      </Rise>
    </SectionPage>
  );
}

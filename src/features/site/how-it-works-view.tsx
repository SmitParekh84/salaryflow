"use client";

import { BRAND } from "@/lib/brand";
import { formatMoney } from "@/lib/utils";
import { ArrowRight, CalendarClock, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { DemoButton } from "./demo-button";
import styles from "./site.module.css";
import { Rise, SectionPage } from "./site-shell";

/**
 * How it works.
 *
 * The landing page states the conclusion; this page shows the arithmetic. Every
 * figure comes from the same demo account the rest of the site quotes, so the
 * two can never disagree, and the four steps are the order the app actually
 * computes in rather than a marketing narrative laid over it.
 */
const SALARY = 85_000;
const BILLS = 25_298;
const SAVINGS = 15_000;
const INVESTMENTS = 10_000;
const AVAILABLE = SALARY - BILLS - SAVINGS - INVESTMENTS;
const DAYS_LEFT = 19;
const SAFE_TODAY = 1_029;

const STEPS = [
  {
    Icon: CalendarClock,
    title: "Your month starts on payday",
    body: "Not on the first. You tell Aartha when you are paid once, and every figure after this is measured from there — which is why a bill due on the 28th and a payday on the 25th are three days apart here rather than in different months.",
    figure: formatMoney(SALARY),
    caption: "lands, and the cycle opens",
  },
  {
    Icon: Wallet,
    title: "Commitments come out first",
    body: "Every bill you have entered is taken out of the total the day the cycle opens, not the day it clears. Money that is already promised never appears as money you can spend.",
    figure: `−${formatMoney(BILLS)}`,
    caption: "bills and commitments, protected",
  },
  {
    Icon: PiggyBank,
    title: "Savings and investments are held back",
    body: "Whatever you have chosen to put aside is removed too, so saving is not something that competes with your daily spending — it happens before the daily number exists.",
    figure: `−${formatMoney(SAVINGS + INVESTMENTS)}`,
    caption: "set aside before anything else",
  },
  {
    Icon: TrendingUp,
    title: "What is left is divided by the days left",
    body: `That leaves ${formatMoney(AVAILABLE)} for the rest of the cycle. Spread across the ${DAYS_LEFT} days until your next payday, today is worth ${formatMoney(SAFE_TODAY)} — and if you spend less than that today, tomorrow's figure goes up on its own.`,
    figure: formatMoney(SAFE_TODAY),
    caption: "safe to spend today",
  },
];

const RECALCULATES = [
  ["You log an expense", "Today's figure drops by what you spent, and the rest of the cycle re-levels."],
  ["A bill amount changes", "The protected total changes, and every day after it is recomputed."],
  ["You add a goal", "The money it needs is reserved, so it stops showing up as spendable."],
  ["Payday arrives", "The cycle closes, the next one opens, and the figure starts again from the new salary."],
];

export function HowItWorksView() {
  return (
    <SectionPage
      hero={{
        eyebrow: "How it works",
        title: (
          <>
            Four steps, and then <span className={styles.accentWord}>one number.</span>
          </>
        ),
        lede: "This is the whole calculation. It runs every time anything changes, and it is the only thing the app asks you to read.",
      }}
    >
      <Rise className={`${styles.section} ${styles.band}`} as="section">
        <ol className={styles.stepFlow}>
          {STEPS.map(({ Icon, title, body, figure, caption }, index) => (
            <li
              key={title}
              className={`${styles.stepItem} ${styles.reveal}`}
              data-rise
              style={{ "--step": index + 1 } as CSSProperties}
            >
              <span className={styles.stepIcon}>
                <Icon aria-hidden />
              </span>
              <div className={styles.stepBody}>
                <p className={styles.stepIndex}>Step {index + 1}</p>
                <h2 className={styles.h3}>{title}</h2>
                <p className={styles.stepText}>{body}</p>
              </div>
              <div className={styles.stepFigure}>
                <strong className={styles.tnum}>{figure}</strong>
                <span>{caption}</span>
              </div>
            </li>
          ))}
        </ol>
      </Rise>

      <Rise className={styles.section} as="section">
        <div className={styles.sectionHead}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
            It is never stale
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-lines>
            The number is recalculated, not refreshed.
          </h2>
          <p className={`${styles.lead} ${styles.reveal}`} data-rise>
            There is nothing to update and no sync button to press. Each of these changes the
            figure the moment it happens.
          </p>
        </div>

        <div className={styles.routeList}>
          {RECALCULATES.map(([when, what]) => (
            <div key={when} className={`${styles.routeRow} ${styles.reveal}`} data-rise>
              <strong>{when}</strong>
              <p>{what}</p>
            </div>
          ))}
        </div>
      </Rise>

      <Rise className={`${styles.section} ${styles.band}`} as="section">
        <div className={styles.sectionHead}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
            See it with real data
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-lines>
            The demo account is already full.
          </h2>
          <p className={`${styles.lead} ${styles.reveal}`} data-rise>
            Salary, bills, goals, investments and a month of spending, so you can see the
            calculation running rather than read about it. {BRAND.name} needs no address to
            open it.
          </p>
        </div>
        <div className={`${styles.heroActions} ${styles.reveal}`} data-rise>
          <DemoButton />
          <Link href="/features" className={styles.btnQuiet}>
            See every feature
            <ArrowRight aria-hidden />
          </Link>
        </div>
      </Rise>
    </SectionPage>
  );
}

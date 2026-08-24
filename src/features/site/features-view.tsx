"use client";

import { BRAND } from "@/lib/brand";
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  CalendarClock,
  FileUp,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Receipt,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { DemoButton } from "./demo-button";
import styles from "./site.module.css";
import { Rise, SectionPage } from "./site-shell";

/**
 * Features, in full.
 *
 * Grouped by what the reader is trying to do rather than listed alphabetically
 * or in nav order: someone scanning this page is checking whether their own
 * situation is covered, and "money I do not control alone" is a situation.
 * Thirteen flat rows answered that question worse than four short groups do.
 */
const GROUPS = [
  {
    heading: "Every day",
    lede: "The part you actually open.",
    items: [
      {
        Icon: LayoutDashboard,
        name: "Dashboard",
        body: "One figure for today, the days left in the cycle, and where the salary went. Nothing else competes with it.",
      },
      {
        Icon: Receipt,
        name: "Expenses",
        body: "Log what you spent in a few seconds. Categories are inferred where they can be, and the daily figure moves immediately.",
      },
      {
        Icon: Sparkles,
        name: BRAND.assistantName,
        body: "Ask whether you can afford something and get an answer computed from your own salary cycle, bills, goals and deadlines — not general advice.",
      },
    ],
  },
  {
    heading: "Set up once",
    lede: "Enter it, and it keeps working.",
    items: [
      {
        Icon: BadgeIndianRupee,
        name: "Salary plan",
        body: "Decide what each payday funds before it arrives, so the split happens on its own rather than being reconstructed afterwards.",
      },
      {
        Icon: CalendarClock,
        name: "Bills",
        body: "Every commitment with its due date, protected from the day the cycle opens rather than the day it clears.",
      },
      {
        Icon: ListChecks,
        name: "Budget rules",
        body: "Set the proportions once and every payday follows them without being asked again.",
      },
      {
        Icon: Landmark,
        name: "Accounts",
        body: "Every account and its real balance, reconciled against what you have recorded rather than guessed at.",
      },
    ],
  },
  {
    heading: "Money that is not simple",
    lede: "The cases that make people give up on budgeting apps.",
    items: [
      {
        Icon: Users,
        name: "Shared spending",
        body: "Mark an expense as shared and it stops distorting your own number. Aartha tracks what you covered, what came back, and what is still owed — month by month.",
      },
      {
        Icon: FileUp,
        name: "Statement import",
        body: "Bring in months of bank and card history at once. Every row is matched against what is already there first, so importing the same statement twice changes nothing.",
      },
      {
        Icon: Trash2,
        name: "Recycle bin",
        body: "Deleting sends a record here rather than into nothing, and a balance correction is stamped and adjusted instead of overwritten.",
      },
    ],
  },
  {
    heading: "The longer view",
    lede: "What the daily number adds up to.",
    items: [
      {
        Icon: Target,
        name: "Goals",
        body: "Save towards something with a deadline the plan can actually reach, and the money it needs stops appearing as spendable.",
      },
      {
        Icon: TrendingUp,
        name: "Investments",
        body: "What you hold, kept out of the figure you are free to spend so a portfolio never inflates your daily allowance.",
      },
      {
        Icon: BarChart3,
        name: "Analytics",
        body: "Where it went, by category and by salary cycle rather than by calendar month — because the cycle is the period you actually live in.",
      },
    ],
  },
];

export function FeaturesView() {
  return (
    <SectionPage
      hero={{
        eyebrow: "Features",
        title: (
          <>
            Thirteen parts, all feeding <span className={styles.accentWord}>one figure.</span>
          </>
        ),
        lede: "Everything here exists to change the number on your dashboard. If it could not, it would not be in the app.",
      }}
    >
      {GROUPS.map((group, index) => (
        <Rise
          key={group.heading}
          className={`${styles.section} ${index % 2 === 0 ? styles.band : ""}`}
          as="section"
        >
          <div className={styles.sectionHead}>
            <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
              {group.heading}
            </p>
            <h2 className={`${styles.h2} ${styles.reveal}`} data-rise>
              {group.lede}
            </h2>
          </div>

          <div className={styles.cardGrid}>
            {group.items.map(({ Icon, name, body }) => (
              <div key={name} className={`${styles.cardCell} ${styles.reveal}`} data-rise>
                <Icon aria-hidden />
                <strong>{name}</strong>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </Rise>
      ))}

      <Rise className={styles.section} as="section">
        <div className={styles.sectionHead}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
            All of it, free
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-rise>
            Nothing on this page is behind a plan.
          </h2>
          <p className={`${styles.lead} ${styles.reveal}`} data-rise>
            Every feature listed here is in the demo account, and every one of them is included
            while {BRAND.name} is in early access.
          </p>
        </div>
        <div className={`${styles.heroActions} ${styles.reveal}`} data-rise>
          <DemoButton />
          <Link href="/how-it-works" className={styles.btnQuiet}>
            See the calculation
            <ArrowRight aria-hidden />
          </Link>
        </div>
      </Rise>
    </SectionPage>
  );
}

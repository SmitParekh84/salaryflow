"use client";

import { Button } from "@/components/ui/button";
import { DemoButton } from "@/features/landing/demo-button";
import landing from "@/features/landing/landing.module.css";
import { Reveal, SectionHeading } from "@/features/landing/section";
import { BRAND } from "@/lib/brand";
import {
  ArrowRight,
  BellRing,
  Check,
  Database,
  EyeOff,
  Landmark,
  Megaphone,
} from "lucide-react";
import Link from "next/link";
import { MarketingPage, PageCta, PageHero } from "./marketing-page";
import styles from "./marketing-page.module.css";

const INCLUDED = [
  "The salary cycle and your safe-to-spend number",
  "Bills, EMIs and subscriptions, protected before you spend",
  "Savings goals and scheduled investments",
  "Budget rules and the everyday spending allowance",
  `${BRAND.assistantName}, the in-app finance assistant`,
  "Full salary and expense history, with CSV and JSON export",
  "Shared access for a partner or family member",
  "Install on phone and desktop, and it works offline",
];

const NOT_MEANS = [
  {
    icon: Database,
    title: "Not paid for with your data",
    copy: "Nothing about you is sold or shared. The Privacy Policy lists what is stored, which is only what you type in.",
    href: "/privacy",
    linkLabel: "Read the Privacy Policy",
  },
  {
    icon: Megaphone,
    title: "No ads, no upsell",
    copy: "There is no ad slot, no sponsored product and no partner offer waiting behind a feature.",
  },
  {
    icon: Landmark,
    title: "No bank connection",
    copy: "The app never links to your accounts, so free is not underwritten by a data aggregator.",
    href: "/about",
    linkLabel: "Why there is no bank link",
  },
];

export function PricingView() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            Free while it is in <span>early access.</span>
          </>
        }
        lede={`${BRAND.name} costs nothing to use today. There is one version of the app, everyone gets all of it, and nothing is held back behind a tier.`}
      />

      <section className={landing.section}>
        <Reveal className={styles.planCard}>
          <div className={styles.planTop}>
            <h3>Everything, for everyone</h3>
            <span className={styles.planBadge}>Early access</span>
          </div>
          <div className={styles.planPrice}>
            <strong>₹0</strong>
            <span>per month, no card needed</span>
          </div>
          <p className={styles.planNote}>
            No trial that expires, and no feature that stops working after a month.
          </p>
          <div className={styles.planList}>
            {INCLUDED.map((item) => (
              <span key={item}>
                <Check /> {item}
              </span>
            ))}
          </div>
          <div className={styles.planActions}>
            <DemoButton />
            <Button asChild size="lg" variant="marketingOutline">
              <Link href="/waitlist">
                Join the waitlist <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>

      <section className={landing.section}>
        <SectionHeading
          eyebrow="What free does not mean"
          copy="Free usually has a funding model hiding behind it. Here is what is not funding this one."
        >
          Free, and <span>not at your expense.</span>
        </SectionHeading>
        <div className={styles.cards}>
          {NOT_MEANS.map((item) => (
            <Reveal key={item.title} className={styles.card}>
              <item.icon />
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              {item.href && (
                <Link href={item.href} className={styles.cardLink}>
                  {item.linkLabel} <ArrowRight />
                </Link>
              )}
            </Reveal>
          ))}
        </div>
        <Reveal className={styles.footNote}>
          <p>
            It is free because it is early, and the priority is people using it rather than revenue.
          </p>
        </Reveal>
      </section>

      <section className={landing.section}>
        <Reveal className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={landing.eyebrow}>If a paid plan ever arrives</p>
            <h2>It might. Two things hold if it does.</h2>
          </div>
          <div>
            <BellRing />
            <h3>You hear about it in advance</h3>
            <p>
              Existing accounts get told well before anything changes, rather than discovering it at
              a paywall mid-month.
            </p>
          </div>
          <div>
            <Check />
            <h3>The core stays free</h3>
            <p>
              Knowing what is safe to spend today stays in the free version. Anything paid would sit
              on top of that, not in front of it.
            </p>
          </div>
          <div>
            <EyeOff />
            <h3>Your data stays yours</h3>
            <p>
              Settings has CSV and JSON export either way, so leaving never means losing your
              records.
            </p>
          </div>
        </Reveal>
      </section>

      <PageCta
        eyebrow="Questions"
        title={
          <>
            Ask before you <span>sign up.</span>
          </>
        }
        copy="Anything about how the app works, what it stores, or where it is going. A person reads the mail."
      >
        <Button asChild size="lg" variant="marketingOutline">
          <a href={`mailto:${BRAND.supportEmail}`}>
            {BRAND.supportEmail} <ArrowRight />
          </a>
        </Button>
        <Button asChild size="lg" variant="marketingOutline">
          <Link href="/about">
            Why it works this way <ArrowRight />
          </Link>
        </Button>
      </PageCta>
    </MarketingPage>
  );
}

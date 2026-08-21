"use client";

import { Button } from "@/components/ui/button";
import { DemoButton } from "@/features/landing/demo-button";
import landing from "@/features/landing/landing.module.css";
import { Reveal, SectionHeading } from "@/features/landing/section";
import { BRAND } from "@/lib/brand";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleDollarSign,
  Landmark,
  LockKeyhole,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { MarketingPage, PageCta, PageHero } from "./marketing-page";
import styles from "./marketing-page.module.css";

const STEPS = [
  {
    number: "01",
    icon: CircleDollarSign,
    title: "It starts with payday",
    copy: "Your salary and the date it lands are the only fixed points the calculation needs.",
  },
  {
    number: "02",
    icon: ShieldCheck,
    title: "Commitments come off first",
    copy: "Protected bills, committed savings and scheduled investments are subtracted before anything else.",
  },
  {
    number: "03",
    icon: Wallet,
    title: "The rest is paced by the day",
    copy: "Whatever is genuinely left is spread across the days until your next payday.",
  },
];

const CYCLE = [
  { icon: CalendarDays, title: "25 Aug", copy: "Payday" },
  { icon: ReceiptText, title: "Protected", copy: "Bills" },
  { icon: PiggyBank, title: "Reserved", copy: "Goals" },
  { icon: Wallet, title: "Today", copy: "Safe to spend" },
  { icon: CalendarDays, title: "25 Sep", copy: "Next payday" },
];

const FOR = [
  "Salaried people who want to stop doing arithmetic at the checkout",
  "Anyone who would rather reach payday deliberately than find out afterwards",
  "People who want their commitments recorded without a trading terminal of charts",
];

const NOT_FOR = [
  "Day traders and anyone who needs a live market view",
  "Businesses tracking invoices, payroll or GST",
  "Anyone who wants a model to categorise their spending for them",
];

export function AboutView() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow={`About ${BRAND.name}`}
        title={
          <>
            One number, instead of <span>a wall of charts.</span>
          </>
        }
        lede="Most money apps answer a question nobody asks at the counter: where did it all go last month? Aartha answers the one you actually have, standing there with your card out. Can I afford this right now?"
      >
        <DemoButton />
        <Button asChild size="lg" variant="marketingOutline">
          <Link href="/waitlist">
            Join the waitlist <ArrowRight />
          </Link>
        </Button>
      </PageHero>

      <section className={landing.problemSection}>
        <Reveal className={landing.problemCopy}>
          <p className={landing.eyebrow}>The problem with your balance</p>
          <h2>
            A bank balance is a <span>lie of omission.</span>
          </h2>
          <p>
            It shows a number and says nothing about the rent due on the 1st, the premium that lands
            in February, or the fact that payday is still eleven days away. To know what the balance
            means you have to hold half a dozen future obligations in your head and do the sum, every
            single time. Most people do not. They guess, and the guess is wrong in the last week of
            the month.
          </p>
        </Reveal>
        <Reveal className={landing.balanceStory}>
          <div className={landing.balanceCard}>
            <Landmark />
            <small>What you see</small>
            <strong>₹85,000</strong>
            <span>Bank balance</span>
          </div>
          <div className={landing.commitmentStack}>
            <span>
              <ReceiptText /> Bills <b>−₹25,298</b>
            </span>
            <span>
              <PiggyBank /> Savings <b>−₹15,000</b>
            </span>
            <span>
              <TrendingUp /> Investments <b>−₹10,000</b>
            </span>
          </div>
          <ArrowRight className={landing.storyArrow} />
          <div className={landing.answerCard}>
            <small>Actually safe today</small>
            <strong>₹1,029</strong>
            <span>12 days to payday</span>
          </div>
        </Reveal>
      </section>

      <section className={landing.section}>
        <SectionHeading
          eyebrow={`What ${BRAND.name} does instead`}
          copy="It does that arithmetic once and then keeps doing it, every time something changes."
        >
          The sum, made <span>permanent.</span>
        </SectionHeading>
        <div className={landing.stepsGrid}>
          {STEPS.map((step) => (
            <Reveal key={step.number} className={landing.stepCard}>
              <span className={landing.stepNumber}>{step.number}</span>
              <step.icon />
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className={styles.footNote}>
          <p>
            Record a purchase and the number recalculates immediately. That is the entire product.
          </p>
        </Reveal>
      </section>

      <section className={landing.cycleSection}>
        <SectionHeading
          eyebrow="Built around the salary cycle"
          copy="Salaried people do not live in calendar months. They live from payday to payday, and payday might be the 1st, the 7th or the 25th."
        >
          Your month starts when <span>you get paid.</span>
        </SectionHeading>
        <Reveal className={landing.cycleTrack}>
          {CYCLE.map((stop, index) => (
            <div key={stop.copy} className={index === 3 ? landing.cycleToday : ""}>
              <stop.icon />
              <strong>{stop.title}</strong>
              <span>{stop.copy}</span>
            </div>
          ))}
        </Reveal>
      </section>

      <section className={landing.section}>
        <div className={styles.split}>
          <Reveal className={styles.splitCopy}>
            <p className={landing.eyebrow}>A deliberate omission</p>
            <h2>
              No bank connection. <span>On purpose.</span>
            </h2>
            <p>
              Linking an app to your accounts means trusting an aggregator with credentials and a
              complete transaction history, permanently, to save some typing. Entering your own
              figures costs a little effort and buys two things: nothing leaves your account without
              your knowledge, and you stay aware of your own numbers instead of outsourcing that
              awareness to a sync job.
            </p>
            <p>
              What you tell it is all it knows. The{" "}
              <Link href="/privacy" className={styles.inlineLink}>
                Privacy Policy
              </Link>{" "}
              sets out exactly what that means.
            </p>
          </Reveal>
          <Reveal className={landing.privacyPoints}>
            <div>
              <LockKeyhole />
              <span>
                <strong>No credentials, ever</strong>There is nothing to link, so there is nothing to
                leak.
              </span>
            </div>
            <div>
              <ShieldCheck />
              <span>
                <strong>Only what you type</strong>Your salary, your bills, your goals. Nothing is
                inferred from a feed.
              </span>
            </div>
            <div>
              <CalendarDays />
              <span>
                <strong>Yours to take away</strong>CSV and JSON export live in Settings, so leaving
                never means losing your records.
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className={landing.section}>
        <SectionHeading
          eyebrow="Who it is for"
          copy="It does one thing, which means it is the wrong tool for some people. Better to say so here."
        >
          Built for one job, <span>not every job.</span>
        </SectionHeading>
        <div className={styles.forGrid}>
          <Reveal className={`${styles.forPanel} ${styles.forYes}`}>
            <Check />
            <h3>{BRAND.name} is for</h3>
            <ul>
              {FOR.map((item) => (
                <li key={item}>
                  <Check /> {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className={`${styles.forPanel} ${styles.forNo}`}>
            <X />
            <h3>It is not for</h3>
            <ul>
              {NOT_FOR.map((item) => (
                <li key={item}>
                  <X /> {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <PageCta
        eyebrow="Where it is going"
        title={
          <>
            Early access, and <span>feedback shapes it.</span>
          </>
        }
        copy={`${BRAND.name} is in early access. Try the full interactive demo without an account, or join the waitlist. What people tell us genuinely decides what gets built next.`}
      >
        <DemoButton />
        <Button asChild size="lg" variant="marketingOutline">
          <Link href="/waitlist">
            Join the waitlist <ArrowRight />
          </Link>
        </Button>
        <Button asChild size="lg" variant="marketingOutline">
          <Link href="/contact">
            Send feedback <ArrowRight />
          </Link>
        </Button>
      </PageCta>
    </MarketingPage>
  );
}

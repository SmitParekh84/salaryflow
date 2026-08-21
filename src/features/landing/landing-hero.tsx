"use client";

import { BrandMark } from "@/components/brand";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  FileText,
  Landmark,
  LockKeyhole,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useRef, type CSSProperties } from "react";
import { CountUp } from "./count-up";
import { DemoButton } from "./demo-button";
import { FaqAccordion } from "./faq-accordion";
import { FAQS } from "./faqs";
import { PaydayCycle } from "./payday-cycle";
import styles from "./landing.module.css";
import { Reveal, RevealGroup, RevealItem, SPRING, SectionHeading } from "./section";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";
import { WaitlistForm } from "./waitlist-form";

const moneyItems = [
  {
    icon: ReceiptText,
    title: "Bills & commitments",
    copy: "Protect rent, utilities, EMIs, and subscriptions before you spend.",
    value: "₹25,298",
    tone: "coral",
  },
  {
    icon: PiggyBank,
    title: "Savings goals",
    copy: "Save first, then spend what is genuinely left.",
    value: "₹15,000",
    tone: "mint",
  },
  {
    icon: TrendingUp,
    title: "Investments",
    copy: "Keep monthly investments on track automatically.",
    value: "₹10,000",
    tone: "lilac",
  },
  {
    icon: Wallet,
    title: "Everyday expenses",
    copy: "See how each purchase changes today’s number.",
    value: "₹640",
    tone: "amber",
  },
] as const;

// Shared with the FAQPage structured data in structured-data.tsx.
const faqs = FAQS;

/**
 * The hero is above the fold, so it plays on mount rather than on scroll. Each
 * line is released 70ms after the one above it, which reads as the page settling
 * rather than as six separate animations.
 */
const heroGroup = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } },
} as const;

const heroItem = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: SPRING },
} as const;

function DailyNumber({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.dailyNumber} ${compact ? styles.dailyNumberCompact : ""}`}>
      <div className={styles.cardTopline}>
        <span>Safe to spend today</span>
        {!compact && (
          <span className={styles.livePill}>
            <i /> Updated today
          </span>
        )}
      </div>
      <strong>
        <CountUp value={1029} />
      </strong>
      <p>
        <CalendarDays /> 12 days until payday
      </p>
      <div className={styles.dailyChecks}>
        <span>
          <Check /> Bills accounted for
        </span>
        <span>
          <Check /> Savings protected
        </span>
        <span>
          <Check /> Investments included
        </span>
      </div>
      <div className={styles.onTrack}>
        <Check /> You&apos;re on track
      </div>
    </div>
  );
}

export function LandingHero() {
  const heroRef = useRef<HTMLElement>(null);
  const still = useReducedMotion();

  // Parallax. The card drifts up slightly slower than the page scrolls, which
  // separates it from the copy beside it without ever leaving its own section.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const rawLift = useTransform(scrollYProgress, [0, 1], [0, -72]);
  const lift = useSpring(rawLift, { stiffness: 120, damping: 30, mass: 0.4 });
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0.35]);

  return (
    <div className={styles.page}>
      <SiteNav onLanding />
      <main>
        <section className={styles.hero} ref={heroRef}>
          <div className={styles.ambient} aria-hidden>
            <i />
            <i />
            <i />
          </div>
          <div className={styles.heroGlow} />
          <motion.div
            className={styles.heroCopy}
            variants={heroGroup}
            initial="hidden"
            animate="shown"
          >
            <motion.p className={styles.eyebrow} variants={heroItem}>
              Introducing Aartha
            </motion.p>
            <motion.h1 variants={heroItem}>
              Know what you can <span>safely spend</span> today.
            </motion.h1>
            <motion.p className={styles.heroLead} variants={heroItem}>
              Your salary, bills, savings, investments, and expenses become one calm daily number,
              paced to your next payday.
            </motion.p>
            <motion.div variants={heroItem}>
              <WaitlistForm id="hero-email" compact />
            </motion.div>
            <motion.div className={styles.heroActions} variants={heroItem}>
              <DemoButton secondary />
              <a href="#how-it-works" className={styles.textLink}>
                See how it works <ArrowRight />
              </a>
            </motion.div>
            <motion.div className={styles.trustRow} variants={heroItem}>
              <span>
                <ShieldCheck /> Private by design
              </span>
              <span>
                <Check /> No bank connection
              </span>
              <span>
                <Clock3 /> Set up in minutes
              </span>
            </motion.div>
          </motion.div>
          {/* Two elements on purpose: the outer one owns the scroll parallax
              (driven by motion values) and the inner one owns the mount
              entrance. Putting both on a single element makes Framer arbitrate
              between a `style` motion value and an `animate` target for the
              same `y`, and the entrance loses. */}
          <motion.div
            className={styles.heroParallax}
            style={still ? undefined : { y: lift, opacity: fade }}
          >
            <motion.div
              className={styles.heroVisual}
              initial={{ opacity: 0, scale: 0.97, y: 26 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ ...SPRING, delay: 0.22 }}
            >
              <DailyNumber />
              <div className={styles.moneyFlow}>
                <span>
                  <CircleDollarSign /> Salary
                </span>
                <i />
                <span>
                  <ShieldCheck /> Protected
                </span>
                <i />
                <span>
                  <Wallet /> Your pace
                </span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section className={styles.problemSection}>
          <Reveal className={styles.problemCopy}>
            <p className={styles.eyebrow}>The real problem</p>
            <h2>
              Your bank balance doesn’t tell the <span>whole story.</span>
            </h2>
            <p>
              ₹85,000 may be in your account, but some of it already has a job. Aartha reveals what
              is actually yours to use today.
            </p>
          </Reveal>
          <Reveal className={styles.balanceStory}>
            <div className={styles.balanceCard}>
              <Landmark />
              <small>What you see</small>
              <strong>₹85,000</strong>
              <span>Bank balance</span>
            </div>
            <div className={styles.commitmentStack}>
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
            <ArrowRight className={styles.storyArrow} />
            <div className={styles.answerCard}>
              <small>Actually safe today</small>
              <strong>₹1,029</strong>
              <span>12 days to payday</span>
            </div>
          </Reveal>
        </section>

        <section id="how-it-works" className={styles.section}>
          <SectionHeading
            eyebrow="How Aartha works"
            copy="Tell us when you get paid and what matters. Aartha keeps the rest clear."
          >
            From payday to payday, <span>your money stays paced.</span>
          </SectionHeading>
          <RevealGroup className={styles.stepsGrid}>
            {[
              ["01", "Add your salary", "Choose your pay amount and payday.", CircleDollarSign],
              ["02", "Protect what matters", "Add bills, savings, and investments.", ShieldCheck],
              ["03", "Know your number", "See what is safe to spend today.", Wallet],
            ].map(([number, title, copy, Icon]) => (
              <RevealItem key={String(number)} className={styles.stepCard}>
                <span className={styles.stepNumber}>{String(number)}</span>
                <Icon />
                <h3>{String(title)}</h3>
                <p>{String(copy)}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        <section className={styles.productSection}>
          <Reveal className={styles.productCopy}>
            <p className={styles.eyebrow}>Your daily money check-in</p>
            <h2>
              One number. That’s all you <span>need to know.</span>
            </h2>
            <p>
              Stop checking your balance, calculating bills, and wondering if you are spending too
              much.
            </p>
            <DemoButton />
          </Reveal>
          <Reveal className={styles.dashboardMockup}>
            <div className={styles.mockSidebar}>
              <BrandMark />
              {[Wallet, BarChart3, ReceiptText, PiggyBank, TrendingUp].map((Icon, index) => (
                <Icon key={index} />
              ))}
            </div>
            <div className={styles.mockMain}>
              <div className={styles.mockGreeting}>
                <span>Good morning, Demo</span>
                <span className={styles.avatar}>D</span>
              </div>
              <DailyNumber compact />
              <div className={styles.summaryRows}>
                <span>
                  <CircleDollarSign /> Monthly salary <b>₹85,000</b>
                </span>
                <span>
                  <ReceiptText /> Bills & commitments <b>−₹25,298</b>
                </span>
                <span>
                  <PiggyBank /> Savings & investments <b>−₹25,000</b>
                </span>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="features" className={styles.section}>
          <SectionHeading
            eyebrow="Everything that affects spending"
            copy="Your salary has more than one job. Aartha keeps track of each one."
          >
            Everything is accounted for. <span>Nothing is hidden.</span>
          </SectionHeading>
          <RevealGroup className={styles.featureGrid}>
            {moneyItems.map((item, index) => (
              <RevealItem className={styles.featureCard} key={item.title}>
                <div className={`${styles.featureIcon} ${styles[item.tone]}`}>
                  <item.icon />
                </div>
                <div>
                  <small>0{index + 1}</small>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </div>
                <strong>{item.value}</strong>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        <section className={styles.calmSection}>
          <SectionHeading
            eyebrow="Spend without second-guessing"
            copy="Your daily decision should not require a spreadsheet or mental arithmetic."
          >
            From “Can I afford this?” to <span>“I know I can.”</span>
          </SectionHeading>
          <RevealGroup className={styles.compareGrid}>
            <RevealItem className={`${styles.comparePanel} ${styles.beforePanel}`}>
              <p>Without Aartha</p>
              <strong>₹85,000</strong>
              <span>Rent is due soon…</span>
              <span>How much should I save?</span>
              <span>Will I have enough?</span>
            </RevealItem>
            <RevealItem className={`${styles.comparePanel} ${styles.afterPanel}`}>
              <p>With Aartha</p>
              <DailyNumber compact />
            </RevealItem>
          </RevealGroup>
        </section>

        <PaydayCycle />

        <section className={styles.section}>
          <SectionHeading
            eyebrow="Clarity, not complexity"
            copy="See where your salary goes and why your number is safe."
          >
            The math is visible. <span>The decision is yours.</span>
          </SectionHeading>
          <Reveal className={styles.allocationBoard}>
            <div className={styles.salaryBlock}>
              <CircleDollarSign />
              <strong>₹85,000</strong>
              <span>Salary</span>
            </div>
            <div className={styles.allocationBars}>
              {[
                ["Bills", "₹25,298", "28%"],
                ["Savings", "₹15,000", "18%"],
                ["Investments", "₹10,000", "12%"],
                ["Available", "₹34,702", "42%"],
              ].map(([name, value, width]) => (
                <span key={name} style={{ "--bar": width } as CSSProperties}>
                  {name}
                  <b>{value}</b>
                </span>
              ))}
            </div>
            <DailyNumber compact />
          </Reveal>
        </section>

        <section id="waitlist" className={styles.setupSection}>
          <SectionHeading
            eyebrow="Start in minutes"
            copy="No complicated budget. Add your salary, payday, and regular commitments once."
          >
            Set it up once. <span>Let Aartha do the math.</span>
          </SectionHeading>
          <RevealGroup className={styles.setupGrid}>
            <RevealItem className={styles.setupCard}>
              <span>01</span>
              <CircleDollarSign />
              <h3>Your salary</h3>
              <strong>₹85,000</strong>
              <p>Payday: 25th</p>
            </RevealItem>
            <RevealItem className={styles.setupCard}>
              <span>02</span>
              <ShieldCheck />
              <h3>Your commitments</h3>
              <strong>₹50,298</strong>
              <p>Bills, savings, investments</p>
            </RevealItem>
            <RevealItem className={styles.setupCard}>
              <span>03</span>
              <Wallet />
              <h3>Your daily number</h3>
              <strong className={styles.green}>₹1,029</strong>
              <p>You’re ready to go</p>
            </RevealItem>
          </RevealGroup>
          <Reveal>
            <WaitlistForm id="middle-email" />
          </Reveal>
        </section>

        <section id="privacy" className={styles.privacySection}>
          <SectionHeading
            eyebrow="Your money. Your privacy."
            copy="You decide what information you add, what you track, and how you use Aartha."
          >
            Your financial life is personal. <span>We treat it that way.</span>
          </SectionHeading>
          <div className={styles.privacyGrid}>
            <Reveal className={styles.privacyPoints}>
              <div>
                <Sparkles />
                <span>
                  <strong>Simple by design</strong>Only add what helps you understand your spending.
                </span>
              </div>
              <div>
                <FileText />
                <span>
                  <strong>Transparent calculations</strong>See exactly how your number is
                  determined.
                </span>
              </div>
              <div>
                <LockKeyhole />
                <span>
                  <strong>Built for your control</strong>Your choices remain yours.
                </span>
              </div>
            </Reveal>
            <Reveal className={styles.privacyVisual}>
              <ShieldCheck />
              <h3>Your financial overview</h3>
              <span>
                Salary <b>₹85,000</b>
              </span>
              <span>
                Bills <b>₹25,298</b>
              </span>
              <span>
                Savings <b>₹15,000</b>
              </span>
              <span>
                Safe today <b>₹1,029</b>
              </span>
              <p>
                <LockKeyhole /> Your information stays under your control.
              </p>
            </Reveal>
          </div>
        </section>

        <section id="faq" className={styles.faqSection}>
          <SectionHeading
            eyebrow="Questions, answered"
            copy="Everything you need to know before you start."
          >
            You have questions. <span>We have answers.</span>
          </SectionHeading>
          {/* FaqAccordion renders the RevealItem rows, so it has to stay inside
              this group — a RevealItem with no group above it never leaves its
              hidden state. */}
          <RevealGroup className={styles.faqList} amount={0.05}>
            <FaqAccordion items={faqs} />
          </RevealGroup>
        </section>

        <section className={styles.finalCta}>
          <div className={styles.finalInner}>
            <Reveal>
              <p className={styles.eyebrow}>Ready to spend with clarity?</p>
              <h2>
                Make it to payday <span>with confidence.</span>
              </h2>
              <p>Join the waitlist or step into a fully seeded demo account now.</p>
              <WaitlistForm id="final-email" />
              <div className={styles.finalDemo}>
                <DemoButton secondary />
              </div>
            </Reveal>
            <Reveal>
              <DailyNumber />
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

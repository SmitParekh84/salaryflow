"use client";

import { Brand, BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useFinanceStore } from "@/lib/store";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  Landmark,
  LockKeyhole,
  Menu,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { FAQS } from "./faqs";
import styles from "./landing.module.css";
import { SiteFooter } from "./site-footer";

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

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ type: "spring", bounce: 0, duration: 0.55 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  children,
  copy,
}: {
  eyebrow: string;
  children: ReactNode;
  copy?: string;
}) {
  return (
    <Reveal className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2>{children}</h2>
      {copy && <p className={styles.sectionCopy}>{copy}</p>}
    </Reveal>
  );
}

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
      <strong>₹1,029</strong>
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

function WaitlistForm({ id, compact = false }: { id: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to join the waitlist");
      setStatus("success");
      setMessage("You’re on the list. We’ll keep you posted.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to join the waitlist");
    }
  }
  return (
    <div className={compact ? styles.waitlistCompact : styles.waitlistBlock}>
      <form onSubmit={submit} className={styles.waitlistForm} aria-label="Join the Aartha waitlist">
        <label htmlFor={id} className="sr-only">
          Email address
        </label>
        <input
          id={id}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          disabled={status === "loading"}
        />
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Joining…" : "Join waitlist"}
          {status !== "loading" && <ArrowRight />}
        </button>
      </form>
      <p
        className={`${styles.formMessage} ${status === "error" ? styles.formError : ""}`}
        role="status"
        aria-live="polite"
      >
        {message || "Early access updates only. No spam."}
      </p>
    </div>
  );
}

function DemoButton({ secondary = false }: { secondary?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const resetAll = useFinanceStore((state) => state.resetAll);
  const updateUser = useFinanceStore((state) => state.updateUser);
  const loadFromServer = useFinanceStore((state) => state.loadFromServer);
  const loadSalaryHistory = useFinanceStore((state) => state.loadSalaryHistory);
  async function openDemo() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/demo", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to open demo");
      if ("caches" in globalThis) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }
      resetAll();
      updateUser({ name: payload.data.name, email: payload.data.email, onboarded: true });
      await Promise.all([loadFromServer(), loadSalaryHistory()]);
      router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to open demo");
      setLoading(false);
    }
  }
  return (
    <span className={styles.demoWrap}>
      <Button
        type="button"
        size="lg"
        variant={secondary ? "secondary" : "primary"}
        onClick={openDemo}
        disabled={loading}
        className={styles.demoButton}
      >
        {loading ? "Preparing demo…" : "Explore live demo"}
        {!loading && <ArrowRight />}
      </Button>
      {error && <small role="alert">{error}</small>}
    </span>
  );
}

export function LandingHero() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" aria-label="Aartha home">
          <Brand size="lg" />
        </Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#privacy">Privacy</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className={styles.navActions}>
          <Link href="/download">Download app</Link>
          <Link href="/login">Log in</Link>
          <a href="#waitlist" className={styles.navCta}>
            Join waitlist
          </a>
        </div>
        <button
          className={styles.menuButton}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        {menuOpen && (
          <nav className={styles.mobileNav} aria-label="Mobile navigation">
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How it works
            </a>
            <a href="#features" onClick={() => setMenuOpen(false)}>
              Features
            </a>
            <a href="#privacy" onClick={() => setMenuOpen(false)}>
              Privacy
            </a>
            <a href="#faq" onClick={() => setMenuOpen(false)}>
              FAQ
            </a>
            <Link href="/download" onClick={() => setMenuOpen(false)}>
              Download app
            </Link>
            <Link href="/login">Log in</Link>
          </nav>
        )}
      </header>
      <main>
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <motion.div
            className={styles.heroCopy}
            initial={{ y: 22 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.6 }}
          >
            <p className={styles.eyebrow}>Introducing Aartha</p>
            <h1>
              Know what you can <span>safely spend</span> today.
            </h1>
            <p className={styles.heroLead}>
              Your salary, bills, savings, investments, and expenses become one calm daily number,
              paced to your next payday.
            </p>
            <WaitlistForm id="hero-email" compact />
            <div className={styles.heroActions}>
              <DemoButton secondary />
              <a href="#how-it-works" className={styles.textLink}>
                See how it works <ArrowRight />
              </a>
            </div>
            <div className={styles.trustRow}>
              <span>
                <ShieldCheck /> Private by design
              </span>
              <span>
                <Check /> No bank connection
              </span>
              <span>
                <Clock3 /> Set up in minutes
              </span>
            </div>
          </motion.div>
          <motion.div
            className={styles.heroVisual}
            initial={{ scale: 0.96, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.7, delay: 0.12 }}
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
          <div className={styles.stepsGrid}>
            {[
              ["01", "Add your salary", "Choose your pay amount and payday.", CircleDollarSign],
              ["02", "Protect what matters", "Add bills, savings, and investments.", ShieldCheck],
              ["03", "Know your number", "See what is safe to spend today.", Wallet],
            ].map(([number, title, copy, Icon]) => (
              <Reveal key={String(number)} className={styles.stepCard}>
                <span className={styles.stepNumber}>{String(number)}</span>
                <Icon />
                <h3>{String(title)}</h3>
                <p>{String(copy)}</p>
              </Reveal>
            ))}
          </div>
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
          <div className={styles.featureGrid}>
            {moneyItems.map((item, index) => (
              <Reveal className={styles.featureCard} key={item.title}>
                <div className={`${styles.featureIcon} ${styles[item.tone]}`}>
                  <item.icon />
                </div>
                <div>
                  <small>0{index + 1}</small>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </div>
                <strong>{item.value}</strong>
              </Reveal>
            ))}
          </div>
        </section>

        <section className={styles.calmSection}>
          <SectionHeading
            eyebrow="Spend without second-guessing"
            copy="Your daily decision should not require a spreadsheet or mental arithmetic."
          >
            From “Can I afford this?” to <span>“I know I can.”</span>
          </SectionHeading>
          <div className={styles.compareGrid}>
            <Reveal className={`${styles.comparePanel} ${styles.beforePanel}`}>
              <p>Without Aartha</p>
              <strong>₹85,000</strong>
              <span>Rent is due soon…</span>
              <span>How much should I save?</span>
              <span>Will I have enough?</span>
            </Reveal>
            <Reveal className={`${styles.comparePanel} ${styles.afterPanel}`}>
              <p>With Aartha</p>
              <DailyNumber compact />
            </Reveal>
          </div>
        </section>

        <section className={styles.cycleSection}>
          <SectionHeading
            eyebrow="Built around your payday"
            copy="Calendar months are arbitrary. Your real financial rhythm begins when your salary arrives."
          >
            Your month starts when <span>you get paid.</span>
          </SectionHeading>
          <Reveal className={styles.cycleTrack}>
            {[
              [CalendarDays, "25 Aug", "Payday"],
              [ReceiptText, "Protected", "Bills"],
              [PiggyBank, "Reserved", "Goals"],
              [Wallet, "₹1,029", "Today"],
              [CalendarDays, "25 Sep", "Next payday"],
            ].map(([Icon, title, copy], index) => (
              <div key={String(title)} className={index === 3 ? styles.cycleToday : ""}>
                <Icon />
                <strong>{String(title)}</strong>
                <span>{String(copy)}</span>
              </div>
            ))}
          </Reveal>
        </section>

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
          <div className={styles.setupGrid}>
            <Reveal className={styles.setupCard}>
              <span>01</span>
              <CircleDollarSign />
              <h3>Your salary</h3>
              <strong>₹85,000</strong>
              <p>Payday: 25th</p>
            </Reveal>
            <Reveal className={styles.setupCard}>
              <span>02</span>
              <ShieldCheck />
              <h3>Your commitments</h3>
              <strong>₹50,298</strong>
              <p>Bills, savings, investments</p>
            </Reveal>
            <Reveal className={styles.setupCard}>
              <span>03</span>
              <Wallet />
              <h3>Your daily number</h3>
              <strong className={styles.green}>₹1,029</strong>
              <p>You’re ready to go</p>
            </Reveal>
          </div>
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
          <div className={styles.faqList}>
            {faqs.map(([question, answer], index) => (
              <Reveal key={question}>
                <details open={index === 0}>
                  <summary>
                    {question}
                    <ChevronDown />
                  </summary>
                  <p>{answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
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

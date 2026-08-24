"use client";

import { BRAND } from "@/lib/brand";
import { formatMoney } from "@/lib/utils";
import {
  BadgeIndianRupee,
  BarChart3,
  CalendarClock,
  CloudOff,
  Eye,
  FileUp,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Receipt,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { DemoButton } from "./demo-button";
import styles from "./site.module.css";
import { LoopObject } from "./loop-object";
import { SiteFooter, SiteNav } from "./site-shell";
import { countTo, gsap, revealIn, revealLines, showNow, useScene } from "./use-gsap";

/* ---------------------------------------------------------------------------
   Landing v5 — light, quiet, and finished.

   The correction to v4. That draft was dark, loud, and had three competing 3D
   set pieces; the note was that it read as generated rather than designed, and
   that a money app should look like it can be trusted rather than like a demo.

   So the discipline here is subtraction:

     · white ground, navy ink, one accent — see the stylesheet header for the
       system this is built on and where it was measured from
     · display type at weight 400, never 600
     · exactly ONE 3D object, in the hero, lazy-loaded so it cannot slow the
       first paint. Everything else is type, hairlines and one flat bar chart
     · no pinned scroll, no scroll-jacking, no horizontal carousel. Motion is
       short fades and two counters

   The figures are the same demo account every other draft used, so the numbers
   cannot contradict each other.
   --------------------------------------------------------------------------- */

const ACCOUNT = {
  salary: 85_000,
  bills: 25_298,
  savings: 15_000,
  investments: 10_000,
  safeToday: 1_029,
  daysToPayday: 12,
} as const;

const AVAILABLE = ACCOUNT.salary - ACCOUNT.bills - ACCOUNT.savings - ACCOUNT.investments;

const SPLIT = [
  { key: "bills", name: "Bills & commitments", amount: ACCOUNT.bills, tone: styles.partBills },
  { key: "savings", name: "Savings", amount: ACCOUNT.savings, tone: styles.partSavings },
  {
    key: "investments",
    name: "Investments",
    amount: ACCOUNT.investments,
    tone: styles.partInvest,
  },
  { key: "yours", name: "Yours to spend", amount: AVAILABLE, tone: styles.partYours },
] as const;

const FEATURES = [
  { Icon: LayoutDashboard, name: "Dashboard", note: "Today's number, and where the cycle stands." },
  { Icon: BadgeIndianRupee, name: "Salary plan", note: "Decide what payday funds before it lands." },
  { Icon: Landmark, name: "Accounts", note: "Every balance, reconciled not guessed." },
  { Icon: Receipt, name: "Expenses", note: "Log what you spent in seconds." },
  { Icon: Users, name: "Shared spending", note: "What you split, and who still owes you." },
  { Icon: CalendarClock, name: "Bills", note: "Protected from the day they are due." },
  { Icon: Target, name: "Goals", note: "With deadlines the plan can actually hit." },
  { Icon: TrendingUp, name: "Investments", note: "Held out of your spendable number." },
  { Icon: BarChart3, name: "Analytics", note: "By category and by cycle, not by month." },
  { Icon: Sparkles, name: BRAND.assistantName, note: "An adviser that knows your numbers." },
  { Icon: ListChecks, name: "Budget rules", note: "Set the split once; payday follows it." },
  { Icon: FileUp, name: "Statement import", note: "Months of history without retyping." },
  { Icon: Trash2, name: "Recycle bin", note: "Nothing you delete is really gone." },
] as const;

const PROOF = [
  {
    Icon: CloudOff,
    title: "Works with no signal",
    body: "Your numbers are held and computed on the device. Lose connection mid-entry and nothing is lost; it reconciles when you are back.",
  },
  {
    Icon: Eye,
    title: "No bank connection",
    body: "There is no account to link and no credentials to hand over. You decide what Aartha knows by choosing what you put in.",
  },
  {
    Icon: Smartphone,
    title: "Installs like an app",
    body: "Add it to your home screen and it opens like anything else on your phone. No store, no update to remember.",
  },
] as const;

export function Landing() {
  return (
    <div className={styles.page}>
      {/* Reveals start hidden so nothing flashes before its scene builds, which
          would leave a reader with no JavaScript on a blank page. */}
      <noscript>
        <style>{`[class*="reveal"]{opacity:1!important}`}</style>
      </noscript>

      <SiteNav />

      <main>
        <Hero />
        <Split />
        <Features />
        <Proof />
        <Close />
      </main>
    </div>
  );
}

function Hero() {
  const ref = useScene<HTMLElement>((api, root) => {
    const items = root.querySelectorAll<HTMLElement>("[data-item]");
    const headings = root.querySelectorAll<HTMLElement>("[data-lines]");
    const cells = root.querySelectorAll<HTMLElement>("[data-cell]");
    const safe = root.querySelector<HTMLElement>("[data-safe]");

    api.motion(() => {
      gsap.fromTo(
        items,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.65, ease: "power2.out", stagger: 0.07 },
      );
      revealIn(cells, { trigger: cells[0], stagger: 0.07 });
      // Not awaited: the copy and the figures must not wait on the font load
      // that revealLines needs before it can measure line breaks.
      void revealLines(headings);
      if (safe) countTo(safe, ACCOUNT.safeToday, formatMoney, 1.2);
    });

    api.still(() => {
      showNow(items);
      showNow(cells);
      showNow(headings);
      if (safe) safe.textContent = formatMoney(ACCOUNT.safeToday);
    });
  });

  return (
    <section className={styles.hero} ref={ref}>
      <div className={styles.heroCopy}>
        <p className={`${styles.eyebrow} ${styles.reveal}`} data-item>
          Salary-cycle money app
        </p>
        <h1 className={`${styles.display} ${styles.reveal}`} data-lines>
          Know what is <span className={styles.accentWord}>safe to spend</span> today.
        </h1>
        <p className={`${styles.lead} ${styles.reveal}`} data-item>
          Aartha takes your bills, goals and investments out of your balance and gives you
          one number for today &mdash; recalculated every time something changes.
        </p>
        <div className={`${styles.heroActions} ${styles.reveal}`} data-item>
          <DemoButton />
          <Link href="/waitlist" className={styles.btnQuiet}>
            Join the waitlist
          </Link>
        </div>
        <p className={`${styles.heroMeta} ${styles.reveal}`} data-item>
          <span>
            <CloudOff aria-hidden />
            Works offline
          </span>
          <span>
            <Eye aria-hidden />
            No bank connection
          </span>
          <span>
            <Smartphone aria-hidden />
            Free in early access
          </span>
        </p>
      </div>

      <LoopObject />

      {/* The figures sit under the whole fold, spanning both columns, so the
          hero ends on the product's own arithmetic rather than on a button. */}
      <div className={styles.figures} style={{ gridColumn: "1 / -1", marginTop: 20 }}>
        <Figure
          value={<span data-safe>{formatMoney(ACCOUNT.safeToday)}</span>}
          label="Safe to spend today"
        />
        <Figure value={formatMoney(ACCOUNT.salary)} label="Salary this cycle" />
        <Figure value={formatMoney(ACCOUNT.bills)} label="Bills already protected" />
        <Figure value={`${ACCOUNT.daysToPayday} days`} label="Until your next payday" />
      </div>
    </section>
  );
}

function Figure({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className={`${styles.figureCell} ${styles.reveal}`} data-cell>
      <strong className={`${styles.figureValue} ${styles.tnum}`}>{value}</strong>
      <span className={styles.figureLabel}>{label}</span>
    </div>
  );
}

function Split() {
  const [hot, setHot] = useState<string | null>(null);

  const ref = useScene<HTMLElement>((api, root) => {
    const items = root.querySelectorAll<HTMLElement>("[data-item]");
    const headings = root.querySelectorAll<HTMLElement>("[data-lines]");
    const parts = root.querySelectorAll<HTMLElement>("[data-part]");

    api.motion(() => {
      revealIn(items, { trigger: root, stagger: 0.08 });
      void revealLines(headings);
      // The bar draws itself out from the left as one gesture, which is the only
      // animation in this section — it is a chart, not a set piece.
      gsap.fromTo(
        parts,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.07,
          transformOrigin: "0 50%",
          scrollTrigger: { trigger: parts[0], start: "top 86%", once: true },
        },
      );
    });

    api.still(() => {
      showNow(items);
      showNow(headings);
      gsap.set(parts, { scaleX: 1 });
    });
  });

  return (
    <section id="split" className={`${styles.section} ${styles.band}`} ref={ref}>
      <div className={styles.splitGrid}>
        <div>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-item>
            Where it goes
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-lines style={{ marginTop: 16 }}>
            Your balance is not <span className={styles.accentWord}>your money.</span>
          </h2>
          <p className={`${styles.lead} ${styles.reveal}`} data-item style={{ marginTop: 18 }}>
            Most of what sits in your account already has a job. Aartha takes each one out
            first, so what is left is a number you can act on without checking anything.
          </p>
        </div>

        <div>
          <div className={`${styles.bar} ${styles.reveal}`} data-item>
            {SPLIT.map((part) => (
              <span
                key={part.key}
                className={`${styles.barPart} ${part.tone} ${
                  hot && hot !== part.key ? styles.barDim : ""
                }`}
                data-part
                style={{ "--share": part.amount } as CSSProperties}
              />
            ))}
          </div>

          <div className={`${styles.splitLegend} ${styles.reveal}`} data-item>
            {SPLIT.map((part) => (
              <div
                key={part.key}
                className={`${styles.legendRow} ${
                  part.key === "yours" ? styles.legendYours : ""
                }`}
                onPointerEnter={() => setHot(part.key)}
                onPointerLeave={() => setHot(null)}
              >
                <span
                  className={`${styles.legendSwatch} ${part.tone}`}
                  style={{ flex: "none" }}
                  aria-hidden
                />
                <span className={styles.legendName}>{part.name}</span>
                <span className={`${styles.legendAmount} ${styles.tnum}`}>
                  {formatMoney(part.amount)}
                </span>
                <span className={`${styles.legendShare} ${styles.tnum}`}>
                  {Math.round((part.amount / ACCOUNT.salary) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const ref = useScene<HTMLElement>((api, root) => {
    const items = root.querySelectorAll<HTMLElement>("[data-item]");
    const headings = root.querySelectorAll<HTMLElement>("[data-lines]");
    const rows = root.querySelectorAll<HTMLElement>("[data-row]");
    api.motion(() => {
      revealIn(items, { trigger: root, stagger: 0.08 });
      revealIn(rows, { trigger: rows[0], stagger: 0.025, y: 10 });
      void revealLines(headings);
    });
    api.still(() => {
      showNow(items);
      showNow(rows);
      showNow(headings);
    });
  });

  return (
    <section id="features" className={styles.section} ref={ref}>
      <div className={styles.sectionHead}>
        <p className={`${styles.eyebrow} ${styles.reveal}`} data-item>
          Everything in one place
        </p>
        <h2 className={`${styles.h2} ${styles.reveal}`} data-lines>
          Thirteen parts, one number.
        </h2>
      </div>

      <div className={styles.featureGrid}>
        {FEATURES.map(({ Icon, name, note }) => (
          <div key={name} className={`${styles.featureItem} ${styles.reveal}`} data-row>
            <span className={styles.featureName}>
              <Icon aria-hidden />
              {name}
            </span>
            <span className={styles.featureNote}>{note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Proof() {
  const ref = useScene<HTMLElement>((api, root) => {
    const items = root.querySelectorAll<HTMLElement>("[data-item]");
    const headings = root.querySelectorAll<HTMLElement>("[data-lines]");
    api.motion(() => {
      revealIn(items, { trigger: root, stagger: 0.09 });
      void revealLines(headings);
    });
    api.still(() => {
      showNow(items);
      showNow(headings);
    });
  });

  return (
    <section className={`${styles.section} ${styles.band}`} ref={ref}>
      <div className={styles.sectionHead}>
        <p className={`${styles.eyebrow} ${styles.reveal}`} data-item>
          Your money, your device
        </p>
        <h2 className={`${styles.h2} ${styles.reveal}`} data-lines>
          Built to be trusted with the real numbers.
        </h2>
      </div>

      <div className={styles.proofRow}>
        {PROOF.map(({ Icon, title, body }) => (
          <div key={title} className={`${styles.proofItem} ${styles.reveal}`} data-item>
            <Icon aria-hidden />
            <strong>{title}</strong>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Close() {
  const ref = useScene<HTMLDivElement>((api, root) => {
    const items = root.querySelectorAll<HTMLElement>("[data-item]");
    const headings = root.querySelectorAll<HTMLElement>("[data-lines]");
    api.motion(() => {
      revealIn(items, { trigger: root, stagger: 0.08 });
      void revealLines(headings);
    });
    api.still(() => {
      showNow(items);
      showNow(headings);
    });
  });

  return (
    <div ref={ref}>
      <section className={styles.close}>
        <div className={styles.closeInner}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-item>
            Free in early access
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-lines>
            See your own number tonight.
          </h2>
          <p className={`${styles.lead} ${styles.reveal}`} data-item>
            Open the demo account and the whole app is already full of data. Nothing to set
            up, and no card.
          </p>
          <div className={`${styles.closeActions} ${styles.reveal}`} data-item>
            <DemoButton />
            <Link href="/waitlist" className={styles.btnQuiet}>
              Join the waitlist
            </Link>
          </div>
          <p className={`${styles.closeNote} ${styles.reveal}`} data-item>
            &#8377;0 per month while Aartha is in early access.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { DemoButton } from "@/features/landing/demo-button";
import landing from "@/features/landing/landing.module.css";
import { Reveal, SectionHeading } from "@/features/landing/section";
import { WaitlistForm } from "@/features/landing/waitlist-form";
import { BRAND } from "@/lib/brand";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  MailX,
  MessageSquare,
  Smartphone,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { MarketingPage, PageCta, PageHero } from "./marketing-page";
import styles from "./marketing-page.module.css";

const WHAT_HAPPENS = [
  {
    icon: BellRing,
    title: "One mail when your turn comes",
    copy: "Early access opens in small batches, so the people already in it get answered properly. You get a mail with a link when yours is ready.",
  },
  {
    icon: MessageSquare,
    title: "Occasional notes on what shipped",
    copy: "Short, only when something worth reading changed. Feedback from this list is what decides the order things get built in.",
  },
  {
    icon: MailX,
    title: "Nothing else, ever",
    copy: "Your address is used for those two things. It is not sold, not shared, and one line in any mail takes you off the list.",
  },
];

const READY_FOR_YOU = [
  { icon: Wallet, label: "One number: what is safe to spend today" },
  { icon: CalendarDays, label: "Your own salary cycle, payday to payday" },
  { icon: Check, label: "Bills, savings and investments protected first" },
  { icon: Smartphone, label: "Installs on your phone, and works offline" },
];

export function WaitlistView() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Early access"
        title={
          <>
            Join the <span>waitlist.</span>
          </>
        }
        lede={`${BRAND.name} is in early access and opens to new people in small batches. Leave your email and you get a link the moment yours is ready. Nothing to install, no card, no account until then.`}
      />

      <section className={landing.section}>
        <Reveal className={styles.centered}>
          <WaitlistForm id="waitlist-page-email" />
        </Reveal>
        <Reveal className={styles.footNote}>
          <p>Would rather look first? The demo is a full seeded account, no address needed.</p>
          <span className={styles.footNoteAction}>
            <DemoButton secondary />
          </span>
        </Reveal>
      </section>

      <section className={landing.section}>
        <SectionHeading
          eyebrow="What you are joining"
          copy="Three things happen after you enter your address, and nothing else does."
        >
          What the list <span>actually is.</span>
        </SectionHeading>
        <div className={styles.cards}>
          {WHAT_HAPPENS.map((item) => (
            <Reveal key={item.title} className={styles.card}>
              <item.icon />
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={landing.section}>
        <Reveal className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={landing.eyebrow}>Waiting for you</p>
            <h2>What you get on the day you are let in.</h2>
          </div>
          {READY_FOR_YOU.map((item) => (
            <div key={item.label}>
              <item.icon />
              <h3>{item.label}</h3>
            </div>
          ))}
        </Reveal>
      </section>

      <PageCta
        eyebrow="Already have an account?"
        title={
          <>
            Then skip the queue and <span>install the app.</span>
          </>
        }
        copy={`${BRAND.name} installs from the browser onto your phone or desktop in about ten seconds. No app store, and it works offline once it is there.`}
      >
        <Button asChild size="lg" variant="marketing">
          <Link href="/download">
            Download the app <ArrowRight />
          </Link>
        </Button>
        <Button asChild size="lg" variant="marketingOutline">
          <Link href="/login">
            Log in <ArrowRight />
          </Link>
        </Button>
      </PageCta>
    </MarketingPage>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { DemoButton } from "@/features/landing/demo-button";
import landing from "@/features/landing/landing.module.css";
import { Reveal, SectionHeading } from "@/features/landing/section";
import { BRAND } from "@/lib/brand";
import { ArrowRight, Clock3, MessageSquare, Scale, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { FaInstagram, FaLinkedinIn } from "react-icons/fa6";
import { MarketingPage, PageCta, PageHero } from "./marketing-page";
import styles from "./marketing-page.module.css";

const CHANNELS = [
  {
    icon: MessageSquare,
    title: "Product and feedback",
    copy: "How something works, something that looks wrong, or a feature you want. Feedback decides what gets built next.",
    email: BRAND.supportEmail,
  },
  {
    icon: Scale,
    title: "Privacy and legal",
    copy: "A copy of your data, a correction, a deletion request, or formal correspondence. Kept separate from support so it is not lost in day-to-day mail.",
    email: BRAND.legalEmail,
  },
  {
    icon: ShieldAlert,
    title: "Security reports",
    copy: "Send enough detail to reproduce it and please hold off publishing until it is fixed. Reports are welcome and will not be met with legal threats.",
    email: BRAND.legalEmail,
  },
];

export function ContactView() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            A person <span>reads these.</span>
          </>
        }
        lede={`${BRAND.name} is small, so there is no ticket queue and no chatbot. Mail goes to a mailbox someone actually opens.`}
      >
        <Button asChild size="lg" variant="marketing">
          <a href={`mailto:${BRAND.supportEmail}`}>
            {BRAND.supportEmail} <ArrowRight />
          </a>
        </Button>
      </PageHero>

      <section className={landing.section}>
        <SectionHeading
          eyebrow="Where to send it"
          copy="Three addresses, so the urgent things are not queued behind the everyday ones."
        >
          Pick the one that <span>fits.</span>
        </SectionHeading>
        <div className={styles.cards}>
          {CHANNELS.map((channel) => (
            <Reveal key={channel.title} className={styles.card}>
              <channel.icon />
              <h3>{channel.title}</h3>
              <p>{channel.copy}</p>
              <a href={`mailto:${channel.email}`} className={styles.cardLink}>
                {channel.email} <ArrowRight />
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      <section className={landing.section}>
        <Reveal className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={landing.eyebrow}>What to expect</p>
            <h2>A reply within two working days.</h2>
            <p>
              If a week passes with nothing, assume the mail went astray and send it again rather
              than concluding it was ignored.
            </p>
          </div>
          <div>
            <Clock3 />
            <h3>Not sure where to send it?</h3>
            <p>
              Use <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>. It gets passed
              on. Sending to the wrong address is not a mistake worth worrying about.
            </p>
          </div>
          <div>
            <Scale />
            <h3>Before you ask about data</h3>
            <p>
              The <Link href="/privacy">Privacy Policy</Link> covers what is stored. The short
              version: only what you type in, and never a bank connection.
            </p>
          </div>
        </Reveal>
      </section>

      <section className={landing.section}>
        <SectionHeading
          eyebrow="Elsewhere"
          copy="Product updates get posted here. Both accounts are run by the same person who answers the mail."
        >
          Follow along <span>as it is built.</span>
        </SectionHeading>
        <div className={styles.cards}>
          <Reveal className={styles.card}>
            <FaLinkedinIn />
            <h3>LinkedIn</h3>
            <p>Release notes, what changed and why, and the occasional note on how it is built.</p>
            <a
              href={BRAND.linkedin}
              className={styles.cardLink}
              rel="noreferrer noopener"
              target="_blank"
            >
              Follow on LinkedIn <ArrowRight />
            </a>
          </Reveal>
          <Reveal className={styles.card}>
            <FaInstagram />
            <h3>Instagram</h3>
            <p>Screens as they ship, and shorter notes on what is coming next.</p>
            <a
              href={BRAND.instagram}
              className={styles.cardLink}
              rel="noreferrer noopener"
              target="_blank"
            >
              Follow on Instagram <ArrowRight />
            </a>
          </Reveal>
        </div>
      </section>

      <PageCta
        eyebrow="Or just try it"
        title={
          <>
            Have a look <span>before you write.</span>
          </>
        }
        copy="The demo is a full seeded account with no sign-up, which is often faster than asking whether the app does a particular thing."
      >
        <DemoButton />
        <Button asChild size="lg" variant="marketingOutline">
          <Link href="/waitlist">
            Join the waitlist <ArrowRight />
          </Link>
        </Button>
        <Button asChild size="lg" variant="marketingOutline">
          <Link href="/about">
            Read about the app <ArrowRight />
          </Link>
        </Button>
      </PageCta>
    </MarketingPage>
  );
}

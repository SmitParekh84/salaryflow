import { MarketingShell } from "@/features/marketing/marketing-shell";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description: `How to reach ${BRAND.name} — product questions, privacy requests, and where to send feedback.`,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: `Contact — ${BRAND.name}`,
    description: `How to reach ${BRAND.name}.`,
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <MarketingShell
      eyebrow="Contact"
      title="A person reads these."
      lede={`${BRAND.name} is small, so there is no ticket queue and no chatbot. Mail goes to a mailbox someone actually opens.`}
    >
      <h2>Product questions and feedback</h2>
      <p>
        Anything about how the app works, something that looks wrong, or a feature you want:{" "}
        <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.
      </p>
      <p>
        Expect a reply within two working days. If a week passes with nothing, assume the mail went
        astray and send it again rather than concluding it was ignored.
      </p>

      <h2>Privacy and legal</h2>
      <p>
        Requests about your data — a copy of it, its deletion, a correction — and any formal or
        legal correspondence go to <a href={`mailto:${BRAND.legalEmail}`}>{BRAND.legalEmail}</a>.
        These are kept separate from support so they are not lost in day-to-day mail.
      </p>
      <p>
        What is stored, and what is not, is set out in the <Link href="/privacy">Privacy Policy</Link>.
        The short version is that {BRAND.name} holds only what you type into it and never connects
        to your bank.
      </p>

      <h2>Elsewhere</h2>
      <p>
        Product updates are posted on{" "}
        <a href={BRAND.linkedin} rel="noreferrer noopener" target="_blank">
          LinkedIn
        </a>
        .
      </p>

      <h2>Reporting a security issue</h2>
      <p>
        Send it to <a href={`mailto:${BRAND.legalEmail}`}>{BRAND.legalEmail}</a> with enough detail
        to reproduce it, and please hold off on publishing until it is fixed. Reports are welcome
        and will not be met with legal threats.
      </p>

      <h2>Not sure where to send it?</h2>
      <p>
        Use <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>. It will be passed on.
        Sending to the wrong address is not a mistake worth worrying about.
      </p>
    </MarketingShell>
  );
}

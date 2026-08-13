import { MarketingNote, MarketingShell } from "@/features/marketing/marketing-shell";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms you agree to when using ${BRAND.name}, including what the service is, what it is not, and the limits of what it can promise.`,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: `Terms of Service — ${BRAND.name}`,
    description: `The terms you agree to when using ${BRAND.name}.`,
    url: "/terms",
  },
};

const UPDATED = "2026-08-13";

export default function TermsPage() {
  return (
    <MarketingShell
      eyebrow="Legal"
      title="Terms of Service"
      lede={`These terms cover what ${BRAND.name} provides, what it expects of you, and — importantly — what it deliberately does not claim to be.`}
      updated={UPDATED}
    >
      <h2>Agreement</h2>
      <p>
        By creating an account or using {BRAND.name}, you agree to these terms. If you do not agree
        with them, please do not use the service.
      </p>

      <h2>What {BRAND.name} is</h2>
      <p>
        {BRAND.name} is a personal budgeting tool. It takes figures you enter — salary, bills,
        goals, investments, spending — and arithmetic you could do yourself, and presents the result
        as a daily spending figure. It is a calculator and a record, nothing more.
      </p>

      <h2>What {BRAND.name} is not</h2>
      <p>
        This matters more than anything else on this page.{" "}
        <strong>{BRAND.name} does not provide financial, investment, tax, or legal advice.</strong>{" "}
        It is not a bank, a broker, a payment service, or a licensed adviser, and it is not
        regulated as any of those. Nothing it displays is a recommendation to spend, save, invest,
        or borrow.
      </p>
      <p>
        Every number it shows is derived from what you entered. If your inputs are incomplete or out
        of date, the output will be too — and it cannot know that. Decisions about your money remain
        yours, and for anything consequential you should speak to a qualified professional.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be 18 or older to hold an account.</li>
        <li>Provide accurate registration details and keep your password confidential.</li>
        <li>You are responsible for activity under your account.</li>
        <li>Tell us promptly if you believe your account has been accessed by someone else.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Break the law, or use the service to help anyone else do so.</li>
        <li>
          Attempt to gain unauthorised access to the service, other users&rsquo; data, or the
          underlying infrastructure.
        </li>
        <li>
          Probe, scrape, or overload the service, or work around rate limits and other protective
          measures.
        </li>
        <li>Upload malicious code, or interfere with the service&rsquo;s operation for others.</li>
      </ul>

      <h2>The public demo</h2>
      <p>
        The demo account is shared by every visitor and holds fabricated data. It is wiped and
        rebuilt periodically, anything entered in it is visible to others, and none of it is
        private. Do not put real information there.
      </p>

      <h2>Availability</h2>
      <p>
        {BRAND.name} is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. No
        particular level of uptime is guaranteed, and the service may be changed, interrupted, or
        discontinued. Keep your own copy of anything you cannot afford to lose — the export feature
        exists for exactly this.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {BRAND.name} and its operators are not liable for
        any indirect, incidental, or consequential loss, or for any financial loss arising from
        decisions you make while using the service. Nothing in these terms excludes liability that
        cannot lawfully be excluded.
      </p>

      <h2>Your content</h2>
      <p>
        The financial records you enter remain yours. You grant only the permission needed to store
        and process them so the service can function, as described in the{" "}
        <Link href="/privacy">Privacy Policy</Link>. That permission ends when you delete the data or your
        account.
      </p>

      <h2>Ending your use</h2>
      <p>
        You may stop using {BRAND.name} and delete your account at any time. Accounts may be
        suspended or closed where these terms are breached, or where required to protect the service
        or its users.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may be updated. Material changes will be reflected in the date at the top of
        this page, and continuing to use the service after a change means you accept the revised
        terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can go to{" "}
        <a href={`mailto:${BRAND.legalEmail}`}>{BRAND.legalEmail}</a>.
      </p>

      <MarketingNote>
        <p>
          These terms have not been reviewed by a lawyer, and they do not name a governing
          jurisdiction — that clause depends on where the operating entity is established. Have a
          qualified practitioner review and complete them before launch.
        </p>
      </MarketingNote>
    </MarketingShell>
  );
}

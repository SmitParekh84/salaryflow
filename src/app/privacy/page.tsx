import { ProseNote, ProsePage } from "@/features/site/site-shell";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${BRAND.name} collects, stores, and handles your personal and financial information - and what it never does.`,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: `Privacy Policy - ${BRAND.name}`,
    description: `How ${BRAND.name} collects, stores, and handles your personal and financial information.`,
    url: "/privacy",
  },
};

const UPDATED = "2026-08-13";

export default function PrivacyPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Privacy Policy"
      lede={`${BRAND.name} exists to help you understand your own money. That only works if you trust it with real numbers, so this page states plainly what is collected, where it lives, and what is never done with it.`}
      updated={UPDATED}
    >
      <h2>The short version</h2>
      <p>
        {BRAND.name} never connects to your bank. It stores only what you type in. It runs no
        advertising trackers and no third-party analytics. Your financial records are not sold,
        rented, or shared with advertisers - not in aggregate, not anonymised, not ever.
      </p>

      <h2>What is collected</h2>

      <h3>Account information</h3>
      <ul>
        <li>Your email address, used to sign in and to send verification and reset codes.</li>
        <li>Your display name, if you provide one.</li>
        <li>
          A one-way <strong>hash</strong> of your password. The password itself is never stored and
          cannot be recovered from the hash - only reset.
        </li>
      </ul>

      <h3>Financial information you enter</h3>
      <p>
        All of it is information you type in yourself: salary amount and payday, expenses,
        recurring bills, savings goals, investments, budget rules, and the names and balances of
        bank accounts and credit cards you choose to track.
      </p>
      <p>
        Note what this list does <strong>not</strong> include. {BRAND.name} has no bank integration,
        so it never receives or stores account numbers, card numbers, IFSC codes, UPI IDs, net
        banking credentials, or any other means of moving money. An account balance in {BRAND.name}{" "}
        is a number you typed, not a live connection.
      </p>

      <h3>Technical information</h3>
      <ul>
        <li>
          A single session cookie, <code>sf_session</code>. It is <strong>httpOnly</strong> (not
          readable by scripts), <strong>SameSite=Strict</strong> (not sent from other sites), and
          served only over HTTPS in production. It holds a signed session token - no financial data.
        </li>
        <li>
          Standard server logs kept by the hosting provider, which include IP addresses, for
          security and abuse prevention.
        </li>
      </ul>

      <h3>What is not collected</h3>
      <p>
        There are no advertising cookies, no tracking pixels, no session recorders, and no
        third-party analytics. The application&rsquo;s Content Security Policy restricts network
        connections to its own origin, so the pages you view cannot quietly report to anyone else.
      </p>

      <h2>How your information is used</h2>
      <ul>
        <li>To calculate and display your daily safe-to-spend figure and related summaries.</li>
        <li>To sign you in and keep you signed in across devices.</li>
        <li>
          To send transactional email - verification codes and password resets. No marketing email
          is sent without you asking for it.
        </li>
        <li>To keep the service secure, including rate limiting and abuse prevention.</li>
      </ul>
      <p>
        Your data is not used to train machine-learning models, is not profiled for advertising, and
        is not enriched with information bought from data brokers.
      </p>

      <h2>Who else can see it</h2>
      <p>
        {BRAND.name} relies on a small number of service providers to operate. Each receives only
        what its function requires:
      </p>
      <ul>
        <li>
          <strong>Database hosting</strong> - stores your account and financial records so they
          persist between sessions.
        </li>
        <li>
          <strong>Email delivery</strong> - receives your email address and the message body in
          order to deliver verification and reset codes.
        </li>
        <li>
          <strong>Application hosting</strong> - runs the service and keeps standard access logs.
        </li>
      </ul>
      <p>
        Beyond these, your information is disclosed only where the law requires it, and only to the
        extent required.
      </p>

      <h2>The public demo</h2>
      <p>
        The &ldquo;Explore live demo&rdquo; button signs you into a shared demonstration account
        containing entirely fabricated data. That account is public: every visitor sees the same
        one, and anything entered there is visible to other visitors and is periodically erased and
        rebuilt. <strong>Do not enter real personal or financial information into the demo.</strong>
      </p>

      <h2>How long it is kept</h2>
      <p>
        Your records are kept for as long as your account exists. Items you delete move to the
        recycle bin, where you can restore them until you empty it. When you delete your account,
        the associated financial records are removed. Backups and server logs may persist for a
        short additional period before rotating out.
      </p>

      <h2>Your rights over your data</h2>
      <p>
        You can view and edit every record from within the app, export your data, and delete
        individual records or your entire account. Depending on where you live, you may also have
        statutory rights to access, correct, port, or erase your personal data, and to complain to a
        data protection authority. To exercise any of these, write to{" "}
        <a href={`mailto:${BRAND.legalEmail}`}>{BRAND.legalEmail}</a>.
      </p>

      <h2>Security</h2>
      <p>
        Passwords are hashed, sessions are signed and carried in a hardened cookie, traffic is
        served over HTTPS with strict transport security, and the application sets a restrictive
        Content Security Policy. No system is perfectly secure, so please use a unique password and
        tell us promptly if you suspect a problem with your account.
      </p>

      <h2>Children</h2>
      <p>
        {BRAND.name} is not directed at children and should not be used by anyone under 18. If you
        believe a child has created an account, contact us and it will be removed.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If this policy changes in a way that materially affects how your information is handled, the
        date at the top of this page will change and, where appropriate, you will be notified in the
        app or by email.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy, or about your data, can go to{" "}
        <a href={`mailto:${BRAND.legalEmail}`}>{BRAND.legalEmail}</a>.
      </p>

      <ProseNote>
        <p>
          This policy describes how the software actually behaves, but it has not been reviewed by a
          lawyer. Before launching publicly - and particularly before handling users in the EU, the
          UK, or under India&rsquo;s DPDP Act - have a qualified practitioner check it against the
          obligations that apply to you.
        </p>
      </ProseNote>
    </ProsePage>
  );
}

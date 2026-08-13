import { MarketingShell } from "@/features/marketing/marketing-shell";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: `Why ${BRAND.name} reduces your whole financial picture to one number a day, and who it is built for.`,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About — ${BRAND.name}`,
    description: `Why ${BRAND.name} reduces your whole financial picture to one number a day.`,
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <MarketingShell
      eyebrow={`About ${BRAND.name}`}
      title="One number, instead of a wall of charts."
      lede="Most money apps answer a question nobody asks at the counter: where did it all go last month? Aartha answers the one you actually have, standing there with your card out — can I afford this right now?"
    >
      <h2>The problem with looking at your balance</h2>
      <p>
        A bank balance is a lie of omission. It shows ₹40,000 and says nothing about the rent due on
        the 1st, the insurance premium that lands in February, the SIP that goes out on the 5th, or
        the fact that payday is still eleven days away. To know what that balance really means, you
        have to hold half a dozen future obligations in your head and do the arithmetic — every
        time.
      </p>
      <p>Most people don&rsquo;t. They guess, and the guess is wrong in the last week of the month.</p>

      <h2>What {BRAND.name} does instead</h2>
      <p>
        {BRAND.name} does that arithmetic once and keeps doing it. It takes your salary and the date
        it arrives, subtracts the bills you have protected, the savings you have committed, and the
        investments you have scheduled, then paces whatever is genuinely left across the days until
        your next payday.
      </p>
      <p>
        The result is a single figure: what you can spend today without borrowing from a commitment
        you have already made. Record a purchase and it recalculates immediately. That is the entire
        product.
      </p>

      <h2>Built around the salary cycle</h2>
      <p>
        Most budgeting tools organise around the calendar month. Salaried people don&rsquo;t live in
        calendar months — they live from payday to payday, and payday might be the 1st, the 7th, or
        the 25th. {BRAND.name} treats your cycle as the unit that matters, so the numbers line up
        with how your money actually arrives.
      </p>

      <h2>No bank connection. On purpose.</h2>
      <p>
        {BRAND.name} does not link to your bank, and this is a design decision rather than a missing
        feature. Handing an app read access to your accounts means trusting an aggregator with
        credentials and a complete transaction history, permanently, for the sake of saving some
        typing.
      </p>
      <p>
        Entering your own figures costs a little effort and buys two things: nothing leaves your
        account without your knowledge, and you stay aware of your own numbers instead of
        outsourcing that awareness to a sync job. What you tell it is all it knows — see the{" "}
        <Link href="/privacy">Privacy Policy</Link> for exactly what that means.
      </p>

      <h2>Who it is for</h2>
      <p>
        Salaried people who want to stop doing mental arithmetic at the checkout, who would rather
        reach payday deliberately than find out how they did afterwards, and who want a clear record
        of their commitments without a trading terminal&rsquo;s worth of charts.
      </p>
      <p>
        It is not built for day traders, for businesses, or for anyone who wants their spending
        automatically categorised by a model. It does one thing.
      </p>

      <h2>Where it is going</h2>
      <p>
        {BRAND.name} is in early access. You can try the full interactive demo without an account,
        or join the waitlist from the <Link href="/">home page</Link>. Feedback genuinely shapes what gets
        built next — send it to{" "}
        <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a> or find us on{" "}
        <a href={BRAND.linkedin} rel="noreferrer noopener" target="_blank">
          LinkedIn
        </a>
        .
      </p>
    </MarketingShell>
  );
}

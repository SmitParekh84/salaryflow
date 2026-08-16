import { MarketingShell } from "@/features/marketing/marketing-shell";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${BRAND.name} is free while it is in early access. What that means, and what happens if that changes.`,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pricing — ${BRAND.name}`,
    description: `${BRAND.name} is free while it is in early access.`,
    url: "/pricing",
  },
};

export default function PricingPage() {
  return (
    <MarketingShell
      eyebrow="Pricing"
      title="Free while it is in early access."
      lede={`${BRAND.name} costs nothing to use today. There is one version of the app, everyone gets all of it, and nothing is held back behind a tier.`}
    >
      <h2>What free means here</h2>
      <p>
        Every feature is included: the salary cycle, safe-to-spend, bills, goals, budget rules, the
        finance assistant and the full history. There is no trial that expires, no card to enter,
        and no feature that stops working after a month.
      </p>

      <h2>What it does not mean</h2>
      <p>
        Free is not paid for by selling anything about you. {BRAND.name} does not sell data, does
        not run ads, and does not connect to your bank — see the{" "}
        <Link href="/privacy">Privacy Policy</Link> for what is actually stored. It is free because
        it is early and the priority is people using it, not revenue.
      </p>

      <h2>If a paid plan ever arrives</h2>
      <p>
        It might. If it does, two things hold. Existing accounts will be told well in advance rather
        than discovering it at a paywall, and the core of the product — knowing what is safe to
        spend today — will stay in the free version. Anything paid would sit on top of that, not in
        front of it.
      </p>
      <p>
        Your data stays yours either way. Settings has CSV and JSON export, so leaving never means
        losing your records.
      </p>

      <h2>Questions</h2>
      <p>
        Ask at <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>, or read more{" "}
        <Link href="/about">about why the app works this way</Link>.
      </p>
    </MarketingShell>
  );
}

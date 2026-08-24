import { LandingV2 } from "@/features/landing-v2/landing-v2";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

/**
 * A draft landing page, reachable but not published.
 *
 * `noindex, nofollow` and the disallow rule in robots.ts keep it out of search
 * while it is being worked on — two pages competing for the same brand terms
 * splits their ranking, and the loser is whichever one Google picks. It is
 * deliberately absent from sitemap.ts for the same reason: that file and the
 * robots disallow list have to stay disjoint, or Search Console reports the
 * contradiction as an error.
 *
 * When this replaces the live page, the change is: move this component into
 * src/app/page.tsx, delete this route, drop the robots rule.
 */
export const metadata: Metadata = {
  title: `${BRAND.name} v2 (draft)`,
  description: BRAND.description,
  robots: { index: false, follow: false },
  alternates: { canonical: "/v2" },
};

export default function LandingV2Page() {
  return <LandingV2 />;
}

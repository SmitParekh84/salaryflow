import { LandingV5 } from "@/features/landing-v5/landing-v5";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

/**
 * The light draft. Same reasoning as the other drafts: reachable, deliberately
 * not indexable, and absent from sitemap.ts because that list and the robots
 * disallow list have to stay disjoint.
 */
export const metadata: Metadata = {
  title: `${BRAND.name} v5 (draft)`,
  description: BRAND.description,
  robots: { index: false, follow: false },
  alternates: { canonical: "/v5" },
};

export default function LandingV5Page() {
  return <LandingV5 />;
}

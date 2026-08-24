import { LandingV3 } from "@/features/landing-v3/landing-v3";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

/**
 * The second landing-page draft. Same reasoning as /v2: reachable, deliberately
 * not indexable, and absent from sitemap.ts because that list and the robots
 * disallow list have to stay disjoint.
 */
export const metadata: Metadata = {
  title: `${BRAND.name} v3 (draft)`,
  description: BRAND.description,
  robots: { index: false, follow: false },
  alternates: { canonical: "/v3" },
};

export default function LandingV3Page() {
  return <LandingV3 />;
}

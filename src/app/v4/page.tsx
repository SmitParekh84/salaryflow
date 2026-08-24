import { LandingV4 } from "@/features/landing-v4/landing-v4";
import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";

/**
 * The third landing-page draft. Same reasoning as /v2 and /v3: reachable,
 * deliberately not indexable, and absent from sitemap.ts because that list and
 * the robots disallow list have to stay disjoint.
 */
export const metadata: Metadata = {
  title: `${BRAND.name} v4 (draft)`,
  description: BRAND.description,
  robots: { index: false, follow: false },
  alternates: { canonical: "/v4" },
};

export default function LandingV4Page() {
  return <LandingV4 />;
}

import { absoluteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";

/**
 * Everything behind the session cookie is disallowed.
 *
 * These routes redirect to /login for anyone without a session, so a crawler
 * would only ever index the login page under a dozen different URLs — duplicate
 * content pointing at a page that is itself not worth ranking.
 *
 * `/login` and `/register` are deliberately absent: they carry their own
 * `robots: { index: true }` and canonical tags, which is the right call for
 * branded searches like "Aartha login". Disallowing them here would contradict
 * that. `/offline` is a service-worker fallback with no standalone meaning, and
 * `/forgot-password` is a dead end for a search visitor.
 */
const PRIVATE_PATHS = [
  "/api/",
  "/admin",
  "/dashboard",
  "/expenses",
  "/analytics",
  "/bills",
  "/goals",
  "/investments",
  "/accounts",
  "/rules",
  "/salary-history",
  "/funding-plan",
  "/recycle-bin",
  "/settings",
  "/shared",
  "/onboarding",
  "/forgot-password",
  "/offline",
  /*
   * A draft landing page, not a private one. It is disallowed because it says
   * almost exactly what `/` says: two pages competing for the same brand terms
   * split their ranking and Google picks the winner, which may well be the
   * draft. Remove this line when v2 either replaces `/` or is deleted.
   */
  "/v2",
  "/v3",
  "/v4",
  "/v5",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}

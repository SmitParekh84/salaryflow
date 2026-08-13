import { BRAND } from "./brand";

/**
 * The public origin, without a trailing slash.
 *
 * Canonical tags, Open Graph URLs, the sitemap and transactional email all have
 * to name the same origin. When they drift, search engines index one host while
 * links point at another and the ranking signal splits between them — so this
 * is deliberately the single place the value is resolved.
 *
 * `NEXT_PUBLIC_SITE_ORIGIN` wins so a staging host can identify itself
 * correctly; the brand URL is the fallback for local development.
 */
export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/, "") || BRAND.url;

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

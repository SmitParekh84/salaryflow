/**
 * Every user-visible brand string lives here.
 *
 * The product is "Aartha". The domain appears in URLs, metadata, the email
 * sender and the footer — never in body copy.
 */
export const BRAND = {
  name: "Aartha",
  domain: "aartha.app",
  url: "https://aartha.app",

  /** Hero, page title, manifest, email footer. */
  brandline: "Know what's safe to spend today.",
  /**
   * The `Brand` wordmark tagline slot renders at 10px and truncates, so the
   * full brandline clips there.
   */
  brandlineShort: "Know what's safe to spend.",

  description:
    "A salary-cycle money app that tells you exactly how much you can safely spend today, every day until your next salary.",
} as const;

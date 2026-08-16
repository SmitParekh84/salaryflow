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
  linkedin: "https://www.linkedin.com/company/aartha-app",
  instagram: "https://www.instagram.com/aartha.app",
  /**
   * Published contact addresses. Both mailboxes have to stay monitored — a
   * privacy policy naming an address nobody reads is worse than one naming
   * none.
   *
   * The split is deliberate. `legalEmail` is on the brand's own domain, which
   * is what a data-protection request or a legal notice should be sent to; it
   * also identifies the organisation in the page's structured data. Everyday
   * product questions go to `supportEmail` so they don't share an inbox with
   * formal correspondence.
   */
  legalEmail: "smit@aartha.app",
  supportEmail: "help.aartha@gmail.com",

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

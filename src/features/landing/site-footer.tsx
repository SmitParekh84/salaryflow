import { BrandMark } from "@/components/brand";
import { BRAND } from "@/lib/brand";
import Link from "next/link";
import styles from "./landing.module.css";

/**
 * Landing-page footer.
 *
 * Deliberately not built on the app's theme tokens: the marketing page fixes
 * its own palette (`--ink`, no dark-scheme branch), so a theme-reactive footer
 * would render dark beneath a permanently light hero. It carries the landing
 * palette instead, and stays out of the authenticated app shell.
 *
 * Every link here points at something that exists — the four landing sections,
 * the account routes, and the company pages.
 */

const SECTION_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#privacy", label: "Privacy" },
  { href: "#faq", label: "FAQ" },
];

const ROUTE_LINKS = [
  { href: "/download", label: "Install the app" },
  { href: "/register", label: "Create an account" },
  { href: "/login", label: "Sign in" },
];

const COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <div className={styles.footerBrand}>
          <span className={styles.footerLockup}>
            <BrandMark size="lg" />
            <span className={styles.footerWordmark}>{BRAND.name}</span>
          </span>
          <p className={styles.footerBrandline}>{BRAND.brandline}</p>
          <p className={styles.footerBlurb}>
            Built for salaried people who want one clear number instead of a wall of charts.
          </p>
        </div>

        <nav className={styles.footerNav} aria-label="Footer">
          <div className={styles.footerGroup}>
            <h2 className={styles.footerHeading}>Product</h2>
            <ul>
              {SECTION_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.footerGroup}>
            <h2 className={styles.footerHeading}>Get started</h2>
            <ul>
              {ROUTE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.footerGroup}>
            <h2 className={styles.footerHeading}>Company</h2>
            <ul>
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      <div className={styles.footerBottom}>
        <p>
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </p>
        <div className={styles.footerMeta}>
          <a
            className={styles.footerSocial}
            href={BRAND.linkedin}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM2.4 21.5h5.16V9.75H2.4V21.5Zm7.7-11.75h4.95v1.6h.07a5.43 5.43 0 0 1 4.88-2.68c5.22 0 6.18 3.44 6.18 7.9v6.93h-5.15v-6.14c0-1.47-.03-3.35-2.04-3.35-2.05 0-2.36 1.6-2.36 3.25v6.24H10.1V9.75Z" />
            </svg>
            LinkedIn
          </a>
          <p className={styles.footerDomain}>{BRAND.domain}</p>
        </div>
      </div>
    </footer>
  );
}

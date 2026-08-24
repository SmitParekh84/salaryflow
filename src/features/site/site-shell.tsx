"use client";

import { BrandMark } from "@/components/brand";
import { BRAND } from "@/lib/brand";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./site.module.css";
import { SiteNavMenu } from "./site-nav-menu";
import { ThemeSwitch } from "./theme-switch";
import { ScrollTrigger, revealIn, showNow, useScene } from "./use-gsap";

/* ---------------------------------------------------------------------------
   The public site's chrome and its shared primitives.

   One header and one footer for every page outside the app: the landing page,
   the marketing pages and the legal pages. They were previously three different
   shells wearing two different stylesheets, which is why the public surface
   never quite read as one site.

   Everything here consumes the tokens in site.module.css, so a colour decision
   is made once and the whole public surface follows.
   --------------------------------------------------------------------------- */

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export function SiteNav() {
  const ref = useScene<HTMLElement>((api, root) => {
    // A numeric start is a scroll position in pixels. A triggerless string start
    // is measured against the scroller's own box, resolves to 0, and the bar
    // would gain its border on the first pixel of scroll.
    const drive = () =>
      ScrollTrigger.create({
        start: 12,
        end: "max",
        onToggle: (self) => root.classList.toggle(styles.navSolid, self.isActive),
      });
    api.motion(drive);
    api.still(drive);
  });

  return (
    <header className={styles.nav} ref={ref}>
      <Link href="/" className={styles.navBrand}>
        <BrandMark size="sm" />
        {BRAND.name}
      </Link>
      <nav className={styles.navLinks} aria-label="Site">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className={styles.navActions}>
        <ThemeSwitch />
        {/* The pill is hidden on a phone and its job moves into the menu panel,
            so the bar is a logo, a switch and one control rather than three
            competing ones in 350px. */}
        <Link href="/waitlist" className={`${styles.btn} ${styles.btnSmall} ${styles.navCta}`}>
          Join waitlist
        </Link>
        <SiteNavMenu links={NAV_LINKS} />
      </div>
    </header>
  );
}

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/download", label: "Install the app" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { href: "/waitlist", label: "Join the waitlist" },
      { href: "/register", label: "Create an account" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <div>
          <span className={styles.footerBrand}>
            <BrandMark size="sm" />
            {BRAND.name}
          </span>
          <p className={styles.footerBlurb}>{BRAND.brandline}</p>
          <p className={styles.footerBlurb}>
            Built for salaried people who want one clear number instead of a wall of
            charts.
          </p>
        </div>

        <div className={styles.footerNav}>
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className={styles.footerHeading}>{column.heading}</p>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footerBottom}>
        <span>
          &copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </span>
        <span>{BRAND.domain}</span>
      </div>
    </footer>
  );
}

/**
 * A section whose contents rise once as it enters.
 *
 * The marketing pages are mostly prose and lists, so they need one primitive
 * rather than a scene builder each. Anything with `data-rise` inside is
 * revealed in document order.
 */
export function Rise({
  children,
  className = "",
  as: Tag = "div",
  stagger = 0.07,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  stagger?: number;
}) {
  const ref = useScene<HTMLElement>((api, root) => {
    const items = root.querySelectorAll<HTMLElement>("[data-rise]");
    if (!items.length) return;
    api.motion(() => revealIn(items, { trigger: root, stagger }));
    api.still(() => showNow(items));
  });

  return (
    // The cast is the price of a polymorphic tag with one shared ref type; both
    // branches are HTMLElement and the ref is only ever read as one.
    <Tag className={className} ref={ref as React.Ref<HTMLDivElement & HTMLElement>}>
      {children}
    </Tag>
  );
}

/**
 * Shell for pages read as a single column of prose — the privacy policy and the
 * terms. One measured column, and nothing else competing with it.
 */
export function ProsePage({
  eyebrow,
  title,
  lede,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  /** ISO date, rendered as the "last updated" line. */
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <SiteNav />
      <main className={styles.proseMain}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.proseTitle}>{title}</h1>
        {lede ? <p className={styles.lead}>{lede}</p> : null}
        {updated ? (
          <time className={styles.proseUpdated} dateTime={updated}>
            Last updated{" "}
            {new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </time>
        ) : null}
        <article className={styles.prose}>{children}</article>
      </main>
      <SiteFooter />
    </div>
  );
}

/** The advisory callout used on the legal pages. */
export function ProseNote({ children }: { children: ReactNode }) {
  return <div className={styles.proseNote}>{children}</div>;
}

/**
 * Shell for pages built from designed sections — about, pricing, contact,
 * waitlist, download.
 */
export function SectionPage({
  children,
  hero,
}: {
  children: ReactNode;
  hero: { eyebrow: string; title: ReactNode; lede?: string };
}) {
  return (
    <div className={styles.page}>
      <SiteNav />
      <main>
        <Rise className={styles.pageHero} as="section">
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-rise>
            {hero.eyebrow}
          </p>
          <h1 className={`${styles.display} ${styles.reveal}`} data-rise>
            {hero.title}
          </h1>
          {hero.lede ? (
            <p className={`${styles.lead} ${styles.reveal}`} data-rise>
              {hero.lede}
            </p>
          ) : null}
        </Rise>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

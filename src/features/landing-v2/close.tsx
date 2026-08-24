"use client";

import { BRAND } from "@/lib/brand";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import styles from "./landing-v2.module.css";
import { gsap, revealIn, showNow, splitHeading, useScene } from "./use-gsap";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/v2#cycle", label: "How it works" },
      { href: "/v2#features", label: "Features" },
      { href: "/v2#ai", label: BRAND.assistantName },
      { href: "/v2#privacy", label: "Privacy" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { href: "/waitlist", label: "Join the waitlist" },
      { href: "/download", label: "Install the app" },
      { href: "/register", label: "Create an account" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/pricing", label: "Pricing" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

/**
 * The closing ask, and the footer.
 *
 * The price is stated here rather than linked to, because "free" is the single
 * most persuasive thing the page has to say and making the reader open another
 * tab to find it out wastes it. The wording matches /pricing exactly — free
 * while in early access, no card — so the two pages cannot drift into saying
 * different things about what it costs.
 */
export function Close() {
  // A plain wrapper rather than a <section>: this component renders the closing
  // section and the footer, and a <footer> nested inside a <section> would put
  // the page's contentinfo landmark inside a region that is not the page.
  const ref = useScene<HTMLDivElement>((api, root) => {
    const title = root.querySelector<HTMLElement>("[data-title]");
    const items = root.querySelectorAll<HTMLElement>("[data-item]");
    const footer = root.querySelectorAll<HTMLElement>("[data-footer]");

    api.motion(() => {
      if (title) {
        const split = splitHeading(title);
        gsap.fromTo(
          split.chars,
          { yPercent: 110, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.012,
            scrollTrigger: { trigger: title, start: "top 82%", once: true },
          },
        );
        gsap.set(title, { opacity: 1 });
      }
      revealIn(items, { trigger: root, stagger: 0.1 });
      revealIn(footer, { trigger: footer[0], stagger: 0.06, y: 18 });
    });

    api.still(() => {
      if (title) showNow(title);
      showNow(items);
      showNow(footer);
    });
  });

  return (
    <div ref={ref}>
      <section className={styles.close}>
        <div className={styles.closeGlow} aria-hidden />
        <div className={styles.closeInner}>
          <p className={`${styles.priceBadge} ${styles.reveal}`} data-item>
            <Sparkles aria-hidden style={{ height: 15, width: 15, color: "var(--lime)" }} />
            <b>&#8377;0</b> per month while Aartha is in early access &mdash; no card needed
          </p>

          <h2 className={`${styles.display} ${styles.closeTitle}`} data-title>
            Make it to payday <span className={styles.accent}>with confidence.</span>
          </h2>

          <p
            className={`${styles.lead} ${styles.reveal}`}
            data-item
            style={{ margin: "26px auto 0", textAlign: "center" }}
          >
            Join the waitlist, or step straight into a fully seeded demo account and see
            your own number before you type a single figure.
          </p>

          <div className={`${styles.closeActions} ${styles.reveal}`} data-item>
            <Link href="/waitlist" className={styles.btnPrimary}>
              Join the waitlist
              <ArrowRight aria-hidden />
            </Link>
            <Link href="/login?demo=1" className={styles.btnGhost}>
              <Play aria-hidden />
              Explore live demo
            </Link>
          </div>

          <p className={`${styles.closeNote} ${styles.reveal}`} data-item>
            Early access updates only. No spam, and no card.
          </p>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.reveal} data-footer>
            <p style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.015em" }}>
              {BRAND.name}
            </p>
            <p className={styles.footerBlurb}>{BRAND.brandline}</p>
            <p className={styles.footerBlurb}>
              Built for salaried people who want one clear number instead of a wall of
              charts.
            </p>
          </div>

          <div className={styles.footerNav}>
            {COLUMNS.map((column) => (
              <div key={column.heading} className={styles.reveal} data-footer>
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
          <span>&copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
          <span>{BRAND.domain}</span>
        </div>
      </footer>
    </div>
  );
}

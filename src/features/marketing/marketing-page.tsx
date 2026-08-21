import { SiteFooter } from "@/features/landing/site-footer";
import { SiteNav } from "@/features/landing/site-nav";
import landing from "@/features/landing/landing.module.css";
import type { ReactNode } from "react";
import styles from "./marketing-page.module.css";

/**
 * Frame for the designed marketing pages.
 *
 * Deliberately built on the landing page's stylesheet rather than a parallel
 * one: the palette custom properties live on `landing.page`, and the nav and
 * footer are the same components the home page renders. A second copy of any of
 * the three is how the two surfaces drift apart.
 *
 * `MarketingShell` remains the frame for the legal pages, which are read
 * top-to-bottom as prose and want a measure, not sections.
 */
export function MarketingPage({ children }: { children: ReactNode }) {
  return (
    <div className={landing.page}>
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Centred page opener: eyebrow, headline, standfirst, optional buttons. */
export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lede: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} />
      <div className={styles.heroInner}>
        <p className={landing.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.heroLede}>{lede}</p>
        {children && <div className={styles.heroActions}>{children}</div>}
      </div>
    </section>
  );
}

/** Closing call to action, shared by every marketing page. */
export function PageCta({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  copy: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.ctaSection}>
      <div className={styles.ctaInner}>
        <p className={landing.eyebrow}>{eyebrow}</p>
        <h2>{title}</h2>
        <p>{copy}</p>
        <div className={styles.ctaActions}>{children}</div>
      </div>
    </section>
  );
}

import { SiteFooter } from "@/features/landing/site-footer";
import { SiteNav } from "@/features/landing/site-nav";
import type { ReactNode } from "react";
import styles from "./marketing.module.css";

/**
 * Shell for the public pages that are read as prose rather than browsed as
 * sections: the privacy policy and the terms.
 *
 * Reuses the landing nav and footer rather than growing a second set, so the
 * public surface is one site with one header. Everything below the header stays
 * a single measured column, which is what a legal document wants.
 *
 * Pages built out of designed sections use `MarketingPage` instead.
 */
export function MarketingShell({
  eyebrow,
  title,
  lede,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  /** ISO date; rendered as the "last updated" line on the legal pages. */
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <SiteNav />

      <main className={styles.main}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        {lede && <p className={styles.lede}>{lede}</p>}
        {updated && (
          <time className={styles.updated} dateTime={updated}>
            Last updated{" "}
            {new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </time>
        )}
        <article className={styles.prose}>{children}</article>
      </main>

      <SiteFooter />
    </div>
  );
}

/** Shared callout styling for the advisory notes on the legal pages. */
export function MarketingNote({ children }: { children: ReactNode }) {
  return <div className={styles.note}>{children}</div>;
}

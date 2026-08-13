import { BrandMark } from "@/components/brand";
import { SiteFooter } from "@/features/landing/site-footer";
import { BRAND } from "@/lib/brand";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./marketing.module.css";

/**
 * Shell for the public content pages.
 *
 * Reuses the landing footer rather than growing a second one, so the two
 * surfaces stay in step. The header is intentionally simpler than the landing
 * nav: these pages are read, not browsed, and a full section menu would point
 * at anchors that only exist on the home page.
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
      <header className={styles.topbar}>
        <Link href="/" className={styles.lockup}>
          <BrandMark />
          <span className={styles.wordmark}>{BRAND.name}</span>
        </Link>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to home
        </Link>
      </header>

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

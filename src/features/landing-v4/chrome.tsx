"use client";

import { BrandMark } from "@/components/brand";
import { BRAND } from "@/lib/brand";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { ACCOUNT, AVAILABLE, SAFE_TODAY } from "./cycle";
import styles from "./landing-v4.module.css";
import { ScrollTrigger, revealIn, showNow, useScene } from "./use-gsap";
import { formatMoney } from "@/lib/utils";

const LINKS = [
  { href: "#split", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

export function Nav() {
  const railRef = useRef<HTMLDivElement>(null);

  const ref = useScene<HTMLElement>((api, root) => {
    const drive = () => {
      const rail = railRef.current;
      if (rail) {
        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => {
            rail.style.transform = `scaleX(${self.progress})`;
          },
        });
      }
      // A numeric start is a scroll position in pixels. A triggerless string
      // start is measured against the scroller's own box and resolves to 0, so
      // the bar condensed on the first pixel of scroll and flickered.
      ScrollTrigger.create({
        start: 14,
        end: "max",
        onToggle: (self) => root.classList.toggle(styles.navCondensed, self.isActive),
      });
    };

    api.motion(drive);
    api.still(drive);
  });

  return (
    <>
      <div className={styles.rail} ref={railRef} aria-hidden />
      <header className={styles.nav} ref={ref}>
        <Link href="/v4" className={styles.navBrand}>
          <BrandMark size="sm" />
          {BRAND.name}
        </Link>
        <nav className={styles.navLinks} aria-label="Sections">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/waitlist" className={`${styles.btn} ${styles.btnSmall}`}>
          Join waitlist
          <ArrowRight aria-hidden />
        </Link>
      </header>
    </>
  );
}

/**
 * The close. The figure is stated one last time, at the size it deserves, with
 * the field still moving behind it.
 */
export function Close() {
  const ref = useScene<HTMLDivElement>((api, root) => {
    const items = root.querySelectorAll<HTMLElement>("[data-item]");
    api.motion(() => revealIn(items, { trigger: root, stagger: 0.09 }));
    api.still(() => showNow(items));
  });

  return (
    <div ref={ref}>
      <section className={styles.close}>
        <div className={styles.closeInner}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-item>
            Day {ACCOUNT.today}, and every day after it
          </p>
          <p className={`${styles.closeFigure} ${styles.tnum} ${styles.reveal}`} data-item>
            {formatMoney(SAFE_TODAY)}
          </p>
          <h2 className={`${styles.h2} ${styles.reveal}`} data-item>
            That is what today is worth.
          </h2>
          <p className={`${styles.lead} ${styles.reveal}`} data-item>
            Out of {formatMoney(ACCOUNT.salary)}, with {formatMoney(ACCOUNT.bills)} of bills
            already protected and {formatMoney(AVAILABLE)} left for the cycle. Free while
            Aartha is in early access, and no card.
          </p>
          <div className={`${styles.closeActions} ${styles.reveal}`} data-item>
            <Link href="/login?demo=1" className={styles.btn}>
              <Play aria-hidden />
              Open the demo
            </Link>
            <Link href="/waitlist" className={styles.btnGhost}>
              Join the waitlist
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>
          &copy; {new Date().getFullYear()} {BRAND.name} &middot; {BRAND.domain}
        </span>
        <span className={styles.footerLinks}>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </span>
      </footer>
    </div>
  );
}

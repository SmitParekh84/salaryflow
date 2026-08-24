"use client";

import { BrandMark } from "@/components/brand";
import { BRAND } from "@/lib/brand";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import styles from "./landing-v3.module.css";
import { ScrollTrigger, revealIn, showNow, useScene } from "./use-gsap";

const LINKS = [
  { href: "#tour", label: "The app" },
  { href: "#how", label: "How it works" },
  { href: "#everything", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

/**
 * Fixed bar plus the page's scroll-progress rail.
 *
 * The rail is driven in both motion branches: it is progress, not decoration,
 * and scrubbing a 2px bar against the reader's own scroll adds no movement they
 * did not themselves cause.
 */
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
      // A numeric start is a scroll position in pixels, which is what this
      // means. A triggerless string start resolves to 0 and the bar condenses
      // on the first pixel of scroll.
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
        <Link href="/v3" className={styles.navBrand}>
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

/** The closing ask and a one-line footer. */
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
          <p className={`${styles.badge} ${styles.reveal}`} data-item>
            <Sparkles aria-hidden style={{ height: 14, width: 14, color: "var(--lime)" }} />
            <b>&#8377;0</b> a month in early access &mdash; no card
          </p>

          <h2 className={`${styles.display} ${styles.reveal}`} data-item>
            See your number <span className={styles.accent}>tonight.</span>
          </h2>

          <p
            className={`${styles.lead} ${styles.reveal}`}
            data-item
            style={{ margin: "20px auto 0" }}
          >
            Open the demo account and the whole app is already full of data. Nothing to set
            up, nothing to type in.
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

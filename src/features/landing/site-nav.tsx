"use client";

import { Brand } from "@/components/brand";
import { BRAND } from "@/lib/brand";
import { motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import styles from "./landing.module.css";

/**
 * The public site header, shared by the landing page and every marketing page.
 *
 * Lives beside `site-footer` rather than inside `features/marketing` because
 * both surfaces render it and the landing page owns this palette - the same
 * reasoning that already puts the footer here.
 *
 * Every link here is a real route. These used to be in-page hashes into the
 * landing page (`#how-it-works`, `#features`, `#privacy`, `#faq`), which meant
 * the bar navigated nowhere on the home page and had to be rewritten as
 * `/#hash` everywhere else. Pages remove both problems: the same four links
 * behave identically on every surface, and `next/link` prefetches them.
 */
const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/download", label: "Download" },
  { href: "/contact", label: "Contact" },
];

export function SiteNav({ onLanding = false }: { onLanding?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);

  // Read progress. `scaleX` rather than `width` so the hairline is composited
  // and never triggers layout, and spring-smoothed so a trackpad flick does not
  // make it stutter.
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.2 });

  // 24px of hysteresis, so a nav parked exactly on the threshold does not
  // flicker between the two heights while the reader nudges the page.
  useMotionValueEvent(scrollY, "change", (y) => {
    setCondensed((was) => (was ? y > 24 : y > 48));
  });

  return (
    <header className={`${styles.nav} ${condensed ? styles.navScrolled : ""}`}>
      {onLanding && (
        <motion.div className={styles.navProgress} style={{ scaleX: progress }} aria-hidden />
      )}
      <Link href="/" aria-label={`${BRAND.name} home`}>
        <Brand size="lg" />
      </Link>
      <nav className={styles.desktopNav} aria-label="Main navigation">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      {/*
       * One action, not three. The bar used to carry a Download link, a Log in
       * link and a gradient Join waitlist button; Download is now one of the
       * nav links above, and the sign-up path is the waitlist form in the hero
       * and the closing CTA rather than a fourth thing competing in the header.
       * What is left is the one thing a returning visitor comes to the bar for.
       */}
      <div className={styles.navActions}>
        <Link href="/login" className={styles.navLogin}>
          <span className={styles.navLoginLead}>Already have access?</span> Log in
        </Link>
      </div>
      <button
        className={styles.menuButton}
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X /> : <Menu />}
      </button>
      {menuOpen && (
        <nav className={styles.mobileNav} aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setMenuOpen(false)}>
            Already have access? Log in
          </Link>
        </nav>
      )}
    </header>
  );
}

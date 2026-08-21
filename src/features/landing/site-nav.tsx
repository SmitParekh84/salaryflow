"use client";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
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
 * The section links point at landing anchors. On the landing page those are
 * in-page hashes; anywhere else they have to be prefixed with the home route
 * or they resolve against a page that has no such section.
 */
const SECTIONS = [
  { hash: "#how-it-works", label: "How it works" },
  { hash: "#features", label: "Features" },
  { hash: "#privacy", label: "Privacy" },
  { hash: "#faq", label: "FAQ" },
];

export function SiteNav({ onLanding = false }: { onLanding?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const href = (hash: string) => (onLanding ? hash : `/${hash}`);

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
        {SECTIONS.map((section) => (
          <a key={section.hash} href={href(section.hash)}>
            {section.label}
          </a>
        ))}
      </nav>
      <div className={styles.navActions}>
        <Link href="/download">Download app</Link>
        <Link href="/login">Log in</Link>
        <Button asChild variant="marketing" size="md">
          {/*
           * On the home page this scrolls to the section that is already there;
           * everywhere else it goes to /waitlist, which is the same form as a
           * page of its own. Sending the whole site to the page would mean a
           * navigation away from a hero that carries the form itself.
           */}
          {onLanding ? <a href="#waitlist">Join waitlist</a> : <Link href="/waitlist">Join waitlist</Link>}
        </Button>
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
          {SECTIONS.map((section) => (
            <a key={section.hash} href={href(section.hash)} onClick={() => setMenuOpen(false)}>
              {section.label}
            </a>
          ))}
          <Link href="/download" onClick={() => setMenuOpen(false)}>
            Download app
          </Link>
          <Link href="/login">Log in</Link>
        </nav>
      )}
    </header>
  );
}

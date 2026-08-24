"use client";

import { BrandMark } from "@/components/brand";
import { BRAND } from "@/lib/brand";
import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./landing-v2.module.css";
import { ScrollTrigger, useScene } from "./use-gsap";

const LINKS = [
  { href: "#cycle", label: "How it works" },
  { href: "#ai", label: "Aartha AI" },
  { href: "#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
];

/**
 * The bar and the page's scroll-progress rail.
 *
 * Fixed rather than sticky: it has to stay above the hero aurora and above
 * every pinned stage at every scroll position, and a sticky bar inside a
 * pinned section's stacking context disappears behind the pin.
 *
 * The condense is a class toggle driven by one ScrollTrigger rather than a
 * scroll listener, so it shares the single scroll handler ScrollTrigger already
 * runs for the whole page instead of adding a second one.
 */
export function Nav() {
  const [open, setOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  const ref = useScene<HTMLElement>((api, root) => {
    // The rail is progress, not decoration, so it is driven in both branches.
    // Someone who asked for less motion still wants to know how far down they
    // are; scrubbing a 2px bar against their own scroll adds no movement they
    // did not themselves cause.
    const rail = railRef.current;
    const drive = () => {
      if (rail) {
        gsapScrub(rail);
      }
      // A numeric `start` is a scroll position in pixels, which is what this
      // actually means. A triggerless string start ("top -12") is measured
      // against the scroller's own box and resolves to 0 here, so the bar
      // condensed on the first pixel of scroll and flickered.
      ScrollTrigger.create({
        start: 14,
        end: "max",
        onToggle: (self) => root.classList.toggle(styles.navCondensed, self.isActive),
      });
    };

    api.motion(drive);
    api.still(drive);
  });

  // Close the menu on navigation to a hash on this page: the panel covers the
  // section it just scrolled to otherwise.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, [open]);

  return (
    <>
      <div className={styles.progressRail} ref={railRef} aria-hidden />
      <header className={styles.nav} ref={ref}>
        <Link href="/v2" className={styles.navBrand}>
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

        <div className={styles.navActions}>
          <Link href="/login" className={styles.navLogin}>
            Log in
          </Link>
          <Link href="/waitlist" className={`${styles.btnPrimary} ${styles.btnSmall}`}>
            Join waitlist
            <ArrowRight aria-hidden />
          </Link>
        </div>

        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>

        {open ? (
          <div className={styles.mobileNav}>
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)}>
              Log in
            </Link>
          </div>
        ) : null}
      </header>
    </>
  );
}

/**
 * Scrubs the progress rail's `scaleX` against the document's own scroll.
 *
 * Kept as a function rather than inlined so the identical call in both motion
 * branches reads as one behaviour with two entry points.
 */
function gsapScrub(rail: HTMLElement) {
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      rail.style.transform = `scaleX(${self.progress})`;
    },
  });
}

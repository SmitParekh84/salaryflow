"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./site.module.css";

/* ---------------------------------------------------------------------------
   The mobile menu.

   Below 620px the nav links are hidden, and until now nothing replaced them:
   the bar was a logo, a theme switch and one button, which left every page on
   the site unreachable from every other page on a phone. This is that missing
   navigation.

   A dropdown panel rather than a full-screen overlay. There are five
   destinations; a full-screen takeover for five links is a lot of ceremony, and
   it costs a scroll lock and a focus trap to do safely. The panel is small
   enough to be honest about being a menu.

   The parts that are easy to leave out and matter most:

     · Escape closes it, because that is the first thing anyone tries
     · a click anywhere outside closes it, because the panel does not cover the
       page and tapping past it obviously means "dismiss"
     · focus moves to the first link on open and returns to the button on close,
       so a keyboard or screen-reader user is not dropped at the top of the
       document
     · it closes on navigation, or it would still be open on the page it just
       went to
   --------------------------------------------------------------------------- */

export function SiteNavMenu({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  /*
   * Which route the panel was opened on, rather than a boolean.
   *
   * Open state is then derived: navigating changes the pathname, the comparison
   * fails, and the panel is closed with no effect involved. The obvious version
   * of this — a boolean plus an effect that calls setOpen(false) when pathname
   * changes — is a setState inside an effect body, which cascades an extra
   * render on every navigation and is what React tells you not to do.
   */
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt !== null && openedAt === pathname;
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null);

  useEffect(() => {
    if (!open) return;

    // `setOpenedAt(null)` rather than the `setOpen` helper: a state setter is
    // stable across renders, so the effect needs no extra dependency and cannot
    // be re-subscribed on every keystroke elsewhere in the tree.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenedAt(null);
      buttonRef.current?.focus();
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpenedAt(null);
    };

    // Focus the first link so the panel is usable without a pointer.
    //
    // Synchronously, not in a `requestAnimationFrame`. Effects run after React
    // has committed the DOM, so the panel already exists here and there is
    // nothing to wait for — and a deferred frame never arrives at all in a
    // backgrounded tab, which left focus stranded on the document.
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={styles.menuButton}
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X aria-hidden /> : <Menu aria-hidden />}
      </button>

      {open ? (
        <div className={styles.menuPanel} id="site-menu" ref={panelRef}>
          <nav aria-label="Site">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={styles.menuLink}>
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href="/waitlist" className={`${styles.btn} ${styles.menuCta}`}>
            Join the waitlist
            <ArrowRight aria-hidden />
          </Link>
        </div>
      ) : null}
    </>
  );
}

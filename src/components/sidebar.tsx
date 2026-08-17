"use client";

import { BRAND } from "@/lib/brand";
import { NAV_ITEMS } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeIndianRupee,
  BarChart3,
  CalendarClock,
  ChevronRight,
  Grid3X3,
  Landmark,
  LayoutDashboard,
  ListChecks,
  MoreHorizontal,
  Receipt,
  Settings,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "./brand";
import { Card } from "./ui/card";

/**
 * Paints the tapped tab as active the instant it is pressed, before the route
 * commits. Without it a tap looks ignored until the new page renders, which is
 * what makes bottom-bar navigation feel laggy on a phone.
 *
 * Must be rendered *inside* the `<Link>` — `useLinkStatus` reads the nearest
 * link's pending state.
 */
function TabPendingState({ children }: { children: (pending: boolean) => React.ReactNode }) {
  const { pending } = useLinkStatus();
  return <>{children(pending)}</>;
}

export const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Landmark,
  ListChecks,
  Receipt,
  CalendarClock,
  Target,
  TrendingUp,
  BarChart3,
  BadgeIndianRupee,
  Settings,
  Sparkles,
  Users,
  Trash2,
};

// The 4 tabs always pinned in the bottom bar
const PINNED_HREFS = ["/dashboard", "/expenses", "/bills", "/analytics"];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      aria-label="Primary navigation"
      className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-border bg-surface/60 backdrop-blur-xl px-4 py-6"
    >
      <Link
        href="/dashboard"
        aria-label="Aartha dashboard"
        className="mb-8 flex items-center rounded-xl px-2 py-1 outline-none transition-transform duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        <Brand tagline={BRAND.brandlineShort} />
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.filter((item) => !("settingsOnly" in item && item.settingsOnly)).map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
              )}
              <Icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Card className="bg-surface-2/50 p-4 shadow-none">
        <p className="text-xs font-semibold">Pro tip 💡</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Log expenses daily to keep your Safe-to-Spend accurate.
        </p>
      </Card>
    </aside>
  );
}

/** Hamburger drawer — used when the user switches to hamburger mode in Settings */
export function HamburgerDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const mainItems = NAV_ITEMS.filter((item) => !("settingsOnly" in item && item.settingsOnly));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
          >
            <div className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 border-b border-border">
              <Brand tagline={BRAND.brandlineShort} />
              {/* The circle stays 32px because that is what the header wants to
                  look like; the button around it is 44px because that is what a
                  thumb needs. Negative margin keeps the larger target from
                  pushing the header layout around. */}
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="-m-1.5 flex h-11 w-11 items-center justify-center rounded-full text-muted"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2">
                  <X className="h-4 w-4" />
                </span>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              {mainItems.map((item) => {
                const Icon = ICONS[item.icon];
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="h-3.5 w-3.5 text-primary/60" />}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border px-4 py-4">
              <p className="text-[11px] text-muted">Log daily to keep Safe-to-Spend accurate 💡</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Bottom nav "More" full-screen sheet */
function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const allItems = NAV_ITEMS.filter((item) => !PINNED_HREFS.includes(item.href));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.38 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-surface pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-border" />
            </div>

            <div className="flex items-center justify-between px-5 py-3">
              <p className="text-base font-semibold">All sections</p>
              <button
                onClick={onClose}
                aria-label="Close"
                className="-m-1.5 flex h-11 w-11 items-center justify-center rounded-full text-muted"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2">
                  <X className="h-4 w-4" />
                </span>
              </button>
            </div>

            <nav className="px-4 pb-2">
              <div className="grid grid-cols-1 gap-0.5">
                {allItems.map((item) => {
                  const Icon = ICONS[item.icon];
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const isExtra = "settingsOnly" in item && item.settingsOnly;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3.5 rounded-2xl px-4 py-3.5 transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-surface-2",
                        isExtra && "opacity-70",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          active ? "bg-primary/20" : "bg-surface-2",
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted" />
                    </Link>
                  );
                })}
              </div>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Bottom navigation bar — default mobile nav style */
export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const pinnedItems = NAV_ITEMS.filter((item) => PINNED_HREFS.includes(item.href));
  // "More" is active when the current page isn't in the pinned set
  const moreActive =
    !moreOpen && !PINNED_HREFS.some((href) => pathname === href || pathname.startsWith(href + "/"));

  return (
    <>
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-1 backdrop-blur-xl lg:hidden"
      >
        {/*
         * The home-indicator inset is padded onto each tab rather than onto the
         * bar. Padding the bar left a dead strip along the bottom edge that
         * swallowed low taps, which read as the tap being ignored.
         */}
        <div
          className="mx-auto grid max-w-lg items-stretch"
          style={{ gridTemplateColumns: `repeat(${pinnedItems.length + 1}, 1fr)` }}
        >
          {pinnedItems.map((item) => {
            const Icon = ICONS[item.icon];
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const label = "mobileLabel" in item ? item.mobileLabel : item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className="relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--ring) active:scale-[0.96]"
                style={{
                  height: "calc(4rem + env(safe-area-inset-bottom))",
                  paddingBottom: "env(safe-area-inset-bottom)",
                }}
              >
                <TabPendingState>
                  {(pending) => {
                    // A pending tab reads as active immediately, so the press is
                    // acknowledged even before `loading.tsx` swaps in.
                    const lit = active || pending;
                    return (
                      <>
                        {lit && (
                          <span className="absolute top-0 inset-x-3 h-0.5 rounded-b-full bg-primary" />
                        )}
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0 transition-colors duration-150",
                            lit ? "text-primary" : "text-muted",
                          )}
                          aria-hidden="true"
                        />
                        <span
                          className={cn(
                            "max-w-full truncate whitespace-nowrap transition-colors duration-150",
                            lit ? "text-primary" : "text-muted",
                          )}
                        >
                          {label}
                        </span>
                      </>
                    );
                  }}
                </TabPendingState>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="More sections"
            className={cn(
              "relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--ring)",
              moreActive ? "text-primary" : "text-muted",
            )}
            style={{
              height: "calc(4rem + env(safe-area-inset-bottom))",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {moreActive && (
              <span className="absolute top-0 inset-x-3 h-0.5 rounded-b-full bg-primary" />
            )}
            <MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

/** Nav-mode toggle for Settings — persisted to store */
export function NavModeToggle() {
  const navMode = useFinanceStore((s) => s.user.navMode ?? "bottom");
  const updateUser = useFinanceStore((s) => s.updateUser);

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-2/60 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">Mobile navigation style</p>
        <p className="mt-0.5 text-xs text-muted">
          {navMode === "bottom"
            ? "Bottom bar — 4 tabs + More sheet"
            : "Hamburger — slide-in drawer"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-surface p-1">
        <button
          onClick={() => updateUser({ navMode: "bottom" })}
          aria-pressed={navMode === "bottom"}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            navMode === "bottom"
              ? "bg-primary text-primary-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          <Grid3X3 className="h-3.5 w-3.5" />
          Bottom bar
        </button>
        <button
          onClick={() => updateUser({ navMode: "hamburger" })}
          aria-pressed={navMode === "hamburger"}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            navMode === "hamburger"
              ? "bg-primary text-primary-foreground"
              : "text-muted hover:text-foreground",
          )}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
          Hamburger
        </button>
      </div>
    </div>
  );
}

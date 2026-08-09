"use client";

import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  BadgeIndianRupee,
  BarChart3,
  CalendarClock,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Receipt,
  Settings,
  Target,
  Trash2,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { Card } from "./ui/card";

const ICONS: Record<string, LucideIcon> = {
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
  Users,
  Trash2,
};

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      aria-label="Primary navigation"
      className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-border bg-surface/60 backdrop-blur-xl px-4 py-6"
    >
      <Link
        href="/dashboard"
        aria-label="Spendly dashboard"
        className="mb-8 flex items-center rounded-xl px-2 py-1 outline-none transition-transform duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        <Brand tagline="Spend with clarity" />
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

export function MobileNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) =>
    ["/dashboard", "/funding-plan", "/accounts", "/expenses", "/shared"].includes(item.href),
  );
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-stretch">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const label = "mobileLabel" in item ? item.mobileLabel : item.label;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--ring)",
                active ? "text-primary" : "text-muted",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

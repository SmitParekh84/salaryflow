"use client";

import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";
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
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
      <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">SalaryFlow</p>
          <p className="text-[10px] text-muted">Spend with clarity</p>
        </div>
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
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-border px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

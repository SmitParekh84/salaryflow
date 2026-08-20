"use client";

import { useFinanceStore } from "@/lib/store";
import { useAuth } from "@/lib/useAuth";
import { cn } from "@/lib/utils";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ArrowLeft, Bell, Check, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GlobalSearch } from "./global-search";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function TopBar({
  title,
  showBack = false,
  onBack,
  showHamburger = false,
  onHamburger,
}: {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  showHamburger?: boolean;
  onHamburger?: () => void;
}) {
  const router = useRouter();
  const user = useFinanceStore((s) => s.user);
  const notifications = useFinanceStore((s) => s.notifications);
  const markAllRead = useFinanceStore((s) => s.markAllRead);
  const markRead = useFinanceStore((s) => s.markNotificationRead);
  const [openNotif, setOpenNotif] = useState(false);
  const [openSearch, setOpenSearch] = useState(false);

  useEffect(() => {
    const open = () => setOpenSearch(true);
    window.addEventListener("open-search", open);
    return () => window.removeEventListener("open-search", open);
  }, []);

  const unread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const initials = (user.name || "SF")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const { logout } = useAuth();
  const [openMenu, setOpenMenu] = useState(false);

  return (
    // The status bar is translucent in the iOS PWA (`viewport-fit=cover` plus
    // `black-translucent`), so the web view starts at y=0 behind the clock and
    // battery. Padding the sticky bar by the top inset lets its blur run under
    // the status bar while the controls clear it. The inset is 0 on Android and
    // desktop, where `max()` falls through to the original 0.875rem.
    <header className="sticky top-0 z-20 flex items-center gap-1.5 border-b border-border bg-background/70 px-3 pb-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] backdrop-blur-xl sm:gap-3 sm:px-4 lg:px-8">
      {/*
       * The menu button stays even when there is a back arrow. It used to give
       * way to it, which was survivable while the bottom bar had a "More" tab;
       * without one, a sub-page would have had no route to the sections that
       * are not tabs at all. Back and menu answer different questions — "where
       * was I" and "where else can I go" — so a phone shows both.
       */}
      {showHamburger && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onHamburger}
          className="shrink-0 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      {showBack && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0"
          aria-label="Back"
          title="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
      </div>

      {/*
       * Search is a top-level control on a phone too. It used to live only in
       * the avatar menu below `sm` — two taps and a guess about where it went
       * for the fastest way to find a transaction. The icon collapses to a
       * square button here and grows the label and shortcut hint on wider
       * screens, where there is room for them.
       */}
      <Button
        variant="secondary"
        size="icon"
        onClick={() => setOpenSearch(true)}
        aria-label="Search"
        className="text-muted sm:w-auto sm:px-3"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search…</span>
        <kbd className="hidden md:inline rounded bg-surface px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </Button>

      <PopoverPrimitive.Root
        open={openNotif}
        onOpenChange={(nextOpen) => {
          setOpenNotif(nextOpen);
          if (nextOpen) setOpenMenu(false);
        }}
      >
        <PopoverPrimitive.Trigger asChild>
          <Button variant="secondary" size="icon" aria-label="Notifications" className="relative">
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                {unread}
              </span>
            )}
          </Button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            data-slot="popover-content"
            align="end"
            sideOffset={8}
            collisionPadding={12}
            className="z-50 w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl bg-surface text-foreground card-shadow outline-none sm:w-80"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllRead}
                className="h-auto min-h-0 p-0 text-primary hover:bg-transparent hover:underline"
              >
                Mark all read
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto no-scrollbar">
              {notifications.length === 0 && (
                <p className="px-4 py-8 text-center text-xs text-muted">
                  You&apos;re all caught up
                </p>
              )}
              {notifications.map((notification) => (
                <Button
                  key={notification.id}
                  variant="ghost"
                  onClick={() => {
                    markRead(notification.id);
                    if (notification.href) {
                      setOpenNotif(false);
                      router.push(notification.href);
                    }
                  }}
                  className={cn(
                    "h-auto w-full items-start justify-start rounded-none border-b border-border px-4 py-3 text-left",
                    !notification.read && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      notification.read ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">{notification.title}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">{notification.body}</span>
                  </span>
                  {notification.read && <Check className="ml-auto h-3.5 w-3.5 text-muted" />}
                </Button>
              ))}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      <div className="hidden sm:block">
        <ThemeToggle />
      </div>

      <DropdownMenuPrimitive.Root
        open={openMenu}
        onOpenChange={(nextOpen) => {
          setOpenMenu(nextOpen);
          if (nextOpen) setOpenNotif(false);
        }}
      >
        <DropdownMenuPrimitive.Trigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="bg-linear-to-br from-primary to-primary/60 text-sm font-bold text-primary-foreground hover:opacity-90"
            aria-label="Account menu"
          >
            {initials}
          </Button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            data-slot="dropdown-menu-content"
            align="end"
            sideOffset={8}
            collisionPadding={12}
            className="z-50 min-w-48 rounded-2xl bg-surface p-1.5 text-foreground card-shadow outline-none"
          >
            <DropdownMenuPrimitive.Label className="px-3 py-2">
              <div className="text-sm font-medium">{user.name || user.email}</div>
              <div className="mt-1 text-xs font-normal text-muted">{user.email}</div>
            </DropdownMenuPrimitive.Label>
            <DropdownMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-border" />
            {/* Search moved into the bar itself; only the theme switch still
                needs a home here on a phone. */}
            <div className="sm:hidden">
              <DropdownMenuPrimitive.Item asChild>
                <ThemeToggle menu />
              </DropdownMenuPrimitive.Item>
            </div>
            {user.email && (
              <DropdownMenuPrimitive.Item asChild>
                <Link
                  href="/settings"
                  className="flex cursor-pointer rounded-sm px-3 py-2 text-sm outline-none focus:bg-surface-2"
                >
                  Settings
                </Link>
              </DropdownMenuPrimitive.Item>
            )}
            {user.email && user.isAdmin && (
              <DropdownMenuPrimitive.Item asChild>
                <Link
                  href="/admin"
                  className="flex cursor-pointer rounded-sm px-3 py-2 text-sm outline-none focus:bg-surface-2"
                >
                  Admin
                </Link>
              </DropdownMenuPrimitive.Item>
            )}
            <DropdownMenuPrimitive.Item asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="w-full justify-start outline-none"
              >
                Sign out
              </Button>
            </DropdownMenuPrimitive.Item>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>

      <GlobalSearch open={openSearch} onClose={() => setOpenSearch(false)} />
    </header>
  );
}

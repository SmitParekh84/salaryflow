"use client";

import { useFinanceStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { GlobalSearch } from "./global-search";
import { useAuth } from "@/lib/useAuth";

export function TopBar({ title }: { title: string }) {
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

  const unread = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const initials = (user.name || "SF")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const { logout } = useAuth();
  const [openMenu, setOpenMenu] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/70 px-4 py-3.5 backdrop-blur-xl lg:px-8">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
      </div>

      <Button
        variant="secondary"
        onClick={() => setOpenSearch(true)}
        className="hidden text-muted sm:flex"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search…</span>
        <kbd className="hidden md:inline rounded bg-surface px-1.5 py-0.5 text-[10px]">
          ⌘K
        </kbd>
      </Button>

      <Button
        variant="secondary"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpenSearch(true)}
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>

      <div className="relative">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setOpenNotif((v) => !v)}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
              {unread}
            </span>
          )}
        </Button>

        <AnimatePresence>
          {openNotif && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenNotif(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-border bg-surface card-shadow"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllRead}
                    className="h-auto p-0 text-primary hover:bg-transparent hover:underline"
                  >
                    Mark all read
                  </Button>
                </div>
                <div className="max-h-80 overflow-y-auto no-scrollbar">
                  {notifications.length === 0 && (
                    <p className="px-4 py-8 text-center text-xs text-muted">
                      You&apos;re all caught up ✨
                    </p>
                  )}
                  {notifications.map((n) => (
                    <Button
                      key={n.id}
                      variant="ghost"
                      onClick={() => markRead(n.id)}
                      className={cn(
                        "h-auto w-full items-start justify-start rounded-none border-b border-border px-4 py-3 text-left",
                        !n.read && "bg-primary/5"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.read ? "bg-transparent" : "bg-primary"
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-medium">{n.title}</span>
                        <span className="mt-0.5 block text-[11px] text-muted">
                          {n.body}
                        </span>
                      </span>
                      {n.read && <Check className="ml-auto h-3.5 w-3.5 text-muted" />}
                    </Button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <ThemeToggle />

      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpenMenu((v) => !v)}
          className="bg-gradient-to-br from-primary to-primary/60 text-sm font-bold text-white hover:opacity-90"
          aria-label="Account menu"
        >
          {initials}
        </Button>

        <AnimatePresence>
          {openMenu && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute right-0 z-20 mt-2 w-44 rounded-2xl border border-border bg-surface card-shadow"
            >
              <div className="px-4 py-3">
                <div className="text-sm font-medium">{user.name || user.email}</div>
                <div className="mt-1 text-xs text-muted">{user.email}</div>
              </div>
              <div className="border-t border-border px-2 py-2">
                {user.email && (
                  <a href="/settings" className="block px-3 py-2 text-sm hover:bg-surface-2 rounded">Settings</a>
                )}
                {user.email && user.isAdmin && (
                  <a href="/admin" className="block px-3 py-2 text-sm hover:bg-surface-2 rounded">Admin</a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setOpenMenu(false); logout(); }}
                  className="w-full justify-start"
                >
                  Sign out
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <GlobalSearch open={openSearch} onClose={() => setOpenSearch(false)} />
    </header>
  );
}

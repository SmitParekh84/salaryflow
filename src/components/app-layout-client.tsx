"use client";

import { useAuthReady } from "@/components/auth-provider";
import { HamburgerDrawer, MobileNav, Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { useHydrated } from "@/hooks/use-hydrated";
import { useNotificationSync } from "@/hooks/use-notification-sync";
import { NAV_ITEMS } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const ROUTE_STACK_KEY = "aartha:route-stack";
const ROUTE_TITLES: Record<string, string> = {
  "/salary-history": "Salary history",
};

const SETTINGS_SECTION_TITLES: Record<string, string> = {
  profile: "Profile",
  money: "Money setup",
  accounts: "Financial accounts",
  categories: "Categories",
  planning: "Goals & rules",
  system: "System",
};

function readRouteStack() {
  try {
    const value = JSON.parse(sessionStorage.getItem(ROUTE_STACK_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((path): path is string => typeof path === "string")
      : [];
  } catch {
    return [];
  }
}

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const authReady = useAuthReady();
  const onboarded = useFinanceStore((s) => s.user.onboarded);
  const navMode = useFinanceStore((s) => s.user.navMode ?? "bottom");
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [drawerPathname, setDrawerPathname] = useState(pathname);
  useNotificationSync();

  // Close the hamburger drawer on route change.
  //
  // Adjusted during render rather than in an effect: an effect would paint the
  // new route with the drawer still open for one frame, then close it. React
  // re-runs this component immediately on the set below, before anything reaches
  // the screen, so the drawer is already closed on the first paint.
  if (pathname !== drawerPathname) {
    setDrawerPathname(pathname);
    setHamburgerOpen(false);
  }

  useEffect(() => {
    if (hydrated && !onboarded) router.replace("/onboarding");
  }, [hydrated, onboarded, router]);

  useEffect(() => {
    const stack = readRouteStack();
    const previousPath = stack.at(-2);

    if (previousPath === pathname) {
      stack.pop();
    } else if (stack.at(-1) !== pathname) {
      stack.push(pathname);
    }

    sessionStorage.setItem(ROUTE_STACK_KEY, JSON.stringify(stack.slice(-20)));
  }, [pathname]);

  const goBack = () => {
    if (pathname === "/settings" && searchParams.has("section")) {
      window.history.replaceState(null, "", "/settings");
      return;
    }

    const stack = readRouteStack();
    if (stack.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  };

  const settingsSectionTitle =
    pathname === "/settings"
      ? SETTINGS_SECTION_TITLES[searchParams.get("section") ?? ""]
      : undefined;
  const title =
    settingsSectionTitle ??
    ROUTE_TITLES[pathname] ??
    NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
      ?.label ??
    "Aartha";

  // `authReady` is the wait that AuthProvider used to impose on the whole app.
  // It belongs here: this shell is the only surface that would flash empty
  // balances before the session store hydrates, and gating it globally cost
  // every public page its server-rendered HTML.
  if (!hydrated || !authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isHamburger = navMode === "hamburger";

  /*
   * Back is for depth, not for "anywhere but home".
   *
   * This used to be `pathname !== "/dashboard"`, which put a back arrow on
   * /analytics, /expenses and /bills — tabs you reach by tapping the bar, not by
   * travelling into anything. Paired with the menu button it left two controls
   * competing for the same corner and nothing to go back to.
   *
   * A nav destination gets the menu; anything the nav cannot reach — a report
   * drill-down, one account, a settings section, the settings-only pages — gets
   * back. Exactly one of the two, decided here so the bar never has to guess.
   */
  const isNavDestination = NAV_ITEMS.some(
    (item) => !("settingsOnly" in item && item.settingsOnly) && item.href === pathname,
  );
  const showBack = !isNavDestination || Boolean(settingsSectionTitle);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <TopBar
          title={title}
          showBack={showBack}
          onBack={goBack}
          /*
           * Shown in both nav modes, because with "More" gone from the bottom bar
           * the drawer is the only route to the sections that are not tabs — but
           * only where there is no back arrow, so the two never share the corner.
           */
          showHamburger={!showBack}
          onHamburger={() => setHamburgerOpen(true)}
        />
        <main
          className="mx-auto max-w-6xl px-4 pt-5 sm:pt-6 lg:px-8 lg:pb-12"
          style={{
            paddingBottom: isHamburger
              ? "max(1.5rem, env(safe-area-inset-bottom))"
              : "calc(5rem + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </main>
      </div>

      <HamburgerDrawer open={hamburgerOpen} onClose={() => setHamburgerOpen(false)} />
      {!isHamburger && <MobileNav />}
    </div>
  );
}

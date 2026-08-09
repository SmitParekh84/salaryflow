"use client";

import { MobileNav, Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { useHydrated } from "@/hooks/use-hydrated";
import { useNotificationSync } from "@/hooks/use-notification-sync";
import { NAV_ITEMS } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const ROUTE_STACK_KEY = "salaryflow:route-stack";
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
  const onboarded = useFinanceStore((s) => s.user.onboarded);
  useNotificationSync();

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
    "SalaryFlow";

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <TopBar title={title} showBack={pathname !== "/dashboard"} onBack={goBack} />
        <main className="mx-auto max-w-6xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:pt-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

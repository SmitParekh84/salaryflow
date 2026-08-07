"use client";

import { MobileNav, Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { useHydrated } from "@/hooks/use-hydrated";
import { NAV_ITEMS } from "@/lib/constants";
import { useFinanceStore } from "@/lib/store";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const onboarded = useFinanceStore((s) => s.user.onboarded);

  useEffect(() => {
    if (hydrated && !onboarded) router.replace("/onboarding");
  }, [hydrated, onboarded, router]);

  const title = NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label ?? "SalaryFlow";

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
        <TopBar title={title} />
        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

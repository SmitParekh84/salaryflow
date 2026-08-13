import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import AppLayoutClient from "@/components/app-layout-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Belt and braces with the disallow list in robots.ts. Well-behaved crawlers
 * honour robots.txt, but a URL that is merely disallowed can still be indexed
 * from an external link — `noindex` is what actually keeps it out of results.
 * Every route in this group redirects to /login anyway, so the only thing a
 * crawler could index here is the login page under a dozen different URLs.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    // server-side redirect to login
    redirect(`/login`);
  }

  return <AppLayoutClient>{children}</AppLayoutClient>;
}

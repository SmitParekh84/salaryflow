import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import AppLayoutClient from "@/components/app-layout-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    // server-side redirect to login
    redirect(`/login`);
  }

  return <AppLayoutClient>{children}</AppLayoutClient>;
}

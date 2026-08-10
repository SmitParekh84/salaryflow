import { getCurrentUser } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Console gate.
 *
 * Runs on the server, so the dashboard is never sent to a browser that has not
 * proven admin rights — a client-side check would ship the markup and then hide
 * it. `/admin/login` sits outside this route group, so it stays reachable while
 * signed out and this guard cannot redirect into itself.
 */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/admin/login");

  return <>{children}</>;
}

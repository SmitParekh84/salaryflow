import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * The page itself is a client component, so it cannot export `metadata`. This
 * layout exists only to give the route its own tab title.
 */
export const metadata: Metadata = {
  title: "Salary history",
};

export default function SalaryHistoryLayout({ children }: { children: ReactNode }) {
  return children;
}

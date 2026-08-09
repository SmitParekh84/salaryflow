import { AuthPage } from "@/features/auth/auth-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | SalaryFlow",
  description:
    "Sign in securely to SalaryFlow and continue managing your salary cycle, expenses, bills, and safe-to-spend amount.",
  alternates: { canonical: "/login" },
  robots: { index: true, follow: true },
};

export default function LoginPage() {
  return <AuthPage mode="signin" />;
}
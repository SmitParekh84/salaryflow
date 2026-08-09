import { AuthPage } from "@/features/auth/auth-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up | SalaryFlow",
  description:
    "Create a secure SalaryFlow account to plan your salary cycle and understand what is safe to spend each day.",
  alternates: { canonical: "/register" },
  robots: { index: true, follow: true },
};

export default function RegisterPage() {
  return <AuthPage mode="signup" />;
}
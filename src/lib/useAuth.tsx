"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useFinanceStore } from "./store";

export function useAuth() {
  const setUser = useFinanceStore((s) => s.updateUser);
  const resetAll = useFinanceStore((s) => s.resetAll);
  const router = useRouter();

  const loadFromServer = useFinanceStore((s) => s.loadFromServer);

  const login = useCallback(
    async (email: string, password: string, remember: boolean = false) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Login failed");
      }
      const j = await res.json();
      const user = j?.data;
      if (user) {
        setUser({ name: user.name || "", email: user.email, onboarded: true });
        await loadFromServer();
        router.push("/dashboard");
      }
    },
    [setUser, router, loadFromServer],
  );

  const register = useCallback(
    async (name: string | undefined, email: string, password: string, otp?: string) => {
      // New flow uses verify-register which requires OTP; keep backward-compatible by hitting verify-register
      const res = await fetch("/api/auth/verify-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, otp }),
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Register failed");
      }
      const j = await res.json();
      const user = j?.data;
      if (user) {
        setUser({ name: user.name || "", email: user.email, onboarded: true });
        router.push("/onboarding");
      }
    },
    [setUser, router],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => null);
    setUser({ name: "", email: "", onboarded: false });
    resetAll();
    router.push("/");
  }, [setUser, resetAll, router]);

  return { login, register, logout };
}

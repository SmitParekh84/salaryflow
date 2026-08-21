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
    async (email: string, password: string, remember: boolean = false, nextPath?: string) => {
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
        const onboarded = user.onboardingCompleted !== false;
        setUser({ name: user.name || "", email: user.email, onboarded });
        if (onboarded) await loadFromServer();
        const safeNextPath = nextPath?.startsWith("/") && !nextPath.startsWith("//")
          ? nextPath
          : "/dashboard";
        router.replace(onboarded ? safeNextPath : "/onboarding");
      }
    },
    [setUser, router, loadFromServer],
  );

  /**
   * Creates the account and hands the reader to /pending.
   *
   * Registering no longer signs anyone in: the account is created pending an
   * admin decision and the server issues no session, so there is nothing to
   * put in the store and /onboarding would be an empty shell behind a route
   * guard. `setUser` is deliberately not called for the same reason — seeding
   * the store here would make the UI look signed in to a browser holding no
   * session cookie.
   */
  const register = useCallback(
    async (name: string | undefined, email: string, password: string, otp?: string) => {
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
      router.replace("/pending");
    },
    [router],
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => null);
    resetAll();
    router.replace("/login");
  }, [resetAll, router]);

  return { login, register, logout };
}

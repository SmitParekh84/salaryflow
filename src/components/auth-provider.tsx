"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFinanceStore } from "@/lib/store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useFinanceStore((s) => s.updateUser);
  const setProfile = useFinanceStore((s) => s.updateProfile);
  const syncWithServer = useFinanceStore((s) => (s as any).syncWithServer);
  const loadSalaryHistory = useFinanceStore((s) => (s as any).loadSalaryHistory);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        const user = j?.data || null;
        if (user) {
          setUser({ name: user.name || "", email: user.email, onboarded: true });
          // attempt to sync client store with server and load salary history
          syncWithServer?.();
          loadSalaryHistory?.();
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      mounted = false;
    };
  }, [setUser, setProfile, syncWithServer, loadSalaryHistory, router]);

  return <>{children}</>;
}

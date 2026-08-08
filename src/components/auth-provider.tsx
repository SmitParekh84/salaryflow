"use client";

import { useFinanceStore } from "@/lib/store";
import React, { useEffect, useState } from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useFinanceStore((s) => s.updateUser);
  const loadFromServer = useFinanceStore((s) => s.loadFromServer);
  const loadSalaryHistory = useFinanceStore((s) => s.loadSalaryHistory);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      await Promise.resolve();

      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        const result = await response.json();
        if (!mounted) return;
        const user = result?.data || null;
        if (user) {
          setUser({ name: user.name || "", email: user.email, onboarded: true });
          await Promise.all([loadFromServer(), loadSalaryHistory()]);
        }
      } finally {
        if (mounted) setReady(true);
      }
    }

    void hydrate();
    return () => {
      mounted = false;
    };
  }, [setUser, loadFromServer, loadSalaryHistory]);

  if (!ready) {
    return <div className="min-h-screen bg-background" aria-label="Loading your finances" />;
  }

  return <>{children}</>;
}

"use client";

import { useFinanceStore } from "@/lib/store";
import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * True once `/api/auth/me` has resolved and the store reflects the signed-in
 * user. Consumers that would flash wrong numbers before then can wait on it.
 */
const AuthReadyContext = createContext(false);

export function useAuthReady() {
  return useContext(AuthReadyContext);
}

/**
 * Hydrates the finance store from the session on first mount.
 *
 * This deliberately does not gate rendering on that fetch. It used to return a
 * blank div until `ready` flipped — but `ready` is driven by an effect, and
 * effects do not run during server rendering, so every page in the app
 * server-rendered as one empty div. The HTML shipped to crawlers and social
 * preview bots contained no heading, no copy, and no structured data; only
 * clients that execute JavaScript ever saw the page.
 *
 * The wait still exists where it was actually needed — see AppLayoutClient,
 * which holds its spinner until `useAuthReady()` is true, so the authenticated
 * shell never flashes empty figures. Public pages render on the server as they
 * should.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useFinanceStore((s) => s.updateUser);
  const loadFromServer = useFinanceStore((s) => s.loadFromServer);
  const loadSalaryHistory = useFinanceStore((s) => s.loadSalaryHistory);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      await Promise.resolve();

      // A device that has signed in before is already holding the whole
      // account in localStorage, and the server-rendered layout has already
      // turned away anyone without a valid cookie. Painting that copy now and
      // reconciling underneath removes the network from the critical path
      // entirely; only a genuinely empty device still has to wait for the
      // first pull, where there is nothing to show anyway.
      const cached = useFinanceStore.getState().user;
      if (cached.email && cached.onboarded) setReady(true);

      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        const result = await response.json();
        if (!mounted) return;
        const user = result?.data || null;
        if (user) {
          const onboarded = user.onboardingCompleted !== false;
          setUser({ name: user.name || "", email: user.email, onboarded });
          if (onboarded) await Promise.all([loadFromServer(), loadSalaryHistory()]);
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

  return <AuthReadyContext.Provider value={ready}>{children}</AuthReadyContext.Provider>;
}

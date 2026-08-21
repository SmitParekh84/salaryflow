"use client";

import { Button } from "@/components/ui/button";
import { useFinanceStore } from "@/lib/store";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./landing.module.css";

/**
 * Opens the seeded demo account.
 *
 * Shared with the marketing pages, so it lives here rather than inside the
 * landing hero: every public page should be able to offer the demo without
 * duplicating the reset-then-load sequence, which has to happen in this order
 * or the demo data lands on top of whatever the last session left behind.
 *
 * Only the dashboard's own figures are awaited before navigating. This used to
 * purge every Cache Storage entry and wait on the salary history too, which
 * added seconds to a button whose whole promise is "have a look now": the
 * service worker never caches `/api/` responses, so the purge could not have
 * been clearing stale data - it only threw away the precached shell the
 * dashboard was about to need. The history is fetched in the background because
 * nothing on the dashboard reads it.
 */
export function DemoButton({ secondary = false }: { secondary?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const resetAll = useFinanceStore((state) => state.resetAll);
  const updateUser = useFinanceStore((state) => state.updateUser);
  const loadFromServer = useFinanceStore((state) => state.loadFromServer);
  const loadSalaryHistory = useFinanceStore((state) => state.loadSalaryHistory);

  async function openDemo() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/demo", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to open demo");
      resetAll();
      updateUser({ name: payload.data.name, email: payload.data.email, onboarded: true });
      await loadFromServer();
      void loadSalaryHistory();
      router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to open demo");
      setLoading(false);
    }
  }

  return (
    <span className={styles.demoWrap}>
      <Button
        type="button"
        size="lg"
        variant={secondary ? "marketingOutline" : "marketing"}
        onClick={openDemo}
        loading={loading}
      >
        Explore live demo
        <ArrowRight />
      </Button>
      {error && <small role="alert">{error}</small>}
    </span>
  );
}

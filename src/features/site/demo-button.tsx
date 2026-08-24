"use client";

import { useFinanceStore } from "@/lib/store";
import { ArrowRight, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./site.module.css";

/**
 * Opens the seeded demo account.
 *
 * This is a button, not a link, and that is the whole point: opening the demo is
 * a POST that creates a session server-side. The public pages had been linking
 * to `/login?demo=1`, which nothing handles — the login page ignores the
 * parameter — so the button looked like it worked and dropped the reader on a
 * sign-in form instead.
 *
 * No credentials are involved anywhere on the client. `POST /api/auth/demo`
 * ensures the demo user exists, reseeds it if it has gone stale, and sets the
 * session cookie itself. Putting a demo email and password in the page would
 * have shipped working credentials in the JavaScript bundle for anyone to read,
 * and it is not needed.
 *
 * The reset-then-load order matters and cannot be swapped: the store is cleared
 * before the server state is pulled, or the demo data lands on top of whatever
 * the previous session left in localStorage. Only the dashboard's own figures
 * are awaited before navigating — the salary history is fetched in the
 * background because nothing on the dashboard reads it, and waiting on it added
 * seconds to a button whose whole promise is "have a look now".
 */
export function DemoButton({
  quiet = false,
  label = "Open the demo",
}: {
  /** Renders as the secondary action rather than the primary one. */
  quiet?: boolean;
  label?: string;
}) {
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
      if (!response.ok) throw new Error(payload.error || "Unable to open the demo");
      resetAll();
      updateUser({ name: payload.data.name, email: payload.data.email, onboarded: true });
      await loadFromServer();
      void loadSalaryHistory();
      router.replace("/dashboard");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to open the demo");
      setLoading(false);
    }
  }

  return (
    <span className={styles.demoWrap}>
      <button
        type="button"
        className={quiet ? styles.btnQuiet : styles.btn}
        onClick={openDemo}
        disabled={loading}
      >
        {quiet ? null : <Play aria-hidden />}
        {loading ? "Opening…" : label}
        {quiet ? <ArrowRight aria-hidden /> : null}
      </button>
      {/* Always rendered so a failure does not shift the layout under the
          pointer that just pressed the button. */}
      <small role="alert" className={styles.demoError}>
        {error}
      </small>
    </span>
  );
}

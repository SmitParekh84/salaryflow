"use client";

import { useFinanceStore } from "@/lib/store";
import { syncIndicator } from "@/lib/sync-status";
import { cn } from "@/lib/utils";
import { CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

/** Re-render cadence, so the unsaved age climbs on its own while nothing else changes. */
const TICK_MS = 30_000;

/**
 * The visible half of sync failure reporting.
 *
 * Renders nothing at all when there is nothing wrong, which is almost always —
 * the point is that the one time it does appear, it means something. The
 * judgement about when that is lives in `syncIndicator`, under test.
 */
export function SyncStatus() {
  const status = useFinanceStore((s) => s.syncStatus);
  const error = useFinanceStore((s) => s.syncError);
  const unsavedSince = useFinanceStore((s) => s.unsavedSince);
  const syncWithServer = useFinanceStore((s) => s.syncWithServer);

  const [now, setNow] = useState(() => new Date());
  const [retrying, setRetrying] = useState(false);

  const failing = status === "error" || status === "offline";
  useEffect(() => {
    // Only tick while something is outstanding. A timer running behind a
    // healthy app would wake the tab every thirty seconds to redraw nothing.
    if (!failing) return;
    const id = window.setInterval(() => setNow(new Date()), TICK_MS);
    return () => window.clearInterval(id);
  }, [failing]);

  const indicator = syncIndicator({ status, error, unsavedSince, now });
  if (!indicator) return null;

  const retry = async () => {
    setRetrying(true);
    try {
      await syncWithServer();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      // `alert` rather than `status`: this is the one thing on screen that
      // means the numbers everywhere else are not backed up yet.
      role="alert"
      className={cn(
        "flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs",
        indicator.tone === "danger"
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-warning/30 bg-warning/10 text-warning",
      )}
      title={indicator.detail}
    >
      <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="font-medium">{indicator.title}</span>
      {indicator.age && <span className="opacity-80">· {indicator.age}</span>}
      <button
        type="button"
        onClick={retry}
        disabled={retrying}
        className="ml-0.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium underline-offset-2 hover:underline disabled:opacity-50"
      >
        <RefreshCw className={cn("h-3 w-3", retrying && "animate-spin")} aria-hidden />
        <span className="sr-only sm:not-sr-only">{retrying ? "Saving…" : "Retry"}</span>
      </button>
    </div>
  );
}

"use client";

import { useFinanceStore } from "@/lib/store";
import { useEffect } from "react";

const NOTIFICATION_POLL_INTERVAL = 15_000;

export function useNotificationSync() {
  const loadNotifications = useFinanceStore((state) => state.loadNotifications);

  useEffect(() => {
    let active = true;

    const refresh = () => {
      if (active && document.visibilityState === "visible") {
        void loadNotifications();
      }
    };
    const handleVisibility = () => refresh();

    refresh();
    const intervalId = window.setInterval(refresh, NOTIFICATION_POLL_INTERVAL);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadNotifications]);
}

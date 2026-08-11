"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        );
      if ("caches" in window) {
        // Includes retired brand prefixes so a dev machine that ran an older
        // build does not keep serving its stale precache.
        const ownedPrefixes = ["aartha-", "spendly-"];
        void caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => ownedPrefixes.some((prefix) => key.startsWith(prefix)))
                .map((key) => caches.delete(key)),
            ),
          );
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registration is best-effort */
    });
  }, []);
  return null;
}

"use client";

import * as React from "react";

// Lightweight theme initializer to avoid injecting <script> tags during render.
// Reads stored preference from localStorage or falls back to system preference
// and applies the corresponding class ('light' or 'dark') to <html>.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      const apply = (t: string) => {
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(t);
      };
      if (stored === "light" || stored === "dark") {
        apply(stored);
      } else if (window.matchMedia) {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        apply(prefersDark ? "dark" : "light");
      } else {
        apply("dark");
      }
    } catch (e) {
      // ignore in non-browser contexts
    }
  }, []);

  return <>{children}</>;
}

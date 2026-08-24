"use client";

import { THEME_COLORS } from "@/lib/theme";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import * as React from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      /*
       * Light is the default, and dark is opt-in.
       *
       * This was "system", which meant a visitor whose OS is in dark mode landed
       * on the dark version of a public site that is designed light — and the
       * light design is the argument: a money app that looks like a lit page
       * reads as something you can trust with real figures.
       *
       * `enableSystem` deliberately stays on. Settings offers Light / Dark /
       * System as three explicit choices, and turning it off would break the
       * third one. The difference is only which of them applies when nobody has
       * chosen yet.
       */
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  );
}

/**
 * Keeps the browser's own UI tinted to match the page.
 *
 * `themeColor` in the root layout is static metadata, so it can only key off
 * `prefers-color-scheme` — which stopped being the right signal the moment the
 * default became light regardless of the OS. Without this, a dark-OS visitor got
 * a light page under dark browser chrome, and anyone who chose dark got the
 * reverse. On a phone that band of colour is a visible part of the page.
 */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  React.useEffect(() => {
    if (!resolvedTheme) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute(
      "content",
      resolvedTheme === "dark" ? THEME_COLORS.dark : THEME_COLORS.light,
    );
  }, [resolvedTheme]);

  return null;
}

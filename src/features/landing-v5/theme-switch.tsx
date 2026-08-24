"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import styles from "./landing-v5.module.css";

/**
 * Light/dark switch for the public pages.
 *
 * Reuses the app's existing plumbing rather than adding a second theme system:
 * `next-themes` is already mounted in the root layout with `attribute="class"`,
 * so it puts `.dark` on `<html>` and the stylesheet's `:global(.dark)` branch
 * does the rest. Nothing here stores or reads a preference itself.
 *
 * `useHydrated` is the important part. The resolved theme is only knowable on
 * the client — it comes from localStorage or the OS — so rendering the real icon
 * during SSR would mean the server guesses, the client corrects, and React
 * reports a hydration mismatch. Until hydration the button renders a fixed icon
 * and an unresolved label; after it, the truth.
 */
export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  // `resolvedTheme` rather than `theme`: `theme` can be the string "system",
  // which tells us what to store but not which icon to draw.
  const isDark = hydrated && resolvedTheme === "dark";

  return (
    <button
      type="button"
      className={styles.themeSwitch}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      // Before hydration the state is unknown, so the label cannot claim a
      // direction. A screen reader gets a stable, honest name either way.
      aria-label={hydrated ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Switch theme"}
    >
      {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </button>
  );
}

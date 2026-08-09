"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

export function ThemeToggle({ menu = false }: { menu?: boolean }) {
  const { theme, setTheme } = useTheme();
  const mounted = useHydrated();

  const isDark = theme === "dark";

  return (
    <Button
      variant={menu ? "ghost" : "secondary"}
      size={menu ? "sm" : "icon"}
      className={menu ? "w-full justify-start" : undefined}
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {menu && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
    </Button>
  );
}

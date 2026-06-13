"use client";
import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  // Sync from DOM on mount (the no-FOUC script may have set .light already)
  useEffect(() => {
    const saved = localStorage.getItem("ml-theme") as Theme | null;
    if (saved === "light") {
      setTheme("light");
      document.documentElement.classList.add("light");
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("ml-theme", next);
  }

  return { theme, toggle, isDark: theme === "dark" };
}

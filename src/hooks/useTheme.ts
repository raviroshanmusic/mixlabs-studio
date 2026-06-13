"use client";
import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const APP_ROUTES = /^\/(dashboard|project|review|member)/;

function isAppRoute(): boolean {
  return APP_ROUTES.test(window.location.pathname);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  // Sync from localStorage on mount — only apply if on an app route
  useEffect(() => {
    const saved = localStorage.getItem("ml-theme") as Theme | null;
    if (saved === "light" && isAppRoute()) {
      setTheme("light");
      document.documentElement.classList.add("light");
    } else {
      // Always strip the class on non-app routes (handles navigating back from dashboard)
      document.documentElement.classList.remove("light");
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light" && isAppRoute()) {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("ml-theme", next);
  }

  return { theme, toggle, isDark: theme === "dark" };
}

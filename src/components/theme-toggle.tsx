"use client";

import { useTheme } from "@/components/theme-provider";
import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <button className="rounded-lg p-2 bg-surface-card border border-surface-border" aria-label="Toggle theme">
        <div className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-lg p-2 bg-surface-card border border-surface-border hover:bg-surface-hover transition-all"
      aria-label="切换主题"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-accent-coral" />
      ) : (
        <Moon className="h-5 w-5 text-accent-violet" />
      )}
    </button>
  );
}

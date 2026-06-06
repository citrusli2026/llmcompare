"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { useTranslation } from "@/lib/i18n";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

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
      aria-label={t("theme.toggle")}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-accent-coral" />
      ) : (
        <Moon className="h-5 w-5 text-accent-violet" />
      )}
    </button>
  );
}

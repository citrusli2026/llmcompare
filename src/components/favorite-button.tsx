"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface FavoriteButtonProps {
  modelId: string;
  /** Visual size — "sm" fits table cells, "md" for hero areas, "icon" for compact cards. */
  size?: "sm" | "md" | "icon";
  className?: string;
  /** Whether to show a small "pulse" animation on toggle. */
  showPulse?: boolean;
}

const SIZE_CLASS = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  icon: "h-8 w-8",
} as const;

const ICON_CLASS = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  icon: "h-4 w-4",
} as const;

export function FavoriteButton({ modelId, size = "md", className, showPulse = true }: FavoriteButtonProps) {
  const { t } = useTranslation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(modelId);
  const [pulse, setPulse] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      toggleFavorite(modelId);
      if (showPulse) {
        setPulse(true);
        setTimeout(() => setPulse(false), 350);
      }
    },
    [modelId, toggleFavorite, showPulse],
  );

  useEffect(() => {
    if (!pulse) return;
    const id = setTimeout(() => setPulse(false), 350);
    return () => clearTimeout(id);
  }, [pulse]);

  return (
    <button
      onClick={handleClick}
      data-cta="favorite"
      data-favorite={active ? "on" : "off"}
      aria-pressed={active}
      aria-label={active ? t("favorites.remove") : t("favorites.add")}
      title={active ? t("favorites.remove") : t("favorites.add")}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40",
        SIZE_CLASS[size],
        active
          ? "bg-accent-fuchsia/10 text-accent-fuchsia border border-accent-fuchsia/30"
          : "border border-surface-border bg-surface-elevated text-text-muted hover:border-accent-fuchsia/40 hover:text-accent-fuchsia hover:bg-accent-fuchsia/5",
        pulse && "scale-125",
        className,
      )}
    >
      <Heart
        className={cn(
          ICON_CLASS[size],
          "transition-transform",
          active && "fill-current",
          pulse && "animate-pulse",
        )}
      />
    </button>
  );
}

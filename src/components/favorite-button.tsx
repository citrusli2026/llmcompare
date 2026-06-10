"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface FavoriteButtonProps {
  modelId: string;
  /** Visual size — "sm" fits inline, "md" for hero, "lg" for prominent first-column slot, "icon" for compact. */
  size?: "sm" | "md" | "lg" | "icon";
  className?: string;
  /** Whether to show a small "pulse" animation on toggle. */
  showPulse?: boolean;
}

const SIZE_CLASS = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-9 w-9",
  icon: "h-8 w-8",
} as const;

const ICON_CLASS = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-[18px] w-[18px]",
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

  // 视觉策略:
  // - 已收藏 (active): 实心玫红 + 玫红淡底,一眼可识别
  // - 未收藏 (idle): 玫红描边 + 玫红图标,hover 触发实心,作为"可点击邀请"而非灰弱控件
  // - lg 尺寸比 md/sm 多一圈 ring,占住原"加入对比"按钮的槽位视觉重量
  return (
    <button
      onClick={handleClick}
      data-cta="favorite"
      data-favorite={active ? "on" : "off"}
      aria-pressed={active}
      aria-label={active ? t("favorites.remove") : t("favorites.add")}
      title={active ? t("favorites.remove") : t("favorites.add")}
      className={cn(
        "inline-flex items-center justify-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-fuchsia/50",
        size === "lg" && "ring-1 ring-accent-fuchsia/20",
        SIZE_CLASS[size],
        active
          ? "bg-accent-fuchsia/10 text-accent-fuchsia border border-accent-fuchsia/40 shadow-[0_0_0_1px_rgba(217,70,239,0.15)]"
          : "border border-accent-fuchsia/30 text-accent-fuchsia/70 bg-surface-card hover:bg-accent-fuchsia/10 hover:text-accent-fuchsia hover:border-accent-fuchsia/50",
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

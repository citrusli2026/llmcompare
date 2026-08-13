"use client";

import { ArrowUp, ArrowDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface RankChangeProps {
  rank: number;
  change?: number;
  isNew?: boolean;
  size?: "sm" | "md";
}

export function RankChange({ rank, change, isNew, size = "md" }: RankChangeProps) {
  const { t } = useTranslation();
  const isSignificant = change != null && Math.abs(change) >= 3;

  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("tabular-nums", size === "sm" ? "text-[10px]" : "text-xs")}>
        #{rank}
      </span>
      {isNew ? (
        <span
          className={cn(
            "inline-flex items-center rounded px-1 font-medium text-accent-lime bg-accent-lime/10",
            size === "sm" ? "text-[9px]" : "text-[10px]"
          )}
        >
          <Sparkles className={cn("mr-0.5", size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5")} />
          {t("common.newBadge")}
        </span>
      ) : isSignificant ? (
        <span
          className={cn(
            "inline-flex items-center tabular-nums font-medium",
            change! > 0 ? "text-accent-lime" : "text-accent-fuchsia",
            size === "sm" ? "text-[9px]" : "text-[10px]"
          )}
        >
          {change! > 0 ? (
            <ArrowUp className={cn("mr-0.5", size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5")} />
          ) : (
            <ArrowDown className={cn("mr-0.5", size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5")} />
          )}
          {Math.abs(change!)}
        </span>
      ) : null}
    </span>
  );
}

"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn, getTypeBadgeClasses, formatTokenCount } from "@/lib/utils";
import { type ModelWithScores } from "@/lib/scoring";
import { type SortKey, type HeaderDef, type ModelGroup, type ScoreKey } from "./types";
import { getScoreColor } from "./utils";
import { useTranslation } from "@/lib/i18n";
import { FavoriteButton } from "@/components/favorite-button";

interface MobileCardProps {
  model: ModelWithScores;
  group: ModelGroup;
  idx: number;
  sortKey: SortKey;
  headers: HeaderDef[];
  metricOrder: ScoreKey[];
  renderMetric: (model: ModelWithScores, key: ScoreKey) => React.ReactNode;
  percentiles: Record<string, { p25: number; p50: number; p75: number } | null>;
  globalMax: Record<string, number>;
}

export function MobileCard({ model, group, idx, sortKey: _sortKey, percentiles }: MobileCardProps) {
  void _sortKey;
  const { t } = useTranslation();
  const router = useRouter();

  const handleCardClick = useCallback(() => {
    router.push(`/models/${model.id}`);
  }, [router, model.id]);

  // ── Data helpers ──
  const blended = model.raw.blended;
  const costStr = blended != null ? (blended === 0 ? t("common.free") : `$${blended.toFixed(2)}`) : null;
  const isValue = blended != null && model.raw.intelligence != null && model.raw.intelligence >= 40 && blended < 1;

  const tokens = model.raw.openrouter_weekly_tokens;
  const tokenStr = tokens != null ? (() => {
    const { value, unit } = formatTokenCount(tokens);
    return `${value}${unit}`;
  })() : null;

  const intelScore = model.raw.intelligence;

  // Fixed widths for virtual table alignment across cards
  const COL = {
    date: "w-[88px]",
    intel: "w-[68px]",
    cost: "w-[62px]",
    token: "w-[64px]",
  };

  return (
    <div
      data-testid="mobile-model-card"
      data-model-id={model.id}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={t("models.expandHint")}
      className={cn(
        "relative rounded-lg border border-surface-border bg-surface-card px-2 py-1.5 transition-all active:scale-[0.98] active:bg-surface-elevated cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40",
        group.borderClass,
        group.rowBgClass
      )}
    >
      {/* Row 1: rank + logo + name + type badge */}
      <div className="flex items-center gap-1.5 min-h-6">
        {/* Favorite — tiny dot-style, matches nav icon feel */}
        <span onClick={(e) => e.stopPropagation()} className="shrink-0">
          <FavoriteButton modelId={model.id} size="sm" showPulse={false} ghost />
        </span>

        {group.showRank && (
          <span className="text-[10px] text-text-muted tabular-nums w-5 shrink-0">
            #{group.rankOffset + idx + 1}
          </span>
        )}
        {model.logo && (
          <img
            src={model.logo}
            alt=""
            className="h-4 w-4 rounded shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <span className="text-[13px] font-medium text-text-primary truncate min-w-0 flex-1">
          {model.name}
        </span>
        {isValue && (
          <Badge
            variant="secondary"
            className="text-[9px] py-0 px-1 h-[14px] leading-none shrink-0 bg-accent-lime/10 text-accent-lime border-accent-lime/20"
          >
            {t("models.valuePickShort")}
          </Badge>
        )}
        <Badge
          variant="secondary"
          className={cn(
            "text-[9px] py-0 px-1 h-[14px] leading-none shrink-0",
            getTypeBadgeClasses(model.type)
          )}
        >
          {t(model.type === "开源" ? "common.open" : "common.closed")}
        </Badge>
      </div>

      {/* Row 2: data row — labeled columns for clarity */}
      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-text-muted leading-tight pl-8">
        <span className={cn("shrink-0 tabular-nums", COL.date)}>
          <span className="opacity-50 mr-0.5">{t("table.date")}</span>
          {model.raw.release_date ?? "—"}
        </span>
        {intelScore != null ? (
          <span className={cn(
            "shrink-0 tabular-nums font-medium",
            COL.intel,
            getScoreColor(intelScore, "intelligence", percentiles)
          )}>
            <span className="opacity-50 mr-0.5 font-normal">{t("models.colIntelligence")}</span>
            {intelScore.toFixed(1)}
          </span>
        ) : (
          <span className={cn("shrink-0", COL.intel)}>—</span>
        )}
        <span className={cn("shrink-0 tabular-nums", COL.cost)}>
          <span className="opacity-50 mr-0.5">{t("models.colCost")}</span>
          {costStr ?? "—"}
        </span>
        <span className={cn("shrink-0 tabular-nums font-medium text-amber-500/80", COL.token)}>
          <span className="opacity-50 mr-0.5 font-normal">{t("models.colTokens")}</span>
          {tokenStr ?? "—"}
        </span>
      </div>
    </div>
  );
}

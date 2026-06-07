"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, CheckSquare, Square } from "lucide-react";
import { cn, getTypeBadgeClasses, formatTokenCount } from "@/lib/utils";
import { type ModelWithScores } from "@/lib/scoring";
import { type SortKey, type HeaderDef, type ModelGroup, type ScoreKey } from "./types";
import { getScoreColor } from "./utils";
import { useTranslation } from "@/lib/i18n";

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

function scoreValue(model: ModelWithScores): number | null {
  return model.raw.intelligence ?? null;
}

export function MobileCard({ model, group, idx, sortKey: _sortKey, percentiles }: MobileCardProps) {
  void _sortKey;
  const { t } = useTranslation();
  const router = useRouter();

  const handleCardClick = useCallback(() => {
    router.push(`/product/${model.id}`);
  }, [router, model.id]);

  // ── Compare logic ──
  const { isInCompare, toggleCompare } = useCompareIds();

  const handleToggleCompare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      toggleCompare(model.id);
    },
    [model.id, toggleCompare]
  );

  // ── Data helpers ──
  const blended = model.raw.blended;
  const costStr = blended != null ? (blended === 0 ? t("common.free") : `$${blended.toFixed(2)}`) : null;

  const weeklyTokens = model.raw.openrouter_weekly_tokens;
  const tokensDisplay = weeklyTokens != null
    ? (() => {
        const fmt = formatTokenCount(weeklyTokens);
        return fmt.unit ? `${fmt.value}${fmt.unit}` : fmt.value;
      })()
    : null;

  return (
    <div
      data-testid="mobile-model-card"
      onClick={handleCardClick}
      className={cn(
        "relative rounded-xl border border-surface-border p-2.5 transition-all active:scale-[0.97] active:bg-surface-elevated cursor-pointer",
        group.borderClass,
        group.rowBgClass
      )}
    >
      {/* Compare checkbox — top right */}
      <button
        onClick={handleToggleCompare}
        className={cn(
          "absolute top-0.5 right-0.5 flex items-center justify-center w-11 h-11 rounded-lg transition-all z-10",
          isInCompare(model.id)
            ? "text-accent-violet hover:text-violet-500 bg-accent-violet/5"
            : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
        )}
        aria-label={isInCompare(model.id) ? t("compare.remove") : t("compare.addToCompare")}
        title={isInCompare(model.id) ? t("compare.remove") : t("compare.addToCompare")}
      >
        {isInCompare(model.id) ? (
          <CheckSquare className="h-5 w-5" />
        ) : (
          <Square className="h-5 w-5" />
        )}
      </button>

      {/* Main row: rank + logo + name + intelligence score */}
      <div className="flex items-center gap-1.5 min-h-9 pr-11">
        {group.showRank && (
          <span className="text-xs text-text-muted tabular-nums w-5 shrink-0">
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
        <span className="text-sm font-medium text-text-primary truncate min-w-0 flex-1">
          {model.name}
        </span>
        {/* Intelligence score — most important metric, always shown */}
        {scoreValue(model) != null && (
          <span
            className={cn(
              "text-sm font-semibold tabular-nums shrink-0 ml-1",
              getScoreColor(scoreValue(model), "intelligence", percentiles)
            )}
          >
            {scoreValue(model)!.toFixed(1)}
          </span>
        )}
      </div>

      {/* Sub row: company · date | cost · tokens · badge · ↗ */}
      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-text-secondary leading-tight">
        {/* Left: company · date */}
        <span className="truncate max-w-[35%]">{model.company}</span>
        {model.raw.release_date && (
          <>
            <span className="text-text-muted shrink-0">·</span>
            <span className="text-text-muted shrink-0">{model.raw.release_date}</span>
          </>
        )}
        {/* Spacer */}
        <span className="flex-1 min-w-2" />
        {/* Right: cost · tokens */}
        {costStr && (
          <span className="tabular-nums shrink-0 text-text-secondary">
            {costStr}
            {(() => {
              const isValue = model.raw.intelligence != null && model.raw.intelligence >= 40 && model.raw.blended != null && model.raw.blended > 0 && model.raw.blended < 1;
              return isValue ? <span className="ml-0.5 text-[10px]" title={t("models.colValueLabel")}>💎</span> : null;
            })()}
          </span>
        )}
        {tokensDisplay && (
          <>
            {costStr && <span className="text-text-muted shrink-0">·</span>}
            <span className="tabular-nums shrink-0 text-text-secondary">{tokensDisplay}</span>
          </>
        )}
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] py-0 px-1.5 h-[18px] leading-none shrink-0",
            getTypeBadgeClasses(model.type)
          )}
        >
          {t(model.type === "开源" ? "common.open" : "common.closed")}
        </Badge>
        <ArrowUpRight className="h-3 w-3 text-text-muted shrink-0" />
      </div>
    </div>
  );
}

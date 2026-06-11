"use client";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn, getTypeBadgeClasses, isValuePick } from "@/lib/utils";
import { getAllModels, type ModelWithScores } from "@/lib/scoring";
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

function scoreValue(model: ModelWithScores): number | null {
  return model.raw.intelligence ?? null;
}

function formatTokenCount(val: number): { value: string; unit: string } {
  if (val >= 1e12) return { value: (val / 1e12).toFixed(1), unit: "T" };
  if (val >= 1e9) return { value: (val / 1e9).toFixed(1), unit: "B" };
  if (val >= 1e6) return { value: (val / 1e6).toFixed(0), unit: "M" };
  if (val >= 1e3) return { value: (val / 1e3).toFixed(0), unit: "K" };
  return { value: String(val), unit: "" };
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

  const allModels = useMemo(() => getAllModels(), []);

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
        "relative rounded-lg border border-surface-border bg-surface-card px-2 py-2 transition-all active:scale-[0.98] active:bg-surface-elevated cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40",
        group.borderClass,
        group.rowBgClass
      )}
    >
      {/* Main row: favorite + rank + logo + name + score + cost */}
      <div className="flex items-center gap-1.5 min-h-8">
        {/* Favorite button — left side */}
        <span onClick={(e) => e.stopPropagation()} className="shrink-0">
          <FavoriteButton modelId={model.id} size="lg" />
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
        <span className="text-sm font-medium text-text-primary truncate min-w-0 flex-1">
          {model.name}
        </span>
        {/* Intelligence score */}
        {scoreValue(model) != null && (
          <span
            className={cn(
              "text-sm font-bold tabular-nums shrink-0 ml-1",
              getScoreColor(scoreValue(model), "intelligence", percentiles)
            )}
          >
            {scoreValue(model)!.toFixed(1)}
          </span>
        )}
        {/* Cost */}
        {costStr && (
          <span className="text-[11px] tabular-nums shrink-0 text-text-secondary ml-1">
            {costStr}
          </span>
        )}
      </div>

      {/* Sub row: company · date · tokens · type badge */}
      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-text-muted leading-tight pl-8">
        <span className="truncate max-w-[35%]">{model.company}</span>
        {model.raw.release_date && (
          <>
            <span className="shrink-0">·</span>
            <span className="shrink-0">{model.raw.release_date}</span>
          </>
        )}
        {tokenStr && (
          <>
            <span className="shrink-0">·</span>
            <span className="shrink-0 tabular-nums">{tokenStr}</span>
          </>
        )}
        {isValue && (
          <Badge
            variant="secondary"
            className="text-[9px] py-0 px-1 h-[14px] leading-none shrink-0 bg-accent-lime/10 text-accent-lime border-accent-lime/20"
          >
            {t("models.valuePickShort")}
          </Badge>
        )}
        <span className="flex-1 min-w-1" />
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
    </div>
  );
}

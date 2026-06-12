"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn, getTypeBadgeClasses, formatTokenCount, isValuePick } from "@/lib/utils";
import { type ModelWithScores, ModelType } from "@/lib/scoring";
import { type SortKey, type ModelGroup, type ScoreKey, type CompareState } from "./types";
import { getScoreColor } from "./utils";
import { useTranslation } from "@/lib/i18n";
import { FavoriteButton } from "@/components/favorite-button";
import { ModelLogo } from "@/components/model-logo";
import { GitCompare } from "lucide-react";

interface MobileCardProps {
  model: ModelWithScores;
  group: ModelGroup;
  idx: number;
  sortKey: SortKey;
  percentiles: Record<ScoreKey, { p25: number; p50: number; p75: number } | null>;
  compare?: CompareState;
}

export function MobileCard({ model, group, idx, percentiles, compare }: MobileCardProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleCardClick = useCallback(() => {
    router.push(`/models/${model.id}`);
  }, [router, model.id]);

  // ── Data helpers ──
  const blended = model.raw.blended;
  const costStr = blended != null ? (blended === 0 ? t("common.free") : `$${blended.toFixed(2)}`) : null;
  const isValue = isValuePick(model);

  const tokens = model.raw.openrouter_weekly_tokens;
  const tokenStr = tokens != null ? (() => {
    const { value, unit } = formatTokenCount(tokens);
    return `${value}${unit}`;
  })() : null;

  const intelScore = model.raw.intelligence;

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
        {/* Favorite + Compare */}
        <span onClick={(e) => e.stopPropagation()} className="shrink-0 inline-flex items-center gap-0.5">
          <FavoriteButton modelId={model.id} size="sm" showPulse={false} ghost />
          {compare && (
            <button
              onClick={() => compare.onToggle(model.id)}
              disabled={!compare.isInCompare(model.id) && compare.isAtMax}
              className={cn(
                "rounded p-1 transition-all",
                compare.isInCompare(model.id)
                  ? "bg-accent-violet/15 text-accent-violet"
                  : "text-text-muted hover:text-accent-violet",
                !compare.isInCompare(model.id) && compare.isAtMax && "opacity-30 cursor-not-allowed",
              )}
              aria-label={t(compare.isInCompare(model.id) ? "compare.remove" : "compare.add")}
            >
              <GitCompare className="h-3 w-3" />
            </button>
          )}
        </span>

        {group.showRank && (
          <span className="text-[10px] text-text-muted tabular-nums w-5 shrink-0">
            #{group.rankOffset + idx + 1}
          </span>
        )}
        <ModelLogo src={model.logo} name={model.name} size="xs" />
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
          {t(model.type === ModelType.Open ? "common.open" : "common.closed")}
        </Badge>
      </div>

      {/* Row 2: data row — clean values, consistent contrast */}
      <div className="flex items-center gap-2 mt-0.5 text-[11px] leading-tight pl-8">
        <span className="shrink-0 tabular-nums text-text-muted opacity-70">
          {model.raw.release_date ?? "—"}
        </span>
        <span className="shrink-0 text-text-muted opacity-30">·</span>
        {intelScore != null ? (
          <span className={cn(
            "shrink-0 tabular-nums font-semibold",
            getScoreColor(intelScore, "intelligence", percentiles) === "text-accent-lime"
              ? "text-accent-lime"
              : "text-text-primary"
          )}>
            {intelScore.toFixed(1)}
          </span>
        ) : (
          <span className="shrink-0 text-text-muted">—</span>
        )}
        <span className="shrink-0 text-text-muted opacity-30">·</span>
        <span className="shrink-0 tabular-nums text-text-primary">
          {costStr ?? "—"}
        </span>
        <span className="shrink-0 text-text-muted opacity-30">·</span>
        <span className="shrink-0 tabular-nums font-semibold text-amber-400">
          {tokenStr ?? "—"}
        </span>
      </div>
    </div>
  );
}

"use client";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Plus } from "lucide-react";
import { cn, getTypeBadgeClasses, isValuePick } from "@/lib/utils";
import { getAllModels, type ModelWithScores } from "@/lib/scoring";
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
    router.push(`/models/${model.id}`);
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

  const tryUrl = model.vendor_links?.console ?? model.vendor_links?.homepage;
  const allModels = useMemo(() => getAllModels(), []);
  const showValue = useMemo(() => isValuePick(model, allModels), [model, allModels]);

  return (
    <div
      data-testid="mobile-model-card"
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
      {/* Top-right: try CTA + compare button (stacked) */}
      <div className="absolute top-1 right-1 flex items-center gap-0.5 z-10">
        {tryUrl && (
          <a
            href={tryUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            data-cta="mobile-card-console"
            title={t("models.rowTryCta")}
            aria-label={t("models.rowTryCta")}
            className="flex items-center justify-center w-8 h-8 rounded-md bg-accent-violet/10 text-accent-violet hover:bg-accent-violet/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          onClick={handleToggleCompare}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40",
            isInCompare(model.id)
              ? "bg-accent-violet text-white"
              : "bg-surface-elevated text-text-muted border border-surface-border hover:border-accent-violet/50 hover:text-accent-violet"
          )}
          aria-label={isInCompare(model.id) ? t("compare.remove") : t("compare.addToCompare")}
          title={isInCompare(model.id) ? t("compare.remove") : t("compare.addToCompare")}
        >
          {isInCompare(model.id) ? (
            <span className="text-xs font-bold">✓</span>
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Main row: rank + logo + name + intelligence score + cost */}
      <div className="flex items-center gap-1.5 min-h-8 pr-16">
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
        {/* Intelligence score — primary metric, always shown */}
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
        {/* Cost — secondary inline metric */}
        {costStr && (
          <span className="text-[11px] tabular-nums shrink-0 text-text-secondary ml-1">
            {costStr}
            {showValue && <span className="ml-0.5" title={t("models.colValueLabel")}>💎</span>}
          </span>
        )}
      </div>

      {/* Sub row: company · type · date */}
      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-text-muted leading-tight pl-6">
        <span className="truncate max-w-[40%]">{model.company}</span>
        {model.raw.release_date && (
          <>
            <span className="shrink-0">·</span>
            <span className="shrink-0">{model.raw.release_date}</span>
          </>
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

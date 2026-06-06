"use client";
import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, CheckSquare, Square } from "lucide-react";
import { cn, getTypeBadgeClasses } from "@/lib/utils";
import { type ModelWithScores } from "@/lib/scoring";
import { type SortKey, type HeaderDef, type ModelGroup, type ScoreKey } from "./types";
import { getRawValue, getScoreColor, ScoreBar } from "./utils";
import { useTranslation } from "@/lib/i18n";

const MAX_COMPARE = 6;

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

export function MobileCard({ model, group, idx, sortKey: _sortKey, headers, metricOrder, renderMetric, percentiles, globalMax }: MobileCardProps) {
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

  const headerMap = useMemo(() => {
    const map = new Map<string, HeaderDef>();
    for (const h of headers) {
      map.set(h.key, h);
    }
    return map;
  }, [headers]);

  return (
    <div
      data-testid="mobile-model-card"
      onClick={handleCardClick}
      className={cn(
        "relative rounded-xl border border-surface-border p-3 transition-all active:scale-[0.97] active:bg-surface-elevated cursor-pointer",
        group.borderClass,
        group.rowBgClass
      )}
    >
      {/* Compare checkbox — top right */}
      <button
        onClick={handleToggleCompare}
        className={cn(
          "absolute top-1 right-1 flex items-center justify-center w-11 h-11 rounded-lg transition-all z-10",
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

      {/* 模型名（可点击导航） */}
      <Link
        href={`/product/${model.id}`}
        className="inline-flex items-center gap-1.5 font-medium text-text-primary max-w-[85%]"
      >
        {group.showRank && (
          <span className="text-text-muted text-xs mr-0.5">#{group.rankOffset + idx + 1}</span>
        )}
        {model.logo && (
          <img
            src={model.logo}
            alt=""
            className="h-4 w-4 rounded shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <span className="truncate">{model.name}</span>
        <ArrowUpRight className="h-3 w-3 text-accent-violet opacity-70 shrink-0" />
      </Link>

      {/* 元信息行 */}
      <div className="flex flex-wrap items-center gap-1 mt-1 mb-2">
        <span className="text-xs text-text-secondary">{model.company}</span>
        {model.raw.release_date && (
          <span className="text-[10px] text-text-muted">· {model.raw.release_date}</span>
        )}
        <Badge
          variant="secondary"
          className={cn("text-[10px] py-0 px-1.5", getTypeBadgeClasses(model.type))}
        >
          {t(model.type === "开源" ? "common.open" : "common.closed")}
        </Badge>
      </div>

      {/* 指标网格 */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        {metricOrder.map((key) => {
          const h = headerMap.get(key)!;
          const isScoreBar = h.key === "intelligence" || h.key === "coding" || h.key === "agentic";
          return (
            <div key={h.key} className="rounded-md bg-surface-hover px-1.5 py-1">
              <div className="flex items-center gap-0.5 mb-0.5">
                <h.icon className="h-2.5 w-2.5 text-text-muted" />
                <span className="text-[9px] text-text-muted truncate">{t(h.labelKey)}</span>
              </div>
              <div
                className={cn(
                  "text-[11px] font-medium tabular-nums leading-tight",
                  getScoreColor(getRawValue(model, h.key), h.key, percentiles)
                )}
              >
                {isScoreBar ? <ScoreBar value={getRawValue(model, h.key)} maxValue={globalMax[h.key]} colorPercentiles={percentiles[h.key]} /> : renderMetric(model, h.key)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

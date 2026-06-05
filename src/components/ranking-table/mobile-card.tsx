"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useCallback } from "react";
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
}

export function MobileCard({ model, group, idx, sortKey: _sortKey, headers, metricOrder, renderMetric, percentiles }: MobileCardProps) {
  void _sortKey;
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Compare logic (same as model-row) ──
  const compareIds = useMemo(
    () => searchParams.get("compare")?.split(",").filter(Boolean) ?? [],
    [searchParams]
  );
  const isInCompare = useMemo(
    () => compareIds.includes(model.id),
    [compareIds, model.id]
  );
  const toggleCompare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const params = new URLSearchParams(searchParams.toString());
      let current = compareIds;
      if (isInCompare) {
        current = current.filter((id) => id !== model.id);
      } else {
        if (current.length >= MAX_COMPARE) return;
        current = [...current, model.id];
      }
      if (current.length > 0) {
        params.set("compare", current.join(","));
      } else {
        params.delete("compare");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [model.id, isInCompare, compareIds, searchParams, router]
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
      className={cn(
        "relative rounded-xl border border-surface-border p-3 group hover:ring-1 hover:ring-accent-violet/30 transition-all",
        group.borderClass,
        group.rowBgClass
      )}
    >
      {/* Compare checkbox — top right */}
      <button
        onClick={toggleCompare}
        className={cn(
          "absolute top-1 right-1 flex items-center justify-center w-11 h-11 rounded-lg transition-all z-10",
          isInCompare
            ? "text-accent-violet hover:text-violet-500 bg-accent-violet/5"
            : "text-text-muted hover:text-text-secondary hover:bg-surface-hover"
        )}
        aria-label={isInCompare ? t("compare.remove") : t("compare.addToCompare")}
        title={isInCompare ? t("compare.remove") : t("compare.addToCompare")}
      >
        {isInCompare ? (
          <CheckSquare className="h-5 w-5" />
        ) : (
          <Square className="h-5 w-5" />
        )}
      </button>

      {/* 模型名（可点击导航） */}
      <Link
        href={`/product/${model.id}`}
        className="inline-flex items-center gap-1 font-medium text-text-primary max-w-[85%]"
      >
        {group.showRank && (
          <span className="text-text-muted text-xs mr-1">#{group.rankOffset + idx + 1}</span>
        )}
        <span className="truncate">{model.name}</span>
        <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
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
                  h.key !== "tokens" && getScoreColor(getRawValue(model, h.key), h.key, percentiles)
                )}
              >
                {isScoreBar ? <ScoreBar value={getRawValue(model, h.key)} /> : renderMetric(model, h.key)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

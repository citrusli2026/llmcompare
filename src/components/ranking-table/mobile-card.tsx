"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import { cn, getTypeBadgeClasses } from "@/lib/utils";
import { type ModelWithScores } from "@/lib/scoring";
import { type SortKey, type HeaderDef, type ModelGroup, type ScoreKey } from "./types";
import { getRawValue, getScoreColor } from "./utils";
import { useMemo } from "react";
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
}

export function MobileCard({ model, group, idx, sortKey: _sortKey, headers, metricOrder, renderMetric, percentiles }: MobileCardProps) {
  void _sortKey; // 保留参数但当前未使用
  const { t } = useTranslation();

  const headerMap = useMemo(() => {
    const map = new Map<string, HeaderDef>();
    for (const h of headers) {
      map.set(h.key, h);
    }
    return map;
  }, [headers]);

  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border p-3",
        group.borderClass,
        group.rowBgClass
      )}
    >
      {/* 模型名 */}
      <div className="mb-2">
        <Link
          href={`/product/${model.id}`}
          className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group max-w-full"
        >
          {group.showRank && (
            <span className="text-text-muted text-xs mr-1">#{group.rankOffset + idx + 1}</span>
          )}
          <span className="truncate">{model.name}</span>
          <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
        </Link>
      </div>

      {/* 元信息行 */}
      <div className="flex flex-wrap items-center gap-1 mb-2">
        <span className="text-xs text-text-secondary">{model.company}</span>
        {model.raw.release_date && (
          <span className="text-[10px] text-text-muted">· {model.raw.release_date}</span>
        )}
        <Badge
          variant="secondary"
          className={cn("text-[10px] py-0 px-1.5", group.badgeClass, group.badgeTextClass)}
        >
          {t(group.labelKey)}
        </Badge>
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
                {renderMetric(model, h.key)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ExternalLink, Plus } from "lucide-react";
import { cn, getTypeBadgeClasses } from "@/lib/utils";
import { type ModelWithScores } from "@/lib/scoring";
import { type SortKey, type HeaderDef, type ModelGroup } from "./types";
import { getRawValue, getScoreColor, ScoreBar } from "./utils";
import { useTranslation } from "@/lib/i18n";

interface ModelRowProps {
  model: ModelWithScores;
  group: ModelGroup;
  idx: number;
  sortKey: SortKey;
  headers: HeaderDef[];
  renderers: Record<string, (m: ModelWithScores) => React.ReactNode>;
  colVisibilityClass: (h: HeaderDef) => string;
  percentiles: Record<string, { p25: number; p50: number; p75: number } | null>;
  globalMax: Record<string, number>;
}

export function ModelRow({ model, group, idx, sortKey, headers, renderers, colVisibilityClass, percentiles, globalMax }: ModelRowProps) {
  const { t } = useTranslation();
  const { isInCompare, toggleCompare } = useCompareIds();

  const handleToggleCompare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleCompare(model.id);
    },
    [model.id, toggleCompare]
  );

  return (
    <TableRow
      className={cn(
        "border-surface-border hover:bg-surface-hover transition-colors even:bg-surface-elevated/40",
        group.borderClass,
      )}
    >
      {/* Compare checkbox — visible "⊕ 对比" button */}
      <TableCell className="w-16 sm:w-20">
        <button
          onClick={handleToggleCompare}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface-card",
            isInCompare(model.id)
              ? "bg-accent-violet/10 text-accent-violet border border-accent-violet/30"
              : "text-text-muted border border-surface-border hover:border-accent-violet/50 hover:text-accent-violet hover:bg-accent-violet/5"
          )}
          aria-label={isInCompare(model.id) ? t("compare.remove") : t("compare.addToCompare")}
          title={isInCompare(model.id) ? t("compare.remove") : t("compare.addToCompare")}
        >
          {isInCompare(model.id) ? (
            <span className="flex items-center gap-1">
              <span className="text-[10px]">☑</span>
              <span>{t("compare.remove")}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" />
              <span>{t("compare.addToCompare")}</span>
            </span>
          )}
        </button>
      </TableCell>

      {/* Model name + badges */}
      <TableCell className="max-w-[220px]">
        <div className="inline-flex items-center gap-1.5 font-medium text-text-primary group truncate">
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
          <Link
            href={`/models/${model.id}`}
            className="inline-flex items-center gap-1.5 group/link"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate">{model.name}</span>
            <ArrowUpRight className="h-3 w-3 text-text-muted transition-all duration-200 opacity-40 group-hover/link:opacity-100 group-hover/link:text-accent-violet group-hover/link:translate-x-0.5 shrink-0" />
          </Link>
          {model.vendor_links?.console && (
            <a
              href={model.vendor_links.console}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              data-cta="row-console"
              title={t("models.rowTryCta")}
              className="inline-flex items-center justify-center h-5 w-5 rounded text-text-muted hover:text-accent-violet hover:bg-accent-violet/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <Badge
            variant="secondary"
            className={cn("text-[10px] py-0 px-1.5 whitespace-nowrap shrink-0", getTypeBadgeClasses(model.type))}
          >
            {t(model.type === "开源" ? "common.open" : "common.closed")}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="text-text-secondary hidden sm:table-cell">{model.company}</TableCell>
      <TableCell
        className={cn(
          "hidden lg:table-cell text-sm",
          sortKey === "date" ? "font-semibold text-text-primary" : "text-text-secondary"
        )}
      >
        {model.raw.release_date ?? "—"}
      </TableCell>
      {headers.map((h) => {
        const isScoreBar = h.key === "intelligence" || h.key === "coding" || h.key === "agentic";
        const tipKey = isScoreBar ? `tip.${h.key}` as const : null;
        return (
          <TableCell
            key={h.key}
            className={cn(
              "text-sm",
              colVisibilityClass(h),
              h.key === sortKey ? "font-semibold" : "",
              getScoreColor(getRawValue(model, h.key), h.key, percentiles)
            )}
          >
            {isScoreBar ? <ScoreBar value={getRawValue(model, h.key)} maxValue={globalMax[h.key]} colorPercentiles={percentiles[h.key]} tipContent={tipKey ? t(tipKey) : undefined} /> : renderers[h.key](model)}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

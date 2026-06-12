"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import { cn, getTypeBadgeClasses } from "@/lib/utils";
import { type ModelWithScores, ModelType } from "@/lib/scoring";
import { type SortKey, type HeaderDef, type ModelGroup, type CompareState } from "./types";
import { getRawValue, getScoreColor, ScoreBar } from "./utils";
import { useTranslation } from "@/lib/i18n";
import { FavoriteButton } from "@/components/favorite-button";
import { ModelLogo } from "@/components/model-logo";

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
  compare?: CompareState;
}

export function ModelRow({ model, group, idx, sortKey, headers, renderers, colVisibilityClass, percentiles, globalMax, compare }: ModelRowProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const isSelected = compare?.active && compare.isInCompare(model.id);

  const handleRowClick = useCallback(() => {
    if (compare?.active) {
      compare.onToggle(model.id);
    } else {
      router.push(`/models/${model.id}`);
    }
  }, [router, model.id, compare]);

  return (
    <TableRow
      data-model-id={model.id}
      onClick={handleRowClick}
      className={cn(
        "border-surface-border hover:bg-surface-hover transition-colors even:bg-surface-elevated/40 cursor-pointer",
        group.borderClass,
        isSelected && "ring-1 ring-accent-violet/40 bg-accent-violet/5",
        compare?.active && !isSelected && compare.isAtMax && "opacity-50",
      )}
    >
      {/* Favorite — first column */}
      <TableCell className="w-10 sm:w-12">
        <span onClick={(e) => e.stopPropagation()} className="inline-flex items-center">
          <FavoriteButton modelId={model.id} size="lg" ghost />
        </span>
      </TableCell>

      {/* Model name + badges */}
      <TableCell className="max-w-[220px]">
        <div className="inline-flex items-center gap-1.5 font-medium text-text-primary group truncate">
          {group.showRank && (
            <span className="text-text-muted text-xs mr-0.5">#{group.rankOffset + idx + 1}</span>
          )}
          <ModelLogo src={model.logo} name={model.name} size="xs" />
          <Link
            href={`/models/${model.id}`}
            className="inline-flex items-center gap-1.5 group/link"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate">{model.name}</span>
            <ArrowUpRight className="h-3 w-3 text-text-muted transition-all duration-200 opacity-40 group-hover/link:opacity-100 group-hover/link:text-accent-violet group-hover/link:translate-x-0.5 shrink-0" />
          </Link>
          <Badge
            variant="secondary"
            className={cn("text-[10px] py-0 px-1.5 whitespace-nowrap shrink-0", getTypeBadgeClasses(model.type))}
          >
            {t(model.type === ModelType.Open ? "common.open" : "common.closed")}
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

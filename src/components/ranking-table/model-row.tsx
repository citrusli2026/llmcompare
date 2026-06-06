"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, CheckSquare, Square } from "lucide-react";
import { cn, getTypeBadgeClasses } from "@/lib/utils";
import { type ModelWithScores } from "@/lib/scoring";
import { type SortKey, type HeaderDef, type ModelGroup } from "./types";
import { getRawValue, getScoreColor, ScoreBar } from "./utils";
import { useTranslation } from "@/lib/i18n";
import { useCallback } from "react";

const MAX_COMPARE = 6;

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
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read compare IDs from URL
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

  return (
    <TableRow
      className={cn(
        "border-surface-border hover:bg-surface-hover transition-colors even:bg-surface-elevated/40",
        group.borderClass,
      )}
    >
      {/* Compare checkbox */}
      <TableCell className="w-10 sm:w-12">
        <button
          onClick={toggleCompare}
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded transition-colors",
            isInCompare
              ? "text-accent-violet hover:text-violet-500"
              : "text-text-muted hover:text-text-secondary"
          )}
          aria-label={isInCompare ? t("compare.remove") : t("compare.addToCompare")}
          title={isInCompare ? t("compare.remove") : t("compare.addToCompare")}
        >
          {isInCompare ? (
            <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5" />
          ) : (
            <Square className="h-4 w-4 sm:h-5 sm:w-5" />
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
              className="h-5 w-5 rounded shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <Link
            href={`/product/${model.id}`}
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
            {isScoreBar ? <ScoreBar value={getRawValue(model, h.key)} maxValue={globalMax[h.key]} colorPercentiles={percentiles[h.key]} /> : renderers[h.key](model)}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

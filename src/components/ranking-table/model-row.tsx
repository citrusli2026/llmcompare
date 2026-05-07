"use client";

import Link from "next/link";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import { cn, getTypeBadgeClasses } from "@/lib/utils";
import { type ModelWithScores } from "@/lib/scoring";
import { type SortKey, type HeaderDef, type ModelGroup } from "./types";
import { getRawValue, getScoreColor } from "./utils";
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
}

export function ModelRow({ model, group, idx, sortKey, headers, renderers, colVisibilityClass, percentiles }: ModelRowProps) {
  const { t } = useTranslation();

  return (
    <TableRow
      className={cn(
        "border-gray-300 dark:border-white/25 hover:bg-surface-hover transition-colors",
        group.borderClass,
        group.rowBgClass
      )}
    >
      <TableCell className="max-w-[240px]">
        <Link
          href={`/product/${model.id}`}
          className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group truncate"
        >
          {group.showRank && (
            <span className="text-text-muted text-xs mr-1">#{group.rankOffset + idx + 1}</span>
          )}
          {model.name}
          <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
        </Link>
        <div className="flex gap-1 mt-1">
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
      {headers.map((h) => (
        <TableCell
          key={h.key}
          className={cn(
            "text-sm",
            colVisibilityClass(h),
            h.key === sortKey ? "font-semibold" : "",
            h.key !== "tokens" && getScoreColor(getRawValue(model, h.key), h.key, percentiles)
          )}
        >
          {renderers[h.key](model)}
        </TableCell>
      ))}
    </TableRow>
  );
}

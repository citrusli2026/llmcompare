"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import { HEADERS } from "../utils/constants";
import { renderers } from "../utils/renderers";
import { getRawValue, type SortKey } from "../hooks/use-sorting";
import { getScoreColor } from "../utils/color-utils";
import type { Percentiles } from "../utils/percentiles";
import type { ColoredKey } from "../utils/color-buckets";

interface DesktopTableRowProps {
  model: ModelWithScores;
  rank?: number;
  variant: "intl" | "frontier" | "mainstream";
  sortKey: SortKey;
  percentiles: Record<ColoredKey, Percentiles | null>;
}

export function DesktopTableRow({
  model,
  rank,
  variant,
  sortKey,
  percentiles,
}: DesktopTableRowProps) {
  const { t } = useTranslation();

  const rowStyles = {
    intl: "border-gray-300 dark:border-white/25 border-t-2 border-t-amber-400/50 bg-amber-500/[0.06] dark:bg-amber-500/[0.08]",
    frontier:
      "border-gray-300 dark:border-white/25 hover:bg-surface-hover transition-colors bg-violet-500/[0.03] dark:bg-violet-500/[0.04]",
    mainstream: "border-gray-300 dark:border-white/25 hover:bg-surface-hover transition-colors",
  };

  const badgeConfig = {
    intl: { labelKey: "common.intlBaseline", className: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
    frontier: { labelKey: "common.frontier", className: "bg-violet-500/10 text-violet-400" },
    mainstream: { labelKey: "common.mainstream", className: "bg-blue-500/10 text-blue-400" },
  };

  const badge = badgeConfig[variant];

  const colVisibilityClass = (h: (typeof HEADERS)[number]) =>
    cn(!h.mobile && "hidden sm:table-cell", !h.desktop && "hidden md:table-cell");

  return (
    <TableRow className={rowStyles[variant]}>
      <TableCell className="max-w-[240px]">
        <Link
          href={`/product/${model.id}`}
          className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group truncate"
        >
          {rank !== undefined && (
            <span className="text-text-muted text-xs mr-1">#{rank}</span>
          )}
          {model.name}
          <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
        </Link>
        <div className="flex gap-1 mt-1">
          <Badge variant="secondary" className={`text-[10px] py-0 px-1.5 ${badge.className}`}>
            {t(badge.labelKey)}
          </Badge>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] py-0 px-1.5",
              model.type === "开源"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-300"
            )}
          >
            {t(model.type === "开源" ? "common.open" : "common.closed")}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="text-text-secondary hidden sm:table-cell">
        {model.company}
      </TableCell>
      <TableCell
        className={cn(
          "hidden lg:table-cell text-sm",
          sortKey === "date" ? "font-semibold text-text-primary" : "text-text-secondary"
        )}
      >
        {model.raw.release_date ?? "—"}
      </TableCell>
      {HEADERS.map((h) => (
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

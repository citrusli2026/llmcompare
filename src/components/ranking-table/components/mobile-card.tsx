"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import { HEADERS, MOBILE_METRIC_ORDER } from "../utils/constants";
import { getMobileCostDisplay, renderers } from "../utils/renderers";
import { getRawValue, type SortKey } from "../hooks/use-sorting";
import { getScoreColor } from "../utils/color-utils";

interface MobileCardProps {
  model: ModelWithScores;
  rank?: number;
  variant: "intl" | "frontier" | "mainstream";
  percentiles: Record<string, { p25: number; p50: number; p75: number } | null>;
}

export function MobileCard({ model, rank, variant, percentiles }: MobileCardProps) {
  const { t } = useTranslation();

  const variantStyles = {
    intl: "border-t-2 border-t-amber-400/40 bg-amber-500/[0.06] dark:bg-amber-500/[0.08]",
    frontier: "bg-violet-500/[0.06] dark:bg-violet-500/[0.08]",
    mainstream: "bg-surface-card",
  };

  const badgeConfig = {
    intl: { labelKey: "common.intlBaseline", className: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
    frontier: { labelKey: "common.frontier", className: "bg-violet-500/10 text-violet-400" },
    mainstream: { labelKey: "common.mainstream", className: "bg-blue-500/10 text-blue-400" },
  };

  const badge = badgeConfig[variant];

  const renderMetric = (key: string) => {
    if (key === "cost") {
      return getMobileCostDisplay(model);
    }
    return renderers[key as keyof typeof renderers](model);
  };

  return (
    <div className={`rounded-xl border border-surface-border p-3 ${variantStyles[variant]}`}>
      <div className="mb-2">
        <Link
          href={`/product/${model.id}`}
          className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group max-w-full"
        >
          {rank !== undefined && <span className="text-text-muted text-xs mr-1">#{rank}</span>}
          <span className="truncate">{model.name}</span>
          <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-1 mb-2">
        <span className="text-xs text-text-secondary">{model.company}</span>
        {model.raw.release_date && (
          <span className="text-[10px] text-text-muted">· {model.raw.release_date}</span>
        )}
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

      <div className="grid grid-cols-3 gap-1 mb-2">
        {MOBILE_METRIC_ORDER.map((key) => {
          const h = HEADERS.find((x) => x.key === key)!;
          const rawVal = getRawValue(model, key as SortKey);
          return (
            <div key={h.key} className="rounded-md bg-surface-hover px-1.5 py-1">
              <div className="flex items-center gap-0.5 mb-0.5">
                <h.icon className="h-2.5 w-2.5 text-text-muted" />
                <span className="text-[9px] text-text-muted truncate">{t(h.labelKey)}</span>
              </div>
              <div
                className={cn(
                  "text-[11px] font-medium tabular-nums leading-tight",
                  h.key !== "tokens" && getScoreColor(rawVal, key as SortKey, percentiles)
                )}
              >
                {renderMetric(key)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

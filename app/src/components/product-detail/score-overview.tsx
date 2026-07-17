"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { type ModelWithScores, getAllModels } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { computePercentiles } from "@/components/ranking-table/utils";

function MetricBar({
  label,
  value,
  maxValue = 100,
  unit = "",
  colorPercentiles,
}: {
  label: string;
  value: number | null;
  maxValue?: number;
  unit?: string;
  colorPercentiles?: { p25: number; p50: number; p75: number } | null;
}) {
  const displayVal = value == null ? "—" : value % 1 === 0 ? String(value) : value.toFixed(1);
  const pct = value == null ? 0 : Math.min((value / maxValue) * 100, 100);
  const fillPct = Math.min(pct, 100);

  // 与列表页 ScoreBar 统一：按全局相对分位染色，而非绝对阈值
  const color =
    value == null || !colorPercentiles
      ? "bg-surface-border"
      : value >= colorPercentiles.p75
        ? "bg-accent-lime"
        : value >= colorPercentiles.p50
          ? "bg-accent-violet"
          : value >= colorPercentiles.p25
            ? "bg-accent-coral"
            : "bg-text-muted";

  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
      <span className="text-xs text-text-secondary w-16 sm:w-20 shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-surface-border overflow-hidden min-w-0">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-text-primary min-w-[3.5rem] sm:min-w-[5rem] text-right tabular-nums shrink-0 flex items-center justify-end gap-0.5 whitespace-nowrap">
        {displayVal}{unit}
      </span>
    </div>
  );
}

interface ScoreOverviewProps {
  model: ModelWithScores;
}

export function ScoreOverview({ model }: ScoreOverviewProps) {
  const { t } = useTranslation();
  const r = model.raw;

  // Compute dynamic max values and global percentiles from the full dataset
  // for consistent scaling and coloring across pages.
  const { maxSpeed, percentiles } = useMemo(() => {
    const all = getAllModels();

    // Speed: sort and use P90 (clips top ~3 outliers: 418, 420, 224)
    const speeds = all
      .map((m) => m.raw.median_tps)
      .filter((v): v is number => v != null)
      .sort((a, b) => a - b);
    const speedCap = speeds.length > 0
      ? speeds[Math.min(Math.floor(speeds.length * 0.90), speeds.length - 1)]
      : 1;

    return {
      maxSpeed: Math.max(speedCap, 1),
      percentiles: {
        intelligence: computePercentiles(all.map((m) => m.raw.intelligence)),
        coding: computePercentiles(all.map((m) => m.raw.coding)),
        agentic: computePercentiles(all.map((m) => m.raw.agentic)),
        speed: computePercentiles(speeds),
      },
    };
  }, []);

  const metrics: { label: string; value: number | null; maxValue?: number; unit?: string; percentileKey?: "intelligence" | "coding" | "agentic" | "speed" }[] = [
    {
      label: t("source.intelligenceLabel"),
      value: r.intelligence,
      percentileKey: "intelligence",
    },
    {
      label: t("source.codingLabel"),
      value: r.coding,
      percentileKey: "coding",
    },
    {
      label: t("source.agenticLabel"),
      value: r.agentic,
      percentileKey: "agentic",
    },
    {
      label: t("source.speedLabel"),
      value: r.median_tps,
      maxValue: maxSpeed,
      unit: " t/s",
      percentileKey: "speed",
    },
  ];

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-text-muted" />
        {t("source.scoreOverview")}
      </h3>
      <div className="space-y-3">
        {metrics.map((m) => (
          <MetricBar
            key={m.label}
            label={m.label}
            value={m.value}
            maxValue={m.maxValue ?? 100}
            unit={m.unit ?? ""}
            colorPercentiles={m.percentileKey ? percentiles[m.percentileKey] : null}
          />
        ))}
      </div>
    </div>
  );
}

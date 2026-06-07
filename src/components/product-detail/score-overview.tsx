"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { type ModelWithScores, getAllModelsUnfiltered } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function MetricBar({
  label,
  value,
  maxValue = 100,
  unit = "",
}: {
  label: string;
  value: number | null;
  maxValue?: number;
  unit?: string;
}) {
  const displayVal = value == null ? "—" : value % 1 === 0 ? String(value) : value.toFixed(1);
  const pct = value == null ? 0 : Math.min((value / maxValue) * 100, 100);
  const fillPct = Math.min(pct, 100);

  const color =
    value == null
      ? "bg-surface-border"
      : fillPct >= 80
        ? "bg-accent-lime"
        : fillPct >= 65
          ? "bg-accent-violet"
          : fillPct >= 50
            ? "bg-accent-coral"
            : "bg-text-muted";

  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-xs text-text-secondary w-20 shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-surface-border overflow-hidden min-w-0">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <span className="text-sm font-medium text-text-primary min-w-[5rem] text-right tabular-nums shrink-0 flex items-center justify-end gap-0.5 whitespace-nowrap">
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

  // Compute dynamic max values from the full dataset for consistent scaling
  // Use percentile cap to prevent extreme outliers from compressing other bars
  const { maxSpeed } = useMemo(() => {
    const all = getAllModelsUnfiltered();

    // Speed: sort and use P90 (clips top ~3 outliers: 418, 420, 224)
    const speeds = all
      .map((m) => m.raw.median_tps)
      .filter((v): v is number => v != null)
      .sort((a, b) => a - b);
    const speedCap = speeds.length > 0
      ? speeds[Math.min(Math.floor(speeds.length * 0.90), speeds.length - 1)]
      : 1;

    return { maxSpeed: Math.max(speedCap, 1) };
  }, []);

  const metrics: { label: string; value: number | null; maxValue?: number; unit?: string }[] = [
    {
      label: t("source.intelligenceLabel"),
      value: r.intelligence,
    },
    {
      label: t("source.codingLabel"),
      value: r.coding,
    },
    {
      label: t("source.agenticLabel"),
      value: r.agentic,
    },
    {
      label: t("source.speedLabel"),
      value: r.median_tps,
      maxValue: maxSpeed,
      unit: " t/s",
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
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import { type ModelWithScores } from "@/lib/scoring";
import { type SortKey, type Percentiles, type ColoredKey } from "./types";

export const COLOR_BY_BUCKET = {
  emerald: "text-accent-lime",
  blue: "text-accent-violet",
  amber: "text-accent-coral",
  red: "text-accent-fuchsia",
  dim: "text-text-dim",
} as const;

// cost 是反向（数字越小越好），其他正向
export const ASCENDING: Record<ColoredKey, boolean> = {
  intelligence: true, coding: true, agentic: true, arenaCode: true, cost: false, date: true, tokens: true,
};

export function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

// 颜色由列在当前榜单中的相对分位决定，而非绝对分数。
// AA Intelligence Index 国内模型集中在 30–55，绝对阈值会让全表挤进同一档。
export function computePercentiles(values: (number | null | undefined)[]): Percentiles | null {
  const valid = values
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .sort((a, b) => a - b);
  if (valid.length < 2) return null;
  return { p25: quantile(valid, 0.25), p50: quantile(valid, 0.5), p75: quantile(valid, 0.75) };
}

export function bucketByPercentile(val: number, p: Percentiles, ascending: boolean): keyof typeof COLOR_BY_BUCKET {
  if (ascending) {
    if (val > p.p75) return "emerald";
    if (val > p.p50) return "blue";
    if (val > p.p25) return "amber";
    return "red";
  }
  if (val < p.p25) return "emerald";
  if (val < p.p50) return "blue";
  if (val < p.p75) return "amber";
  return "red";
}

export function getRawValue(model: ModelWithScores, key: SortKey): number | null {
  switch (key) {
    case "intelligence": return model.raw.intelligence;
    case "coding": return model.raw.coding ?? null;
    case "agentic": return model.raw.agentic ?? null;
    case "arenaCode": return model.raw.arena_code ?? null;
    case "cost": return model.raw.openrouter_pricing?.completion ?? null;
    case "tokens": return model.raw.arena_votes ?? null;
    case "date": {
      const d = model.raw.release_date;
      if (!d) return null;
      const ts = Date.parse(d);
      return isNaN(ts) ? null : ts;
    }
  }
}

export function getScoreColor(
  val: number | null | undefined,
  key: SortKey,
  percentiles: Record<ColoredKey, Percentiles | null>
): string {
  if (val == null) return COLOR_BY_BUCKET.dim;
  const p = percentiles[key];
  if (!p) return COLOR_BY_BUCKET.dim;
  return COLOR_BY_BUCKET[bucketByPercentile(val, p, ASCENDING[key])];
}

export function formatScore(val: number | null | undefined): React.ReactNode {
  if (val == null) return <span className="text-text-dim text-xs">—</span>;
  return val % 1 === 0 ? val : val.toFixed(1);
}

export function ScoreBar({ value, maxValue = 100, colorPercentiles }: {
  value: number | null;
  maxValue?: number;
  colorPercentiles?: { p25: number; p50: number; p75: number } | null;
}) {
  if (value == null) return <span className="text-text-dim text-xs">—</span>;
  const pct = Math.min((value / maxValue) * 100, 100);
  // 按当前列表排名染色：p75=green, p50=violet, p25=coral, below=gray
  const color = colorPercentiles != null
    ? value >= colorPercentiles.p75 ? "bg-accent-lime"
      : value >= colorPercentiles.p50 ? "bg-accent-violet"
      : value >= colorPercentiles.p25 ? "bg-accent-coral"
      : "bg-text-muted"
    : pct >= 80 ? "bg-accent-lime"
      : pct >= 65 ? "bg-accent-violet"
      : pct >= 50 ? "bg-accent-coral"
      : "bg-text-muted";
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-text-primary w-10 text-right tabular-nums">{value.toFixed(1)}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-border overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

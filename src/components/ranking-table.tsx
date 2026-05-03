"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Zap, DollarSign, Brain, Code, Bot, ArrowUpRight, Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface RankingTableProps {
  models: ModelWithScores[];
}

type ScoreKey = "intelligence" | "coding" | "agentic" | "speed" | "cost" | "tokens";
type SortKey = ScoreKey | "date";

const HEADERS: { key: ScoreKey; labelKey: string; icon: React.ComponentType<any>; mobile: boolean; desktop: boolean }[] = [
  { key: "intelligence", labelKey: "models.colIntelligence", icon: Brain, mobile: true, desktop: true },
  { key: "coding", labelKey: "models.colCoding", icon: Code, mobile: false, desktop: true },
  { key: "agentic", labelKey: "models.colAgentic", icon: Bot, mobile: false, desktop: true },
  { key: "speed", labelKey: "models.colSpeed", icon: Zap, mobile: false, desktop: true },
  { key: "cost", labelKey: "models.colCost", icon: DollarSign, mobile: false, desktop: true },
  { key: "tokens", labelKey: "models.colTokens", icon: TrendingUp, mobile: false, desktop: true },
];

// 颜色由列在当前榜单中的相对分位决定,而非绝对分数
// AA Intelligence Index 国内模型集中在 30-55,绝对阈值会让全表挤进同一档
type Percentiles = { p25: number; p50: number; p75: number };
type ColoredKey = "intelligence" | "coding" | "agentic" | "speed" | "cost";

const COLOR_BY_BUCKET = {
  emerald: "text-emerald-500 dark:text-emerald-400",
  blue: "text-blue-500 dark:text-blue-300",
  amber: "text-amber-500 dark:text-amber-300",
  red: "text-red-500 dark:text-red-400",
  dim: "text-text-dim",
} as const;

// cost 是反向(数字越小越好),其他正向
const ASCENDING: Record<ColoredKey, boolean> = {
  intelligence: true, coding: true, agentic: true, speed: true, cost: false,
};

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

function computePercentiles(values: (number | null | undefined)[]): Percentiles | null {
  const valid = values
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .sort((a, b) => a - b);
  if (valid.length < 2) return null;
  return { p25: quantile(valid, 0.25), p50: quantile(valid, 0.5), p75: quantile(valid, 0.75) };
}

function bucketByPercentile(val: number, p: Percentiles, ascending: boolean): keyof typeof COLOR_BY_BUCKET {
  if (ascending) {
    if (val >= p.p75) return "emerald";
    if (val >= p.p50) return "blue";
    if (val >= p.p25) return "amber";
    return "red";
  }
  if (val <= p.p25) return "emerald";
  if (val <= p.p50) return "blue";
  if (val <= p.p75) return "amber";
  return "red";
}

export function RankingTable({ models }: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDesc, setSortDesc] = useState(true);
  const { t } = useTranslation();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) { setSortDesc(!sortDesc); }
    else if (sortKey === null && key === "date") { setSortKey(key); setSortDesc(false); }
    else { setSortKey(key); setSortDesc(true); }
  };

  const getRawValue = (model: ModelWithScores, key: SortKey): number | null => {
    switch (key) {
      case "intelligence": return model.raw.intelligence;
      case "coding": return model.raw.coding ?? null;
      case "agentic": return model.raw.agentic ?? null;
      case "speed": return model.raw.median_tps ?? null;
      case "cost": return model.raw.openrouter_pricing?.prompt ?? null;
      case "tokens": return model.raw.openrouter_weekly_tokens ?? null;
      case "date": return null; // handled in sortedModels
    }
  };

  const sortedModels = [...models].sort((a, b) => {
    if (sortKey === null || sortKey === "date") {
      const aDate = a.raw.release_date ?? "";
      const bDate = b.raw.release_date ?? "";
      // 空日期始终排到最后
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return sortDesc ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
    }
    const aVal = getRawValue(a, sortKey);
    const bVal = getRawValue(b, sortKey);
    // 缺数据的行不参与排序,统一沉底
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    return sortDesc ? bVal - aVal : aVal - bVal;
  });

  const percentiles = useMemo<Record<ColoredKey, Percentiles | null>>(() => ({
    intelligence: computePercentiles(models.map((m) => m.raw.intelligence)),
    coding: computePercentiles(models.map((m) => m.raw.coding)),
    agentic: computePercentiles(models.map((m) => m.raw.agentic)),
    speed: computePercentiles(models.map((m) => m.raw.median_tps)),
    // cost 仅用 OR 价,与 getCostDisplay 一致(无 OR 价的行展示 `—`,不染色)
    cost: computePercentiles(models.map((m) => m.raw.openrouter_pricing?.prompt ?? null)),
  }), [models]);

  const formatScore = (val: number | null | undefined) => {
    if (val == null) return <span className="text-text-dim text-xs">—</span>;
    return val % 1 === 0 ? val : val.toFixed(1);
  };

  const getScoreColor = (val: number | null | undefined, key: SortKey): string => {
    if (val == null) return COLOR_BY_BUCKET.dim;
    if (key === "date" || key === "tokens") return "";
    const p = percentiles[key];
    if (!p) return COLOR_BY_BUCKET.dim;
    return COLOR_BY_BUCKET[bucketByPercentile(val, p, ASCENDING[key])];
  };

  const getSpeedDisplay = (model: ModelWithScores): React.ReactNode => {
    if (model.raw.median_tps != null) {
      return <span>{model.raw.median_tps.toFixed(1)} <span className="text-text-secondary text-[10px]">TPS</span></span>;
    }
    return <span className="text-text-dim text-xs">—</span>;
  };

  const getTokensDisplay = (model: ModelWithScores): React.ReactNode => {
    const val = model.raw.openrouter_weekly_tokens;
    if (val == null) return <span className="text-text-dim text-xs">—</span>;
    if (val >= 1e12) return <span>{(val / 1e12).toFixed(2)}<span className="text-text-secondary text-[10px]">T</span></span>;
    if (val >= 1e9) return <span>{(val / 1e9).toFixed(1)}<span className="text-text-secondary text-[10px]">B</span></span>;
    if (val >= 1e6) return <span>{(val / 1e6).toFixed(1)}<span className="text-text-secondary text-[10px]">M</span></span>;
    return <span>{val.toLocaleString()}</span>;
  };

  const getCostDisplay = (model: ModelWithScores): React.ReactNode => {
    if (model.raw.openrouter_pricing != null) {
      const p = model.raw.openrouter_pricing;
      return <span>${p.prompt}<span className="text-text-secondary text-[10px]">/</span>${p.completion}<span className="text-text-secondary text-[10px]">/M</span></span>;
    }
    return <span className="text-text-dim text-xs">—</span>;
  };

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-surface-border hover:bg-transparent">
              <TableHead className="text-text-muted">{t("table.model")}</TableHead>
              <TableHead className="text-text-muted hidden sm:table-cell">{t("table.company")}</TableHead>

              <TableHead
                className={cn(
                  "cursor-pointer text-text-muted hover:text-text-primary hidden lg:table-cell",
                  sortKey === "date" && "font-semibold text-text-primary"
                )}
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t("table.date")}
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </TableHead>
              {HEADERS.map(h => (
                <TableHead
                  key={h.key}
                  className={cn(
                    "cursor-pointer text-text-muted hover:text-text-primary",
                    !h.mobile && "hidden sm:table-cell",
                    !h.desktop && "hidden md:table-cell",
                    !h.mobile && !h.desktop && "hidden lg:table-cell"
                  )}
                  onClick={() => handleSort(h.key)}
                >
                  <div className="flex items-center gap-1">
                    <h.icon className="h-3 w-3" />
                    {t(h.labelKey)}
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedModels.map((model) => {
              return (
                <TableRow key={model.id} className="border-gray-300 dark:border-white/25 hover:bg-surface-hover transition-colors">
                  <TableCell className="max-w-[240px]">
                    <Link href={`/product/${model.id}`} className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group truncate">
                      {model.name}
                      <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
                    </Link>
                    <div className="flex gap-1 mt-1">
                      {model.flags.frontier && (
                        <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-400 py-0 px-1.5">{t("common.frontier")}</Badge>
                      )}
                      {!model.flags.frontier && (
                        <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 py-0 px-1.5">{t("common.mainstream")}</Badge>
                      )}
                      <Badge variant="secondary"
                        className={cn("text-[10px] py-0 px-1.5", model.type === "开源"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-300")}>
                        {t(model.type === "开源" ? "common.open" : "common.closed")}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-text-secondary hidden sm:table-cell">{model.company}</TableCell>
                  <TableCell className={cn("hidden lg:table-cell text-sm", sortKey === "date" ? "font-semibold text-text-primary" : "text-text-secondary")}>
                    {model.raw.release_date ?? "—"}
                  </TableCell>
                  {HEADERS.map(h => (
                    <TableCell key={h.key}
                      className={cn(
                        "text-sm",
                        !h.mobile && "hidden sm:table-cell",
                        !h.desktop && "hidden md:table-cell",
                        !h.mobile && !h.desktop && "hidden lg:table-cell",
                        h.key === sortKey ? "font-semibold" : "",
                        h.key !== "tokens" && getScoreColor(getRawValue(model, h.key), h.key)
                      )}>
                      {h.key === "cost" ? getCostDisplay(model) : h.key === "speed" ? getSpeedDisplay(model) : h.key === "tokens" ? getTokensDisplay(model) : formatScore(getRawValue(model, h.key))}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

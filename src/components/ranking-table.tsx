"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown, Trophy, DollarSign, Brain, Code, Bot, ArrowUpRight, Calendar, TrendingUp } from "lucide-react";
import { cn, formatTokenCount } from "@/lib/utils";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface RankingTableProps {
  models: ModelWithScores[];
}

type ScoreKey = "intelligence" | "coding" | "agentic" | "arenaCode" | "cost" | "tokens";
type SortKey = ScoreKey | "date";

const HEADERS: { key: ScoreKey; labelKey: string; icon: React.ComponentType<{ className?: string }>; mobile: boolean; desktop: boolean }[] = [
  { key: "intelligence", labelKey: "models.colIntelligence", icon: Brain, mobile: true, desktop: true },
  { key: "coding", labelKey: "models.colCoding", icon: Code, mobile: false, desktop: true },
  { key: "agentic", labelKey: "models.colAgentic", icon: Bot, mobile: false, desktop: true },
  { key: "arenaCode", labelKey: "models.colArenaCode", icon: Trophy, mobile: false, desktop: true },
  { key: "cost", labelKey: "models.colCost", icon: DollarSign, mobile: false, desktop: true },
  { key: "tokens", labelKey: "models.colTokens", icon: TrendingUp, mobile: false, desktop: true },
];

// 颜色由列在当前榜单中的相对分位决定,而非绝对分数
// AA Intelligence Index 国内模型集中在 30-55,绝对阈值会让全表挤进同一档
type Percentiles = { p25: number; p50: number; p75: number };
type ColoredKey = "intelligence" | "coding" | "agentic" | "arenaCode" | "cost";

const COLOR_BY_BUCKET = {
  emerald: "text-emerald-500 dark:text-emerald-400",
  blue: "text-blue-500 dark:text-blue-300",
  amber: "text-amber-500 dark:text-amber-300",
  red: "text-red-500 dark:text-red-400",
  dim: "text-text-dim",
} as const;

// cost 是反向(数字越小越好),其他正向
const ASCENDING: Record<ColoredKey, boolean> = {
  intelligence: true, coding: true, agentic: true, arenaCode: true, cost: false,
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
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDesc, setSortDesc] = useState(true);
  const { t } = useTranslation();

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
      return;
    }
    setSortKey(key);
    // 切换到新列默认降序
    setSortDesc(true);
  };

  const getRawValue = (model: ModelWithScores, key: SortKey): number | null => {
    switch (key) {
      case "intelligence": return model.raw.intelligence;
      case "coding": return model.raw.coding ?? null;
      case "agentic": return model.raw.agentic ?? null;
      case "arenaCode": return model.raw.arena_code ?? null;
      case "cost": return model.raw.openrouter_pricing?.completion ?? null;
      case "tokens": return model.raw.openrouter_weekly_tokens ?? null;
      case "date": return null; // handled in sortedModels
    }
  };

  // 分离三组模型：国际标杆、国内前沿、国内主力，各自内部排序，组间不混排
  const intlModels = useMemo(() => models.filter((m) => m.raw.isInternational), [models]);
  const frontierModels = useMemo(() => models.filter((m) => !m.raw.isInternational && m.flags.frontier), [models]);
  const mainstreamModels = useMemo(() => models.filter((m) => !m.raw.isInternational && !m.flags.frontier), [models]);

  const sortFn = (a: ModelWithScores, b: ModelWithScores) => {
    if (sortKey === "date") {
      const aDate = a.raw.release_date ?? "";
      const bDate = b.raw.release_date ?? "";
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return sortDesc ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
    }
    const aVal = getRawValue(a, sortKey);
    const bVal = getRawValue(b, sortKey);
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    return sortDesc ? bVal - aVal : aVal - bVal;
  };

  const sortedIntl = useMemo(() => [...intlModels].sort(sortFn), [intlModels, sortKey, sortDesc]);
  const sortedFrontier = useMemo(() => [...frontierModels].sort(sortFn), [frontierModels, sortKey, sortDesc]);
  const sortedMainstream = useMemo(() => [...mainstreamModels].sort(sortFn), [mainstreamModels, sortKey, sortDesc]);

  const percentiles = useMemo<Record<ColoredKey, Percentiles | null>>(() => ({
    intelligence: computePercentiles(models.map((m) => m.raw.intelligence)),
    coding: computePercentiles(models.map((m) => m.raw.coding)),
    agentic: computePercentiles(models.map((m) => m.raw.agentic)),
    arenaCode: computePercentiles(models.map((m) => m.raw.arena_code)),
    // cost 用 OR completion 价,与移动端展示一致;桌面双值列 prompt/completion 高度相关,排序结果近似
    cost: computePercentiles(models.map((m) => m.raw.openrouter_pricing?.completion ?? null)),
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

  const getArenaCodeDisplay = (model: ModelWithScores): React.ReactNode => {
    if (model.raw.arena_code != null) {
      return <span>{model.raw.arena_code} <span className="text-text-secondary text-[10px]">ELO</span></span>;
    }
    return <span className="text-text-dim text-xs">—</span>;
  };

  const getTokensDisplay = (model: ModelWithScores): React.ReactNode => {
    const val = model.raw.openrouter_weekly_tokens;
    if (val == null) return <span className="text-text-dim text-xs">—</span>;
    const { value, unit } = formatTokenCount(val);
    return <span>{value}{unit && <span className="text-text-secondary text-[10px]">{unit}</span>}</span>;
  };

  const getCostDisplay = (model: ModelWithScores): React.ReactNode => {
    if (model.raw.openrouter_pricing != null) {
      const p = model.raw.openrouter_pricing;
      return <span>${p.prompt}<span className="text-text-secondary text-[10px]">/</span>${p.completion}<span className="text-text-secondary text-[10px]">/M</span></span>;
    }
    return <span className="text-text-dim text-xs">—</span>;
  };

  const renderers: Record<ScoreKey, (m: ModelWithScores) => React.ReactNode> = {
    intelligence: (m) => formatScore(m.raw.intelligence),
    coding: (m) => formatScore(m.raw.coding),
    agentic: (m) => formatScore(m.raw.agentic),
    arenaCode: getArenaCodeDisplay,
    cost: getCostDisplay,
    tokens: getTokensDisplay,
  };

  // 移动端排序处理
  const handleMobileSortChange = (value: string) => {
    if (value === "") {
      setSortKey("date");
      setSortDesc(true);
    } else if (value === "date") {
      setSortKey("date");
      setSortDesc(true);
    } else {
      setSortKey(value as ScoreKey);
      setSortDesc(true);
    }
  };

  // 移动端渲染单个指标
  const renderMetric = (model: ModelWithScores, key: ScoreKey) => {
    if (key === "cost") {
      if (model.raw.openrouter_pricing != null) {
        return <span>${model.raw.openrouter_pricing.completion}<span className="text-text-secondary text-[10px]">/M</span></span>;
      }
      return <span className="text-text-dim text-xs">—</span>;
    }
    return renderers[key](model);
  };

  // 移动端排序选项 — 与卡片实际展示字段对齐,避免选了排序看不到对应数值
  const MOBILE_SORT_OPTIONS: { key: SortKey | ""; labelKey: string }[] = [
    { key: "", labelKey: "models.sortBy" },
    { key: "intelligence", labelKey: "models.colIntelligence" },
    { key: "cost", labelKey: "models.colCost" },
    { key: "tokens", labelKey: "models.colTokens" },
    { key: "date", labelKey: "table.date" },
  ];

  // 移动端卡片展示的 3 个指标(单行) — 与排序选项对齐
  const MOBILE_METRIC_ORDER: ScoreKey[] = ["intelligence", "cost", "tokens"];

  const colVisibilityClass = (h: typeof HEADERS[number]) => cn(
    !h.mobile && "hidden sm:table-cell",
    !h.desktop && "hidden md:table-cell",
    !h.mobile && !h.desktop && "hidden lg:table-cell",
  );

  return (
    <div className="space-y-4">
      {/* 移动端排序控制 */}
      <div className="block sm:hidden">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={sortKey ?? ""}
              onChange={(e) => handleMobileSortChange(e.target.value)}
              className="w-full appearance-none rounded-lg border border-surface-border bg-surface-card px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
            >
              {MOBILE_SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>{t(opt.labelKey)}</option>
              ))}
            </select>
            <ArrowUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          </div>
          {sortKey && (
            <button
              onClick={() => setSortDesc(!sortDesc)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-card text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              aria-label={sortDesc ? t("models.sortDesc") : t("models.sortAsc")}
            >
              {sortDesc ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* 桌面端表格 */}
      <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden hidden sm:block">
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
                    className={cn("cursor-pointer text-text-muted hover:text-text-primary", colVisibilityClass(h))}
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
              {/* 国际标杆 - 固定顶部，不参与排序 */}
              {sortedIntl.map((model) => (
                <TableRow key={model.id} className="border-gray-300 dark:border-white/25 border-t-2 border-t-amber-400/50 bg-amber-500/[0.06] dark:bg-amber-500/[0.08]">
                  <TableCell className="max-w-[240px]">
                    <Link href={`/product/${model.id}`} className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group truncate">
                      {model.name}
                      <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
                    </Link>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-300 py-0 px-1.5">{t("common.intlBaseline")}</Badge>
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
                        colVisibilityClass(h),
                        h.key === sortKey ? "font-semibold" : "",
                        h.key !== "tokens" && getScoreColor(getRawValue(model, h.key), h.key)
                      )}>
                      {renderers[h.key](model)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {/* 国内前沿 */}
              {sortedFrontier.map((model, idx) => (
                <TableRow key={model.id} className={cn(
                  "border-gray-300 dark:border-white/25 hover:bg-surface-hover transition-colors",
                  "bg-violet-500/[0.03] dark:bg-violet-500/[0.04]"
                )}>
                  <TableCell className="max-w-[240px]">
                    <Link href={`/product/${model.id}`} className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group truncate">
                      <span className="text-text-muted text-xs mr-1">#{idx + 1}</span>
                      {model.name}
                      <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
                    </Link>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-400 py-0 px-1.5">{t("common.frontier")}</Badge>
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
                        colVisibilityClass(h),
                        h.key === sortKey ? "font-semibold" : "",
                        h.key !== "tokens" && getScoreColor(getRawValue(model, h.key), h.key)
                      )}>
                      {renderers[h.key](model)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {/* 国内主力 */}
              {sortedMainstream.map((model, idx) => (
                <TableRow key={model.id} className="border-gray-300 dark:border-white/25 hover:bg-surface-hover transition-colors">
                  <TableCell className="max-w-[240px]">
                    <Link href={`/product/${model.id}`} className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group truncate">
                      <span className="text-text-muted text-xs mr-1">#{sortedFrontier.length + idx + 1}</span>
                      {model.name}
                      <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
                    </Link>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 py-0 px-1.5">{t("common.mainstream")}</Badge>
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
                        colVisibilityClass(h),
                        h.key === sortKey ? "font-semibold" : "",
                        h.key !== "tokens" && getScoreColor(getRawValue(model, h.key), h.key)
                      )}>
                      {renderers[h.key](model)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 移动端卡片列表 */}
      <div className="block sm:hidden space-y-2">
        {/* 国际标杆 — 移动端只展示 1 个 */}
        {sortedIntl.slice(0, 1).map((model) => (
          <div
            key={model.id}
            className="rounded-xl border border-surface-border p-3 border-t-2 border-t-amber-400/40 bg-amber-500/[0.06] dark:bg-amber-500/[0.08]"
          >
            {/* 模型名 */}
            <div className="mb-2">
              <Link
                href={`/product/${model.id}`}
                className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group max-w-full"
              >
                <span className="truncate">{model.name}</span>
                <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
              </Link>
            </div>

            {/* 元信息行：公司 · 日期 · 标签 */}
            <div className="flex flex-wrap items-center gap-1 mb-2">
              <span className="text-xs text-text-secondary">{model.company}</span>
              {model.raw.release_date && (
                <span className="text-[10px] text-text-muted">· {model.raw.release_date}</span>
              )}
              <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-300 py-0 px-1.5">{t("common.intlBaseline")}</Badge>
              <Badge variant="secondary"
                className={cn("text-[10px] py-0 px-1.5", model.type === "开源"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-300")}>
                {t(model.type === "开源" ? "common.open" : "common.closed")}
              </Badge>
            </div>

            {/* 指标网格 — 单行 3 列，紧凑布局 */}
            <div className="grid grid-cols-3 gap-1 mb-2">
              {MOBILE_METRIC_ORDER.map((key) => {
                const h = HEADERS.find((x) => x.key === key)!;
                return (
                  <div key={h.key} className="rounded-md bg-surface-hover px-1.5 py-1">
                    <div className="flex items-center gap-0.5 mb-0.5">
                      <h.icon className="h-2.5 w-2.5 text-text-muted" />
                      <span className="text-[9px] text-text-muted truncate">{t(h.labelKey)}</span>
                    </div>
                    <div className={cn(
                      "text-[11px] font-medium tabular-nums leading-tight",
                      h.key !== "tokens" && getScoreColor(getRawValue(model, h.key), h.key)
                    )}>
                      {renderMetric(model, h.key)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {/* 国内前沿 */}
        {sortedFrontier.map((model, idx) => (
          <div
            key={model.id}
            className="rounded-xl border border-surface-border p-3 bg-violet-500/[0.06] dark:bg-violet-500/[0.08]"
          >
            {/* 模型名 */}
            <div className="mb-2">
              <Link
                href={`/product/${model.id}`}
                className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group max-w-full"
              >
                <span className="text-text-muted text-xs mr-1">#{idx + 1}</span>
                <span className="truncate">{model.name}</span>
                <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
              </Link>
            </div>

            {/* 元信息行：公司 · 日期 · 标签 */}
            <div className="flex flex-wrap items-center gap-1 mb-2">
              <span className="text-xs text-text-secondary">{model.company}</span>
              {model.raw.release_date && (
                <span className="text-[10px] text-text-muted">· {model.raw.release_date}</span>
              )}
              <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-400 py-0 px-1.5">{t("common.frontier")}</Badge>
              <Badge variant="secondary"
                className={cn("text-[10px] py-0 px-1.5", model.type === "开源"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-300")}>
                {t(model.type === "开源" ? "common.open" : "common.closed")}
              </Badge>
            </div>

            {/* 指标网格 — 单行 3 列，紧凑布局 */}
            <div className="grid grid-cols-3 gap-1 mb-2">
              {MOBILE_METRIC_ORDER.map((key) => {
                const h = HEADERS.find((x) => x.key === key)!;
                return (
                  <div key={h.key} className="rounded-md bg-surface-hover px-1.5 py-1">
                    <div className="flex items-center gap-0.5 mb-0.5">
                      <h.icon className="h-2.5 w-2.5 text-text-muted" />
                      <span className="text-[9px] text-text-muted truncate">{t(h.labelKey)}</span>
                    </div>
                    <div className={cn(
                      "text-[11px] font-medium tabular-nums leading-tight",
                      h.key !== "tokens" && getScoreColor(getRawValue(model, h.key), h.key)
                    )}>
                      {renderMetric(model, h.key)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {/* 国内主力 */}
        {sortedMainstream.map((model, idx) => (
          <div
            key={model.id}
            className="rounded-xl border border-surface-border bg-surface-card p-3"
          >
            {/* 模型名 */}
            <div className="mb-2">
              <Link
                href={`/product/${model.id}`}
                className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group max-w-full"
              >
                <span className="text-text-muted text-xs mr-1">#{sortedFrontier.length + idx + 1}</span>
                <span className="truncate">{model.name}</span>
                <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
              </Link>
            </div>

            {/* 元信息行：公司 · 日期 · 标签 */}
            <div className="flex flex-wrap items-center gap-1 mb-2">
              <span className="text-xs text-text-secondary">{model.company}</span>
              {model.raw.release_date && (
                <span className="text-[10px] text-text-muted">· {model.raw.release_date}</span>
              )}
              <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 py-0 px-1.5">{t("common.mainstream")}</Badge>
              <Badge variant="secondary"
                className={cn("text-[10px] py-0 px-1.5", model.type === "开源"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-300")}>
                {t(model.type === "开源" ? "common.open" : "common.closed")}
              </Badge>
            </div>

            {/* 指标网格 — 单行 3 列，紧凑布局 */}
            <div className="grid grid-cols-3 gap-1 mb-2">
              {MOBILE_METRIC_ORDER.map((key) => {
                const h = HEADERS.find((x) => x.key === key)!;
                return (
                  <div key={h.key} className="rounded-md bg-surface-hover px-1.5 py-1">
                    <div className="flex items-center gap-0.5 mb-0.5">
                      <h.icon className="h-2.5 w-2.5 text-text-muted" />
                      <span className="text-[9px] text-text-muted truncate">{t(h.labelKey)}</span>
                    </div>
                    <div className={cn(
                      "text-[11px] font-medium tabular-nums leading-tight",
                      h.key !== "tokens" && getScoreColor(getRawValue(model, h.key), h.key)
                    )}>
                      {renderMetric(model, h.key)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

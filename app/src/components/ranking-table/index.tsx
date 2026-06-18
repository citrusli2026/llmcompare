"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, DollarSign, Brain, Code, Bot, Calendar, Activity } from "lucide-react";
import { cn, formatTokenCount, isValuePick } from "@/lib/utils";
import { type ModelWithScores, getAllModels } from "@/lib/scoring";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { type ScoreKey, type SortKey, type HeaderDef, type CompareState } from "./types";
import { computePercentiles, formatScore } from "./utils";
import { useModelGroups } from "./use-model-groups";
import { ModelRow } from "./model-row";
import { MobileCard } from "./mobile-card";

interface RankingTableProps {
  models: ModelWithScores[];
  initialSortKey?: SortKey;
  initialSortDesc?: boolean;
  compare?: CompareState;
}

const HEADERS: HeaderDef[] = [
  { key: "intelligence", labelKey: "models.colIntelligence", icon: Brain, mobile: true, desktop: true },
  { key: "coding", labelKey: "models.colCoding", icon: Code, mobile: false, desktop: true },
  { key: "agentic", labelKey: "models.colAgentic", icon: Bot, mobile: false, desktop: true },
  { key: "cost", labelKey: "models.colCost", icon: DollarSign, mobile: false, desktop: true },
  { key: "tokens", labelKey: "models.colTokens", icon: Activity, mobile: true, desktop: true },
];


const MOBILE_SORT_OPTIONS: { key: SortKey | ""; labelKey: string }[] = [
  { key: "", labelKey: "models.sortBy" },
  { key: "intelligence", labelKey: "models.colIntelligence" },
  { key: "cost", labelKey: "models.colCost" },
  { key: "tokens", labelKey: "models.colTokens" },
  { key: "date", labelKey: "table.date" },
];

export function RankingTable({ models, initialSortKey, initialSortDesc, compare }: RankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>(initialSortKey ?? "tokens");
  const [sortDesc, setSortDesc] = useState(initialSortDesc ?? true);
  const { t } = useTranslation();

  const headers = HEADERS;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
      return;
    }
    setSortKey(key);
    // cost 越低越好，默认升序；其他指标越高越好，默认降序
    setSortDesc(key !== "cost");
  };

  const groups = useModelGroups(models, sortKey, sortDesc);

  const percentiles = useMemo(() => ({
    intelligence: computePercentiles(models.map((m) => m.raw.intelligence)),
    coding: computePercentiles(models.map((m) => m.raw.coding)),
    agentic: computePercentiles(models.map((m) => m.raw.agentic)),
    // cost 用 OR completion 价，与移动端展示一致；桌面双值列 prompt/completion 高度相关，排序结果近似
    cost: computePercentiles(models.map((m) => m.raw.openrouter_pricing?.completion ?? null)),
    tokens: computePercentiles(models.map((m) => m.raw.openrouter_weekly_tokens ?? null)),
  }), [models]);

  // 全局数据集最大值，供 ScoreBar 以满进度渲染
  const globalMax = useMemo(() => {
    const all = getAllModels();
    return {
      intelligence: Math.max(...all.map((m) => m.raw.intelligence ?? 0), 1),
      coding: Math.max(...all.map((m) => m.raw.coding ?? 0), 1),
      agentic: Math.max(...all.map((m) => m.raw.agentic ?? 0), 1),
    } as const;
  }, []);

  const colVisibilityClass = (h: HeaderDef) => cn(
    !h.mobile && "hidden sm:table-cell",
    !h.desktop && "hidden md:table-cell",
    !h.mobile && !h.desktop && "hidden lg:table-cell",
  );

  const renderers: Record<ScoreKey, (m: ModelWithScores) => React.ReactNode> = {
    intelligence: (m) => formatScore(m.raw.intelligence),
    coding: (m) => formatScore(m.raw.coding),
    agentic: (m) => formatScore(m.raw.agentic),
    cost: (m) => {
      const blended = m.raw.blended;
      if (blended != null) {
        if (blended === 0) return <span className="text-accent-lime font-medium">{t("common.free")}</span>;
        // Value indicator: smart model at low price
        const isValue = isValuePick(m);
        return (
          <span className="inline-flex items-center gap-0.5">
            <span className="tabular-nums">${blended.toFixed(2)}</span>
            <span className="text-text-secondary text-[10px]">/M</span>
            {isValue && (
              <Badge variant="secondary" className="text-[9px] py-0 px-1 h-[14px] leading-none bg-accent-lime/10 text-accent-lime border-accent-lime/20">
                {t("models.valuePickShort")}
              </Badge>
            )}
          </span>
        );
      }
      return <span className="text-text-dim text-xs">—</span>;
    },
    tokens: (m) => {
      const val = m.raw.openrouter_weekly_tokens;
      if (val == null) return <span className="text-text-dim text-xs">—</span>;
      const { value, unit } = formatTokenCount(val);
      return <span>{value}{unit && <span className="text-text-secondary text-[10px]">{unit}</span>}</span>;
    },
  };


  const handleMobileSortChange = (value: string) => {
    if (value === "" || value === "date") {
      setSortKey("date");
      setSortDesc(true);
    } else {
      const key = value as ScoreKey;
      setSortKey(key);
      // cost 越低越好，默认升序；其他指标越高越好，默认降序
      setSortDesc(key !== "cost");
    }
  };

  return (
    <div className="space-y-4">
      {/* 移动端排序控制 */}
      <div className="block sm:hidden">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={sortKey}
              onChange={(e) => handleMobileSortChange(e.target.value)}
              className="w-full appearance-none rounded-lg border border-surface-border bg-surface-card px-3 py-2 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
            >
              {MOBILE_SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>{t(opt.labelKey)}</option>
              ))}
            </select>
            <ArrowDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
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
      <div className="rounded-xl border border-surface-border bg-surface-card hidden sm:block">
        <div className="max-h-[calc(100vh-280px)] overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 z-10 bg-surface-card">
              <tr className="border-b border-surface-border hover:bg-transparent">
                <th className="h-10 px-2 text-left align-middle font-medium sm:whitespace-nowrap w-16 sm:w-20">
                  <span className="sr-only">{t("favorites.add")}</span>
                </th>
                <th className="h-10 px-2 text-left align-middle font-medium sm:whitespace-nowrap text-text-muted">
                  {t("table.model")}
                </th>
                <th className="h-10 px-2 text-left align-middle font-medium sm:whitespace-nowrap text-text-muted hidden sm:table-cell">
                  {t("table.company")}
                </th>
                <th
                  className={cn(
                    "h-10 px-2 text-left align-middle font-medium sm:whitespace-nowrap cursor-pointer text-text-muted hover:text-text-primary hidden lg:table-cell",
                    sortKey === "date" && "font-semibold text-text-primary"
                  )}
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t("table.date")}
                    {sortKey === "date"
                      ? (sortDesc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)
                      : <ArrowUpDown className="h-3 w-3" />
                    }
                  </div>
                </th>
                {headers.map((h) => (
                  <th
                    key={h.key}
                    className={cn(
                      "h-10 px-2 text-left align-middle font-medium sm:whitespace-nowrap cursor-pointer",
                      sortKey === h.key
                        ? "text-text-primary font-semibold"
                        : "text-text-muted hover:text-text-primary",
                      colVisibilityClass(h)
                    )}
                    onClick={() => handleSort(h.key)}
                  >
                    <div className="flex items-center gap-1">
                      <h.icon className="h-3 w-3" />
                      {t(h.labelKey)}
                      {sortKey === h.key
                        ? (sortDesc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)
                        : <ArrowUpDown className="h-3 w-3" />
                      }
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) =>
                group.items.map((model, idx) => (
                  <ModelRow
                    key={model.id}
                    model={model}
                    group={group}
                    idx={idx}
                    sortKey={sortKey}
                    headers={headers}
                    renderers={renderers}
                    colVisibilityClass={colVisibilityClass}
                    percentiles={percentiles}
                    globalMax={globalMax}
                    compare={compare}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 颜色图例 */}
      <div className="hidden sm:flex items-center gap-4 px-1 py-2 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-lime" />
          {t("models.top25")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-violet" />
          {t("models.top50")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-coral" />
          {t("models.top75")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-text-muted" />
          {t("models.bottom25")}
        </span>
        <span className="text-text-dim ml-2">{t("models.colorByRank")}</span>
      </div>

      {/* 移动端卡片列表 */}
      <div className="block sm:hidden space-y-2">
        {groups.map((group) =>
          group.items
            .map((model, idx) => (
              <MobileCard
                key={model.id}
                model={model}
                group={group}
                idx={idx}
                sortKey={sortKey}
                percentiles={percentiles}
                compare={compare}
              />
            ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import {
  Brain,
  Code,
  Zap,
  DollarSign,
  ArrowUpRight,
  Globe,
  MapPin,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CompareTableProps {
  international: ModelWithScores[];
  domestic: ModelWithScores[];
  exchangeRate: number;
}

const TOP_N = 5;

export function CompareTable({
  international,
  domestic,
  exchangeRate,
}: CompareTableProps) {
  const { t } = useTranslation();

  // 取各阵营 Top 5（按智能分降序）
  const topIntl = useMemo(
    () =>
      [...international]
        .sort((a, b) => b.raw.intelligence - a.raw.intelligence)
        .slice(0, TOP_N),
    [international]
  );

  const topDomestic = useMemo(
    () =>
      [...domestic]
        .sort((a, b) => b.raw.intelligence - a.raw.intelligence)
        .slice(0, TOP_N),
    [domestic]
  );

  // 合并后按智能分降序
  const allTop = useMemo(() => {
    const merged = [...topIntl, ...topDomestic];
    return merged.sort((a, b) => b.raw.intelligence - a.raw.intelligence);
  }, [topIntl, topDomestic]);

  // 最高智能分用于进度条
  const maxIntel = Math.max(...allTop.map((m) => m.raw.intelligence));

  // 价格统一为美元（国内 CNY ÷ exchangeRate）
  const getPriceUSD = (model: ModelWithScores): number | null => {
    if (model.raw.isInternational) {
      const input = model.raw.input;
      const output = model.raw.output;
      if (input != null && output != null) return (input + output) / 2;
      return null;
    } else {
      const cnIn = model.raw.cn_input;
      const cnOut = model.raw.cn_output;
      if (cnIn != null && cnOut != null)
        return (cnIn + cnOut) / 2 / exchangeRate;
      const inP = model.raw.input;
      const outP = model.raw.output;
      if (inP != null && outP != null) return (inP + outP) / 2 / exchangeRate;
      return null;
    }
  };

  // 格式化价格显示
  const formatPrice = (price: number | null): string => {
    if (price == null) return "—";
    return `$${price.toFixed(2)}`;
  };

  // 计算相对差距（与第一名智能分的百分比差距）
  const getGap = (model: ModelWithScores): number => {
    const topIntel = allTop[0]?.raw.intelligence ?? maxIntel;
    if (topIntel <= 0) return 0;
    return ((topIntel - model.raw.intelligence) / topIntel) * 100;
  };

  // 智能分进度条宽度
  const getProgressWidth = (intel: number): string => {
    if (maxIntel <= 0) return "0%";
    return `${(intel / maxIntel) * 100}%`;
  };

  // 速度显示
  const getSpeedDisplay = (model: ModelWithScores): React.ReactNode => {
    if (model.raw.median_tps != null) {
      return (
        <span>
          {model.raw.median_tps.toFixed(1)}{" "}
          <span className="text-text-secondary text-[10px]">TPS</span>
        </span>
      );
    }
    return <span className="text-text-dim text-xs">—</span>;
  };

  // 代码分显示
  const getCodingDisplay = (model: ModelWithScores): React.ReactNode => {
    if (model.raw.coding != null) {
      return model.raw.coding % 1 === 0
        ? model.raw.coding
        : model.raw.coding.toFixed(1);
    }
    return <span className="text-text-dim text-xs">—</span>;
  };

  // 差距标签
  const getGapBadge = (gap: number): React.ReactNode => {
    if (gap <= 0) {
      return (
        <Badge
          variant="secondary"
          className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 py-0 px-1.5"
        >
          <TrendingUp className="h-3 w-3 mr-0.5" />
          Top
        </Badge>
      );
    }
    if (gap <= 5) {
      return (
        <Badge
          variant="secondary"
          className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-300 py-0 px-1.5"
        >
          <Minus className="h-3 w-3 mr-0.5" />
          {gap.toFixed(1)}%
        </Badge>
      );
    }
    if (gap <= 15) {
      return (
        <Badge
          variant="secondary"
          className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-300 py-0 px-1.5"
        >
          <TrendingDown className="h-3 w-3 mr-0.5" />
          -{gap.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-300 py-0 px-1.5"
      >
        <TrendingDown className="h-3 w-3 mr-0.5" />
        -{gap.toFixed(1)}%
      </Badge>
    );
  };

  // 阵营概览统计
  const stats = useMemo(() => {
    const avgIntel = (arr: ModelWithScores[]) =>
      arr.length > 0
        ? arr.reduce((s, m) => s + m.raw.intelligence, 0) / arr.length
        : 0;
    const avgPrice = (arr: ModelWithScores[]) => {
      const prices = arr.map(getPriceUSD).filter((p): p is number => p != null);
      return prices.length > 0
        ? prices.reduce((s, p) => s + p, 0) / prices.length
        : null;
    };
    return {
      intl: {
        avgIntel: avgIntel(topIntl),
        avgPrice: avgPrice(topIntl),
        count: topIntl.length,
      },
      domestic: {
        avgIntel: avgIntel(topDomestic),
        avgPrice: avgPrice(topDomestic),
        count: topDomestic.length,
      },
    };
  }, [topIntl, topDomestic, exchangeRate]);

  const intelGap =
    stats.intl.avgIntel > 0
      ? ((stats.intl.avgIntel - stats.domestic.avgIntel) / stats.intl.avgIntel) *
        100
      : 0;

  const priceGap =
    stats.intl.avgPrice != null &&
    stats.domestic.avgPrice != null &&
    stats.intl.avgPrice > 0
      ? ((stats.domestic.avgPrice - stats.intl.avgPrice) / stats.intl.avgPrice) *
        100
      : null;

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 国际模型概览 */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-text-primary">
              {t("compare.intlTitle") ?? "国际 Top 5"}
            </h3>
            <Badge
              variant="secondary"
              className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-300 py-0 px-1.5"
            >
              {stats.intl.count} {t("compare.models") ?? "模型"}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {t("compare.avgIntel") ?? "平均智能分"}
              </span>
              <span className="font-medium text-text-primary">
                {stats.intl.avgIntel.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {t("compare.avgPrice") ?? "平均价格"}
              </span>
              <span className="font-medium text-text-primary">
                {stats.intl.avgPrice != null
                  ? `$${stats.intl.avgPrice.toFixed(2)}/M`
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* 国内模型概览 */}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-text-primary">
              {t("compare.domesticTitle") ?? "国内 Top 5"}
            </h3>
            <Badge
              variant="secondary"
              className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 py-0 px-1.5"
            >
              {stats.domestic.count} {t("compare.models") ?? "模型"}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {t("compare.avgIntel") ?? "平均智能分"}
              </span>
              <span className="font-medium text-text-primary">
                {stats.domestic.avgIntel.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {t("compare.avgPrice") ?? "平均价格"}
              </span>
              <span className="font-medium text-text-primary">
                {stats.domestic.avgPrice != null
                  ? `$${stats.domestic.avgPrice.toFixed(2)}/M`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 对比表格 */}
      <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-surface-border hover:bg-transparent">
                <TableHead className="text-text-muted w-12">
                  {t("compare.colRank") ?? "#"}
                </TableHead>
                <TableHead className="text-text-muted">
                  {t("table.model")}
                </TableHead>
                <TableHead className="text-text-muted hidden sm:table-cell">
                  {t("table.company")}
                </TableHead>
                <TableHead className="text-text-muted">
                  <div className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    {t("models.colIntelligence")}
                  </div>
                </TableHead>
                <TableHead className="text-text-muted hidden md:table-cell">
                  <div className="flex items-center gap-1">
                    <Code className="h-3 w-3" />
                    {t("models.colCoding")}
                  </div>
                </TableHead>
                <TableHead className="text-text-muted hidden md:table-cell">
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {t("models.colSpeed")}
                  </div>
                </TableHead>
                <TableHead className="text-text-muted">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {t("compare.colPriceUSD") ?? "价格 (USD/M)"}
                  </div>
                </TableHead>
                <TableHead className="text-text-muted hidden lg:table-cell">
                  {t("compare.colGap") ?? "相对差距"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTop.map((model, index) => {
                const isIntl = model.raw.isInternational;
                const priceUSD = getPriceUSD(model);
                const gap = getGap(model);

                return (
                  <TableRow
                    key={model.id}
                    className={cn(
                      "border-gray-300 dark:border-white/25 hover:bg-surface-hover transition-colors",
                      isIntl && "bg-blue-50/30 dark:bg-blue-950/10"
                    )}
                  >
                    {/* 排名 */}
                    <TableCell className="text-sm font-medium text-text-muted">
                      {index + 1}
                    </TableCell>

                    {/* 模型名 */}
                    <TableCell className="max-w-[200px]">
                      <Link
                        href={`/product/${model.id}`}
                        className="inline-flex items-center gap-1 font-medium text-text-primary hover:text-accent-violet transition-colors group truncate"
                      >
                        {model.name}
                        <ArrowUpRight className="h-3 w-3 text-text-muted group-hover:text-accent-violet transition-colors opacity-50 group-hover:opacity-100 shrink-0" />
                      </Link>
                      <div className="flex gap-1 mt-1">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] py-0 px-1.5",
                            isIntl
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-300"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          )}
                        >
                          {isIntl
                            ? t("compare.intl") ?? "国际"
                            : t("compare.domestic") ?? "国内"}
                        </Badge>
                        {model.flags.frontier && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-violet-500/10 text-violet-400 py-0 px-1.5"
                          >
                            {t("common.frontier")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* 公司 */}
                    <TableCell className="text-text-secondary hidden sm:table-cell">
                      {model.company}
                    </TableCell>

                    {/* 智能分（带进度条） */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary w-10 text-right">
                          {model.raw.intelligence}
                        </span>
                        <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              isIntl
                                ? "bg-blue-500 dark:bg-blue-400"
                                : "bg-emerald-500 dark:bg-emerald-400"
                            )}
                            style={{
                              width: getProgressWidth(model.raw.intelligence),
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* 代码 */}
                    <TableCell className="hidden md:table-cell text-sm text-text-secondary">
                      {getCodingDisplay(model)}
                    </TableCell>

                    {/* 速度 */}
                    <TableCell className="hidden md:table-cell text-sm text-text-secondary">
                      {getSpeedDisplay(model)}
                    </TableCell>

                    {/* 价格 USD/M */}
                    <TableCell className="text-sm text-text-secondary">
                      {formatPrice(priceUSD)}
                      {priceUSD != null && (
                        <span className="text-text-muted text-[10px]">/M</span>
                      )}
                    </TableCell>

                    {/* 相对差距 */}
                    <TableCell className="hidden lg:table-cell">
                      {getGapBadge(gap)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 差距分析卡片 */}
      <div className="rounded-xl border border-surface-border bg-surface-card p-4 sm:p-6">
        <h3 className="text-base font-semibold text-text-primary mb-4">
          {t("compare.gapAnalysis") ?? "差距分析"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 智能分差距 */}
          <div className="rounded-lg bg-surface-hover p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-text-muted" />
              <span className="text-sm font-medium text-text-secondary">
                {t("compare.intelGap") ?? "智能分差距"}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "text-2xl font-bold",
                  intelGap > 0
                    ? "text-amber-500 dark:text-amber-300"
                    : "text-emerald-500 dark:text-emerald-300"
                )}
              >
                {intelGap > 0 ? "+" : ""}
                {intelGap.toFixed(1)}%
              </span>
              <span className="text-xs text-text-muted">
                {t("compare.intlAdvantage") ?? "国际领先"}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-2">
              {t("compare.intelGapDesc") ??
                "国际 Top 5 平均智能分与国内 Top 5 的相对差距"}
            </p>
          </div>

          {/* 价格差距 */}
          <div className="rounded-lg bg-surface-hover p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-text-muted" />
              <span className="text-sm font-medium text-text-secondary">
                {t("compare.priceGap") ?? "价格差距"}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "text-2xl font-bold",
                  priceGap != null && priceGap < 0
                    ? "text-emerald-500 dark:text-emerald-300"
                    : "text-amber-500 dark:text-amber-300"
                )}
              >
                {priceGap != null
                  ? `${priceGap > 0 ? "+" : ""}${priceGap.toFixed(1)}%`
                  : "—"}
              </span>
              <span className="text-xs text-text-muted">
                {priceGap != null && priceGap < 0
                  ? t("compare.domesticCheaper") ?? "国内更便宜"
                  : t("compare.domesticExpensive") ?? "国内更贵"}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-2">
              {t("compare.priceGapDesc") ??
                "国内 Top 5 平均价格与国际 Top 5 的相对差距（已统一为美元）"}
            </p>
          </div>

          {/* 数量对比 */}
          <div className="rounded-lg bg-surface-hover p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-text-muted" />
              <span className="text-sm font-medium text-text-secondary">
                {t("compare.modelCount") ?? "模型数量"}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-text-primary">
                {stats.domestic.count}
              </span>
              <span className="text-xs text-text-muted">
                {t("compare.vs") ?? "vs"} {stats.intl.count}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-2">
              {t("compare.countDesc") ??
                "各阵营选取 Top 5 模型进行横向对比"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

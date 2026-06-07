"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, Brain, Code, Bot, Zap, DollarSign, Layers, Calendar, Eye, Weight, MessageSquare, Trophy, Check, Star, X, TrendingUp, Link2, CheckCheck } from "lucide-react";
import { getModelById, type ModelWithScores } from "@/lib/scoring";
import { getRecommendationTags, getModelOneLiner } from "@/lib/recommendation-tags";
import { useTranslation } from "@/lib/i18n";
import { cn, formatTokenCount, getTypeBadgeClasses } from "@/lib/utils";
import { Tooltip } from "@/components/tooltip";
import { FieldTip } from "@/components/field-tip";

interface CompareRow {
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  getValue: (m: ModelWithScores) => React.ReactNode;
  getNumericValue?: (m: ModelWithScores) => number | null;
  tipKey?: string;
}

function formatNum(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "—";
  return v.toFixed(decimals);
}

function isBestValue(val: number | null, vals: (number | null)[], higherIsBetter: boolean): boolean {
  if (val == null) return false;
  const valid = vals.filter((v): v is number => v != null);
  if (valid.length === 0) return false;
  return higherIsBetter ? val >= Math.max(...valid) : val <= Math.min(...valid);
}

function barColor(fillPct: number): string {
  return fillPct >= 80 ? "bg-accent-lime"
    : fillPct >= 65 ? "bg-accent-violet"
    : fillPct >= 50 ? "bg-accent-coral"
    : "bg-text-muted";
}

export function ComparePageClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  const modelIds = useMemo(
    () => searchParams.get("models")?.split(",").filter(Boolean) ?? [],
    [searchParams]
  );

  const models = useMemo(
    () => modelIds.map((id) => getModelById(id)).filter(Boolean) as ModelWithScores[],
    [modelIds]
  );

  const [copied, setCopied] = useState(false);

  // ── Define comparison rows ──
  const rows: CompareRow[] = useMemo(() => [
    {
      labelKey: "compare.intelligence",
      icon: Brain,
      getValue: (m) => formatNum(m.raw.intelligence),
      getNumericValue: (m) => m.raw.intelligence,
      tipKey: "tip.intelligence",
    },
    {
      labelKey: "compare.coding",
      icon: Code,
      getValue: (m) => formatNum(m.raw.coding),
      getNumericValue: (m) => m.raw.coding,
      tipKey: "tip.coding",
    },
    {
      labelKey: "compare.agentic",
      icon: Bot,
      getValue: (m) => formatNum(m.raw.agentic),
      getNumericValue: (m) => m.raw.agentic,
      tipKey: "tip.agentic",
    },
    {
      labelKey: "compare.speed",
      icon: Zap,
      getValue: (m) => m.raw.median_tps != null ? `${m.raw.median_tps.toFixed(1)} t/s` : "—",
      getNumericValue: (m) => m.raw.median_tps,
      tipKey: "tip.speed",
    },
    {
      labelKey: "compare.price",
      icon: DollarSign,
      getValue: (m) => {
        if (m.raw.openrouter_pricing) {
          const prompt = m.raw.openrouter_pricing.prompt;
          const completion = m.raw.openrouter_pricing.completion;
          if (prompt === 0 && completion === 0) {
            return <span className="text-accent-lime font-medium">{t("common.free")}</span>;
          }
          return <span><span className="tabular-nums">${prompt}/${completion}</span> <Tooltip content={t("common.perMUnit")}><span className="text-text-secondary text-[10px]">/M</span></Tooltip></span>;
        }
        if (m.raw.input != null) {
          if (m.raw.input === 0 && m.raw.output === 0) {
            return <span className="text-accent-lime font-medium">{t("common.free")}</span>;
          }
          return <span><span className="tabular-nums">${m.raw.input}/${m.raw.output}</span> <Tooltip content={t("common.perMUnit")}><span className="text-text-secondary text-[10px]">/M</span></Tooltip></span>;
        }
        return "—";
      },
      getNumericValue: (m) => {
        // Lower is better for cost — use blended if available, fallback to completion
        return m.raw.blended ?? m.raw.openrouter_pricing?.completion ?? m.raw.output ?? null;
      },
      tipKey: "tip.blended",
    },
    {
      labelKey: "compare.orWeeklyTokens",
      icon: TrendingUp,
      getValue: (m) => {
        const v = m.raw.openrouter_weekly_tokens;
        if (v == null) return "—";
        const fmt = formatTokenCount(v);
        return fmt.unit ? `${fmt.value} ${fmt.unit}` : fmt.value;
      },
      getNumericValue: (m) => m.raw.openrouter_weekly_tokens,
      tipKey: "tip.orWeeklyTokens",
    },
    {
      labelKey: "compare.arenaVotes",
      icon: Trophy,
      getValue: (m) => m.raw.arena_votes != null ? formatNum(m.raw.arena_votes, 0) : "—",
      getNumericValue: (m) => m.raw.arena_votes,
      tipKey: "tip.arenaVotes",
    },
    {
      labelKey: "compare.contextWindow",
      icon: Layers,
      getValue: (m) => m.raw.context_window != null
        ? `${m.raw.context_window >= 1000000 ? (m.raw.context_window / 1000000).toFixed(0) + 'M' : formatNum(m.raw.context_window, 0)} tokens`
        : "—",
      getNumericValue: (m) => m.raw.context_window,
      tipKey: "tip.contextWindow",
    },
    {
      labelKey: "compare.parameters",
      icon: Weight,
      getValue: (m) => m.raw.parameters != null ? `${formatNum(m.raw.parameters, 0)}B` : "—",
      tipKey: "tip.parameters",
    },
    {
      labelKey: "compare.releaseDate",
      icon: Calendar,
      getValue: (m) => m.raw.release_date ?? "—",
    },
    {
      labelKey: "common.reasoning",
      icon: MessageSquare,
      getValue: (m) => m.flags.reasoning ? <Check className="h-4 w-4 text-accent-lime" /> : <X className="h-4 w-4 text-text-muted" />,
    },
    {
      labelKey: "common.imageInput",
      icon: Eye,
      getValue: (m) => m.flags.image_input ? <Check className="h-4 w-4 text-accent-lime" /> : <X className="h-4 w-4 text-text-muted" />,
    },
    {
      labelKey: "common.openWeights",
      icon: Star,
      getValue: (m) => m.flags.open_weights ? <Check className="h-4 w-4 text-accent-lime" /> : <X className="h-4 w-4 text-text-muted" />,
    },
    {
      labelKey: "compare.benchmarkGpqa",
      icon: Brain,
      getValue: (m) => m.raw.benchmarks.gpqa != null ? formatNum(m.raw.benchmarks.gpqa) : "—",
      getNumericValue: (m) => m.raw.benchmarks.gpqa,
      tipKey: "tip.gpqa",
    },
    {
      labelKey: "compare.benchmarkHle",
      icon: Brain,
      getValue: (m) => m.raw.benchmarks.hle != null ? formatNum(m.raw.benchmarks.hle) : "—",
      getNumericValue: (m) => m.raw.benchmarks.hle,
      tipKey: "tip.hle",
    },
    {
      labelKey: "compare.benchmarkMmluPro",
      icon: Brain,
      getValue: (m) => m.raw.benchmarks.mmlu_pro != null ? formatNum(m.raw.benchmarks.mmlu_pro) : "—",
      getNumericValue: (m) => m.raw.benchmarks.mmlu_pro,
      tipKey: "tip.mmluPro",
    },
  ], [t]);

  if (models.length === 0) {
    return (
      <div className="min-h-screen bg-surface-base">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-32 gap-4 px-4">
          <BarChart3 className="h-16 w-16 text-text-muted" />
          <h1 className="text-2xl font-bold text-text-primary">{t("compare.noModels")}</h1>
          <p className="text-text-secondary text-sm">{t("compare.noModelsDesc")}</p>
          <Link
            href="/models"
            className="inline-flex items-center gap-2 rounded-lg bg-accent-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 transition-colors"
          >
            {t("nav.models")}
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <div className="px-4 py-6 sm:py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/models"
              className="flex items-center justify-center h-8 w-8 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
              aria-label={t("product.backLink")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <BarChart3 className="h-7 w-7 sm:h-8 sm:w-8 text-accent-violet" />
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{t("compare.title")}</h1>
            <span className="text-text-muted text-sm ml-2">({models.length} {t("nav.models")})</span>
            <span className="flex-1" />
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                } catch {
                  const ta = document.createElement("textarea");
                  ta.value = window.location.href;
                  ta.style.position = "fixed";
                  ta.style.opacity = "0";
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand("copy");
                  ta.remove();
                }
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-2 text-xs sm:text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all shrink-0"
              aria-label={t("compare.share")}
            >
              {copied ? (
                <CheckCheck className="h-4 w-4 text-accent-lime" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {copied ? t("compare.copied") : t("compare.share")}
            </button>
          </div>

          {/* Verdict — which model for which scenario */}
          {models.length >= 2 && (
            <div className="mb-6 rounded-xl border border-accent-violet/20 bg-accent-violet/[0.03] p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                <Star className="h-5 w-5 text-accent-violet" />
                <h2 className="text-base sm:text-lg font-semibold text-text-primary">{t("compare.verdictTitle")}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {models.map((m) => {
                  const oneLiner = getModelOneLiner(m);
                  return (
                    <div key={m.id} className="rounded-lg border border-surface-border bg-surface-card p-3">
                      <div className="text-sm font-semibold text-text-primary mb-0.5">{m.name}</div>
                      <div className="text-xs text-text-secondary mb-1">{t(oneLiner.labelKey)}</div>
                      <div className="flex items-center gap-1 text-[10px] text-text-muted">
                        <Brain className="h-3 w-3" />
                        <span>{t("models.colIntelligence")}: {m.raw.intelligence?.toFixed(1) ?? "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile: per-model card view */}
          <div className="sm:hidden space-y-4">
            {models.map((m) => {
              const mTags = getRecommendationTags(m);
              return (
                <div key={m.id} className="rounded-xl border border-surface-border bg-surface-card overflow-hidden">
                  {/* Card header */}
                  <div className="px-4 py-3 border-b border-surface-border bg-surface-elevated">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm text-text-primary">{m.name}</div>
                        <div className="text-[10px] text-text-muted">{m.company}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className={cn("text-[10px] py-0 px-1.5", getTypeBadgeClasses(m.type as "开源" | "闭源"))}>
                          {t(m.type === "开源" ? "common.open" : "common.closed")}
                        </Badge>
                        {mTags.length > 0 && (
                          <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[9px] font-medium", mTags[0].colorClass)}>
                            <span>{mTags[0].icon}</span>
                            <span>{t(mTags[0].labelKey)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Metrics */}
                  <div className="divide-y divide-surface-border">
                    {rows.map((row, ri) => {
                      const Icon = row.icon;
                      const numVal = row.getNumericValue?.(m) ?? null;
                      const allValues = models.map((mm) => row.getNumericValue?.(mm) ?? null);
                      const higherIsBetter = row.labelKey !== "compare.price";
                      const isBest = isBestValue(numVal, allValues, higherIsBetter);
                      const isScoreBar = row.labelKey === "compare.intelligence" || row.labelKey === "compare.coding" || row.labelKey === "compare.agentic" || row.labelKey === "compare.speed" || row.labelKey === "compare.price";
                      const validVals = allValues.filter((v): v is number => v != null);
                      const maxValue = validVals.length > 0 ? Math.max(...validVals) : 100;
                      return (
                        <div key={ri} className={cn("flex items-center justify-between px-4 py-2.5", isBest && "bg-accent-lime/5")}>
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-text-muted shrink-0" />
                            {row.tipKey ? (
                              <FieldTip tip={t(row.tipKey)}><span className="text-xs text-text-primary">{t(row.labelKey)}</span></FieldTip>
                            ) : (
                              <span className="text-xs text-text-primary">{t(row.labelKey)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {isBest && <Star className="h-3 w-3 text-accent-lime shrink-0" />}
                            <span className={cn("text-xs tabular-nums text-right", isBest ? "font-semibold text-accent-lime" : "text-text-primary")}>
                              {row.getValue(m)}
                            </span>
                            {isScoreBar && numVal != null && maxValue > 0 && (() => {
                              const rawPct = Math.min((numVal / maxValue) * 100, 100);
                              const fillPct = higherIsBetter ? rawPct : Math.max(0, 100 - rawPct);
                              return (
                                <div className="w-12 h-1 rounded-full bg-surface-border overflow-hidden">
                                  <div className={`h-full rounded-full ${barColor(fillPct)} transition-all`} style={{ width: `${fillPct}%` }} />
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: comparison table — hidden on mobile */}
          <div className="hidden sm:block rounded-xl border border-surface-border bg-surface-card overflow-hidden">
            <div className="flex">
              {/* Fixed left panel */}
              <div className="shrink-0 min-w-[60px] sm:min-w-[140px]">
                <div className="px-1.5 py-2 sm:px-6 sm:py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {t("compare.colName")}
                </div>
                {rows.map((row, ri) => {
                  const Icon = row.icon;
                  return (
                    <div
                      key={ri}
                      className={cn(
                        "px-1.5 py-1.5 sm:px-6 sm:py-4 border-b border-surface-border last:border-b-0 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.15)]",
                        ri % 2 === 1 ? "bg-surface-elevated" : "bg-surface-base"
                      )}
                    >
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-text-muted shrink-0" />
                        {row.tipKey ? (
                          <FieldTip tip={t(row.tipKey)}><span className="text-xs sm:text-sm font-medium text-text-primary">{t(row.labelKey)}</span></FieldTip>
                        ) : (
                          <span className="text-xs sm:text-sm font-medium text-text-primary">{t(row.labelKey)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scrollable right panel */}
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <div className="overflow-x-auto [mask-image:linear-gradient(to_right,black_80%,transparent_97%)] [-webkit-mask-image:linear-gradient(to_right,black_80%,transparent_97%)]">
                    <table className="w-full min-w-[225px] sm:min-w-[600px]">
                      <thead>
                        <tr className="border-b border-surface-border">
                          {models.map((m) => (
                            <th
                              key={m.id}
                              className="px-1.5 py-2 sm:px-4 sm:py-4 text-center min-w-[75px] sm:min-w-[180px]"
                        >
                          <div className="inline-flex flex-col items-center gap-0.5 sm:gap-1">
                            <span className="font-semibold text-xs sm:text-sm text-text-primary truncate max-w-[95px] sm:max-w-[160px]">
                              {m.name}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-text-muted truncate max-w-[95px] sm:max-w-[160px]">{m.company}</span>
                            <Badge
                              variant="secondary"
                              className={cn("text-[10px] py-0 px-1.5", getTypeBadgeClasses(m.type as "开源" | "闭源"))}
                            >
                              {t(m.type === "开源" ? "common.open" : "common.closed")}
                            </Badge>
                            {/* Scene recommendation badges */}
                            {(() => {
                              const tags = getRecommendationTags(m);
                              return tags.length > 0 ? (
                                <span className={cn(
                                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[9px] font-medium mt-0.5",
                                  tags[0].colorClass
                                )}>
                                  <span>{tags[0].icon}</span>
                                  <span className="truncate max-w-[80px]">{t(tags[0].labelKey)}</span>
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => {
                      const values = models.map((m) => row.getNumericValue?.(m) ?? null);
                      const higherIsBetter = row.labelKey !== "compare.price";
                      const allEmpty = values.every((v) => v == null);
                      return (
                        <tr
                          key={ri}
                          className={cn(
                            "border-b border-surface-border last:border-b-0",
                            ri % 2 === 1 ? "bg-surface-elevated" : "",
                            allEmpty && "opacity-40"
                          )}
                        >
                          {models.map((m) => {
                            const numVal = row.getNumericValue?.(m) ?? null;
                            const isBest = isBestValue(numVal, values, higherIsBetter);
                            const isScoreBar = row.labelKey === "compare.intelligence" || row.labelKey === "compare.coding" || row.labelKey === "compare.agentic" || row.labelKey === "compare.speed" || row.labelKey === "compare.price";
                            const validVals = values.filter((v): v is number => v != null);
                            const maxValue = validVals.length > 0 ? Math.max(...validVals) : 100;
                            return (
                              <td
                                key={m.id}
                                className={cn(
                                  "px-1.5 py-1.5 sm:px-4 sm:py-4 text-center text-xs sm:text-sm transition-colors",
                                  isBest ? "bg-accent-lime/10" : ri % 2 === 1 ? "bg-surface-elevated" : "bg-surface-card"
                                )}
                              >
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center justify-center gap-1">
                                    {isBest && <Star className="h-3 w-3 text-accent-lime shrink-0" />}
                                    <span className={cn(
                                      "tabular-nums",
                                      isBest ? "font-semibold text-accent-lime" : "text-text-primary"
                                    )}>
                                      {row.getValue(m)}
                                    </span>
                                  </div>
                                  {isScoreBar && numVal != null && maxValue > 0 && (() => {
                                    const rawPct = Math.min((numVal / maxValue) * 100, 100);
                                    const fillPct = higherIsBetter ? rawPct : Math.max(0, 100 - rawPct);
                                    return (
                                      <div className="w-full h-1 rounded-full bg-surface-border overflow-hidden max-w-[60px] sm:max-w-[100px]">
                                        <div
                                          className={`h-full rounded-full ${barColor(fillPct)} transition-all`}
                                          style={{ width: `${fillPct}%` }}
                                        />
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-accent-lime" /> {t("compare.bestValue")}
            </span>
          </div>
        </div>
      </div>
      </div>
  );
}
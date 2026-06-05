"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, Brain, Code, Bot, Zap, DollarSign, Layers, Calendar, Eye, Weight, MessageSquare, Trophy, Check, Star, X } from "lucide-react";
import { getModelById, type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import { cn, getTypeBadgeClasses } from "@/lib/utils";

interface CompareRow {
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  getValue: (m: ModelWithScores) => React.ReactNode;
  getNumericValue?: (m: ModelWithScores) => number | null;
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

  // ── Define comparison rows ──
  const rows: CompareRow[] = useMemo(() => [
    {
      labelKey: "compare.intelligence",
      icon: Brain,
      getValue: (m) => formatNum(m.raw.intelligence),
      getNumericValue: (m) => m.raw.intelligence,
    },
    {
      labelKey: "compare.coding",
      icon: Code,
      getValue: (m) => formatNum(m.raw.coding),
      getNumericValue: (m) => m.raw.coding,
    },
    {
      labelKey: "compare.agentic",
      icon: Bot,
      getValue: (m) => formatNum(m.raw.agentic),
      getNumericValue: (m) => m.raw.agentic,
    },
    {
      labelKey: "compare.speed",
      icon: Zap,
      getValue: (m) => m.raw.median_tps != null ? `${m.raw.median_tps.toFixed(1)} t/s` : "—",
      getNumericValue: (m) => m.raw.median_tps,
    },
    {
      labelKey: "compare.price",
      icon: DollarSign,
      getValue: (m) => {
        if (m.raw.openrouter_pricing) {
          return `$${m.raw.openrouter_pricing.prompt}/$${m.raw.openrouter_pricing.completion}/M`;
        }
        if (m.raw.input != null) {
          return `$${m.raw.input}/$${m.raw.output}/M`;
        }
        return "—";
      },
      getNumericValue: (m) => {
        // Lower is better for cost
        return m.raw.openrouter_pricing?.completion ?? m.raw.output ?? null;
      },
    },
    {
      labelKey: "compare.arenaVotes",
      icon: Trophy,
      getValue: (m) => m.raw.arena_votes != null ? formatNum(m.raw.arena_votes, 0) : "—",
      getNumericValue: (m) => m.raw.arena_votes,
    },
    {
      labelKey: "compare.contextWindow",
      icon: Layers,
      getValue: (m) => m.raw.context_window != null ? `${formatNum(m.raw.context_window, 0)} tokens` : "—",
      getNumericValue: (m) => m.raw.context_window,
    },
    {
      labelKey: "compare.parameters",
      icon: Weight,
      getValue: (m) => m.raw.parameters != null ? `${formatNum(m.raw.parameters, 0)}B` : "—",
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
    },
    {
      labelKey: "compare.benchmarkHle",
      icon: Brain,
      getValue: (m) => m.raw.benchmarks.hle != null ? formatNum(m.raw.benchmarks.hle) : "—",
      getNumericValue: (m) => m.raw.benchmarks.hle,
    },
  ], []);

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
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-card">
            <table className="w-full min-w-[360px] sm:min-w-[600px]">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="sticky left-0 bg-surface-card z-10 text-left px-2 py-2 sm:px-6 sm:py-4 text-xs font-semibold text-text-muted uppercase tracking-wider min-w-[100px] sm:min-w-[140px] shadow-[2px_0_8px_-4px_rgba(0,0,0,0.15)]">
                    {t("compare.colName")}
                  </th>
                  {models.map((m) => (
                    <th
                      key={m.id}
                      className="px-2 py-2 sm:px-4 sm:py-4 text-center min-w-[120px] sm:min-w-[180px]"
                    >
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="font-semibold text-sm text-text-primary truncate max-w-[140px]">
                          {m.name}
                        </span>
                        <span className="text-[10px] text-text-muted">{m.company}</span>
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] py-0 px-1.5", getTypeBadgeClasses(m.type as "开源" | "闭源"))}
                        >
                          {t(m.type === "开源" ? "common.open" : "common.closed")}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const Icon = row.icon;
                  const values = models.map((m) => row.getNumericValue?.(m) ?? null);
                  const higherIsBetter = row.labelKey !== "compare.price";

                  return (
                    <tr
                      key={ri}
                      className={cn(
                        "border-b border-surface-border last:border-b-0",
                        ri % 2 === 1 ? "bg-surface-elevated/40" : ""
                      )}
                    >
                      <td className="sticky left-0 bg-inherit z-10 px-2 py-2 sm:px-6 sm:py-4 shadow-[2px_0_8px_-4px_rgba(0,0,0,0.15)]">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-text-muted shrink-0" />
                          <span className="text-sm font-medium text-text-primary">{t(row.labelKey)}</span>
                        </div>
                      </td>
                      {models.map((m) => {
                        const numVal = row.getNumericValue?.(m) ?? null;
                        const isBest = isBestValue(numVal, values, higherIsBetter);
                        return (
                          <td
                            key={m.id}
                            className={cn(
                              "px-3 py-3 sm:px-4 sm:py-4 text-center text-sm transition-colors",
                              isBest ? "bg-accent-lime/5" : ""
                            )}
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              {isBest && <Star className="h-3 w-3 text-accent-lime shrink-0" />}
                              <span className={cn(
                                isBest ? "font-semibold text-accent-lime" : "text-text-primary"
                              )}>
                                {row.getValue(m)}
                              </span>
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

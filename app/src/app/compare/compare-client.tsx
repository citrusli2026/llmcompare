"use client";

import { useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { ModelLogo } from "@/components/model-logo";
import { ShareButton } from "@/components/share-button";
import {
  ArrowLeft, Brain, Code, Bot, Zap, DollarSign, Layers, Calendar,
  Trophy, Check, X, TrendingUp, MessageSquare, Eye, Star, Weight,
} from "lucide-react";
import { getModelById, type ModelWithScores } from "@/lib/scoring";
import { getRecommendationTags } from "@/lib/recommendation-tags";
import { useTranslation } from "@/lib/i18n";
import { cn, formatTokenCount, getTypeBadgeClasses, formatParameters } from "@/lib/utils";
import { Tooltip } from "@/components/tooltip";

// ── Helpers ──
function fmt(v: number | null | undefined, decimals = 1): string {
  if (v == null) return "—";
  return v.toFixed(decimals);
}

function isBest(val: number | null, vals: (number | null)[], higher: boolean): boolean {
  if (val == null) return false;
  const valid = vals.filter((v): v is number => v != null);
  if (valid.length < 2) return false;
  return higher ? val >= Math.max(...valid) : val <= Math.min(...valid);
}

// ── Row definition ──
interface CompareRow {
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  getValue: (m: ModelWithScores) => React.ReactNode;
  getNumeric?: (m: ModelWithScores) => number | null;
  higherIsBetter?: boolean;
  tipKey?: string;
}

export function ComparePageClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const restoredRef = useRef(false);

  const modelIds = useMemo(
    () => searchParams.get("models")?.split(",").filter(Boolean) ?? [],
    [searchParams],
  );

  // Restore from localStorage if opened without ?models=
  useEffect(() => {
    if (restoredRef.current || modelIds.length > 0) return;
    if (typeof window === "undefined") return;
    restoredRef.current = true;
    try {
      const stored = window.localStorage.getItem("llmcompare-compare");
      if (!stored) return;
      const ids = stored.split(",").filter(Boolean);
      if (ids.length === 0) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("models", ids.join(","));
      router.replace(`/compare?${params.toString()}`, { scroll: false });
    } catch {}
  }, [modelIds.length, router, searchParams]);

  const models = useMemo(
    () => modelIds.map((id) => getModelById(id)).filter((m): m is ModelWithScores => m != null),
    [modelIds],
  );

  // ── Comparison rows ──
  const rows: CompareRow[] = useMemo(() => [
    { labelKey: "compare.intelligence", icon: Brain,
      getValue: (m) => fmt(m.raw.intelligence), getNumeric: (m) => m.raw.intelligence, higherIsBetter: true, tipKey: "tip.intelligence" },
    { labelKey: "compare.coding", icon: Code,
      getValue: (m) => fmt(m.raw.coding), getNumeric: (m) => m.raw.coding, higherIsBetter: true, tipKey: "tip.coding" },
    { labelKey: "compare.agentic", icon: Bot,
      getValue: (m) => fmt(m.raw.agentic), getNumeric: (m) => m.raw.agentic, higherIsBetter: true, tipKey: "tip.agentic" },
    { labelKey: "compare.speed", icon: Zap,
      getValue: (m) => m.raw.median_tps != null ? `${m.raw.median_tps.toFixed(1)} t/s` : "—",
      getNumeric: (m) => m.raw.median_tps, higherIsBetter: true, tipKey: "tip.speed" },
    { labelKey: "compare.ttft", icon: Zap,
      getValue: (m) => m.raw.ttft_seconds != null ? `${m.raw.ttft_seconds.toFixed(2)}s` : "—",
      getNumeric: (m) => m.raw.ttft_seconds, higherIsBetter: false, tipKey: "tip.ttft" },
    { labelKey: "compare.e2e", icon: Zap,
      getValue: (m) => m.raw.e2e_seconds != null ? `${m.raw.e2e_seconds.toFixed(2)}s` : "—",
      getNumeric: (m) => m.raw.e2e_seconds, higherIsBetter: false, tipKey: "tip.e2e" },
    { labelKey: "compare.price", icon: DollarSign,
      getValue: (m) => {
        const b = m.raw.blended;
        if (b != null) {
          if (b === 0) return <span className="text-accent-lime font-medium">{t("common.free")}</span>;
          return <span className="tabular-nums">${b.toFixed(2)}<span className="text-text-secondary text-[10px]">/M</span></span>;
        }
        return "—";
      },
      getNumeric: (m) => m.raw.blended, higherIsBetter: false, tipKey: "tip.blended" },
    { labelKey: "compare.inputPrice", icon: DollarSign,
      getValue: (m) => {
        const v = m.raw.input;
        if (v != null) {
          if (v === 0) return <span className="text-accent-lime font-medium">{t("common.free")}</span>;
          return <span className="tabular-nums">${v.toFixed(2)}<span className="text-text-secondary text-[10px]">/M</span></span>;
        }
        return "—";
      },
      getNumeric: (m) => m.raw.input, higherIsBetter: false, tipKey: "tip.inputPrice" },
    { labelKey: "compare.outputPrice", icon: DollarSign,
      getValue: (m) => {
        const v = m.raw.output;
        if (v != null) {
          if (v === 0) return <span className="text-accent-lime font-medium">{t("common.free")}</span>;
          return <span className="tabular-nums">${v.toFixed(2)}<span className="text-text-secondary text-[10px]">/M</span></span>;
        }
        return "—";
      },
      getNumeric: (m) => m.raw.output, higherIsBetter: false, tipKey: "tip.outputPrice" },
    { labelKey: "compare.orWeeklyTokens", icon: TrendingUp,
      getValue: (m) => {
        const v = m.raw.openrouter_weekly_tokens;
        if (v == null) return "—";
        const f = formatTokenCount(v);
        return `${f.value}${f.unit}`;
      },
      getNumeric: (m) => m.raw.openrouter_weekly_tokens, higherIsBetter: true, tipKey: "tip.orWeeklyTokens" },
    { labelKey: "compare.contextWindow", icon: Layers,
      getValue: (m) => {
        const v = m.raw.context_window;
        if (v == null) return "—";
        return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v);
      },
      getNumeric: (m) => m.raw.context_window, higherIsBetter: true, tipKey: "tip.contextWindow" },
    { labelKey: "compare.maxOutput", icon: Layers,
      getValue: (m) => {
        const v = m.raw.output_tokens;
        if (v == null) return "—";
        return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v);
      },
      getNumeric: (m) => m.raw.output_tokens, higherIsBetter: true, tipKey: "tip.maxOutput" },
    { labelKey: "compare.parameters", icon: Weight,
      getValue: (m) => m.raw.parameters != null ? formatParameters(m.raw.parameters) : "—",
      tipKey: "tip.parameters" },
    { labelKey: "compare.arenaVotes", icon: Trophy,
      getValue: (m) => m.raw.arena_votes != null ? m.raw.arena_votes.toLocaleString() : "—",
      getNumeric: (m) => m.raw.arena_votes, higherIsBetter: true, tipKey: "tip.arenaVotes" },
    { labelKey: "compare.benchmarkGpqa", icon: Brain,
      getValue: (m) => fmt(m.raw.benchmarks.gpqa), getNumeric: (m) => m.raw.benchmarks.gpqa, higherIsBetter: true, tipKey: "tip.gpqa" },
    { labelKey: "compare.benchmarkHle", icon: Brain,
      getValue: (m) => fmt(m.raw.benchmarks.hle), getNumeric: (m) => m.raw.benchmarks.hle, higherIsBetter: true, tipKey: "tip.hle" },
    { labelKey: "compare.benchmarkMmluPro", icon: Brain,
      getValue: (m) => fmt(m.raw.benchmarks.mmlu_pro), getNumeric: (m) => m.raw.benchmarks.mmlu_pro, higherIsBetter: true, tipKey: "tip.mmluPro" },
    { labelKey: "compare.releaseDate", icon: Calendar,
      getValue: (m) => m.raw.release_date ?? "—" },
    { labelKey: "common.reasoning", icon: MessageSquare,
      getValue: (m) => m.flags.reasoning ? <Check className="h-4 w-4 text-accent-lime" /> : <X className="h-4 w-4 text-text-muted" /> },
    { labelKey: "common.imageInput", icon: Eye,
      getValue: (m) => m.flags.image_input ? <Check className="h-4 w-4 text-accent-lime" /> : <X className="h-4 w-4 text-text-muted" /> },
    { labelKey: "common.openWeights", icon: Star,
      getValue: (m) => m.flags.open_weights ? <Check className="h-4 w-4 text-accent-lime" /> : <X className="h-4 w-4 text-text-muted" /> },
  ], [t]);

  // ── Empty state ──
  if (models.length < 2) {
    return (
      <div className="min-h-screen bg-surface-base">
        <Navbar />
        <div className="px-4 py-12 sm:px-6 lg:px-8 text-center">
          <div className="mx-auto max-w-md">
            <h1 className="text-2xl font-bold text-text-primary mb-3">{t("compare.title")}</h1>
            <p className="text-text-secondary mb-6">{t("compare.needTwo")}</p>
            <Link
              href="/models"
              className="inline-flex items-center gap-2 rounded-lg bg-accent-violet text-white px-5 py-2.5 text-sm font-medium hover:bg-violet-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("compare.backToModels")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <div className="px-4 py-6 sm:py-10 sm:px-6 lg:px-8 pb-24">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="rounded-lg p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                aria-label={t("compare.back")}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t("compare.title")}</h1>
            </div>
            <ShareButton size="sm" variant="ghost" />
          </div>

          {/* Model cards header */}
          <div className={cn(
            "grid gap-3 mb-1",
            models.length === 2 ? "grid-cols-2" : "grid-cols-3",
          )}>
            {models.map((model) => {
              const tags = getRecommendationTags(model);
              return (
                <div
                  key={model.id}
                  className="rounded-xl border border-surface-border bg-surface-card p-3 sm:p-4"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <ModelLogo src={model.logo} name={model.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/models/${model.id}`}
                        className="text-sm sm:text-base font-semibold text-text-primary hover:text-accent-violet transition-colors truncate block"
                      >
                        {model.name}
                      </Link>
                      <div className="text-xs text-text-muted">{model.company}</div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px] py-0 px-1 h-[18px] shrink-0", getTypeBadgeClasses(model.type))}
                    >
                      {t(model.type === "开源" ? "common.open" : "common.closed")}
                    </Badge>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag.key}
                          className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[10px] font-medium", tag.colorClass)}
                        >
                          {tag.icon} {t(tag.labelKey)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Comparison table */}
          <div className="rounded-xl border border-surface-border bg-surface-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-2 sm:px-4 py-2.5 text-text-muted font-medium w-[110px] sm:w-[180px] text-xs sm:text-sm">
                    {t("compare.metric")}
                  </th>
                  {models.map((m) => (
                    <th key={m.id} className="text-center px-3 py-2.5 text-text-primary font-semibold">
                      <span className="truncate block max-w-[120px] sm:max-w-none mx-auto">{m.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const Icon = row.icon;
                  const numericVals = row.getNumeric ? models.map(row.getNumeric) : [];
                  return (
                    <tr key={row.labelKey} className={cn("border-surface-border", i < rows.length - 1 && "border-b")}>
                      <td className="px-2 sm:px-4 py-2.5 text-text-secondary">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-text-muted shrink-0" />
                          {row.tipKey ? (
                            <Tooltip content={t(row.tipKey)}><span className="text-xs sm:text-sm">{t(row.labelKey)}</span></Tooltip>
                          ) : (
                            <span className="text-xs sm:text-sm">{t(row.labelKey)}</span>
                          )}
                        </div>
                      </td>
                      {models.map((m) => {
                        const val = row.getValue(m);
                        const numVal = row.getNumeric?.(m) ?? null;
                        const highlight = row.higherIsBetter != null && numericVals.length >= 2
                          && isBest(numVal, numericVals, row.higherIsBetter);
                        return (
                          <td
                            key={m.id}
                            className={cn(
                              "text-center px-3 py-2.5 tabular-nums",
                              highlight ? "font-bold text-accent-lime" : "text-text-primary",
                            )}
                          >
                            <span className="inline-flex items-center justify-center min-h-[1.25rem]">
                              {val}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer CTA */}
          <div className="mt-6 text-center">
            <Link
              href="/models"
              className="text-sm text-text-muted hover:text-accent-violet transition-colors"
            >
              ← {t("compare.backToModels")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Bot, TrendingUp, ArrowRight } from "lucide-react";
import { getRecommendationTags } from "@/lib/recommendation-tags";
import { getAllModelsUnfiltered } from "@/lib/scoring";
import { StatsStrip } from "@/components/stats-strip";
import { CompareBar } from "@/components/compare-bar";
import { SearchInput } from "@/components/search-input";
import { SceneSelector } from "@/components/scene-selector";
import { useTranslation } from "@/lib/i18n";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { cn } from "@/lib/utils";

export default function HomeClient() {
  const { t } = useTranslation();

  const allModels = useMemo(() => getAllModelsUnfiltered(), []);

  // Top picks: top 5 by intelligence score (compact recommendation strip)
  const topPicks = useMemo(() => {
    return [...allModels]
      .filter((m) => m.raw.intelligence != null)
      .sort((a, b) => (b.raw.intelligence ?? 0) - (a.raw.intelligence ?? 0))
      .slice(0, 5);
  }, [allModels]);

  // Compare selection from URL params (via shared hook)
  const { selectedCompareModels, handleRemoveCompare, handleClearCompare } = useCompareIds();

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      {/* Hero Section — Selection Assistant Entry Point */}
      <section
        className="relative overflow-hidden px-4 pt-10 sm:pt-16 lg:px-8"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(106,95,193,0.15) 0%, transparent 60%)",
        }}
      >
        <div className="mx-auto max-w-5xl text-center relative z-10">
          <Link href="/models" className="hidden sm:inline-block">
            <Badge
              variant="secondary"
              className="mb-4 bg-accent-lime/10 text-accent-lime hover:bg-accent-lime/20 border-accent-lime/20 cursor-pointer"
            >
              <TrendingUp className="mr-1 h-3 w-3" />
              {t("home.badge")}
            </Badge>
          </Link>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-text-primary">
            {t("home.heroTitle")}
          </h1>

          <p className="mt-3 text-sm sm:text-base md:text-lg text-text-secondary max-w-2xl mx-auto">
            {t("home.heroDesc")}
          </p>
        </div>

        {/* Scene Selection Cards — inline in hero */}
        <SceneSelector hideHeader />
      </section>

      {/* Model Directory Table — moved before StatsStrip on mobile via ordering */}
      <section className="px-4 pt-4 pb-4 sm:px-6 lg:px-8 order-first sm:order-none">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-accent-violet" />
              <h2 className="text-lg sm:text-xl font-bold text-text-primary">{t("home.topPicks")}</h2>
            </div>
            <Link
              href="/models"
              className="flex items-center gap-1 text-sm text-accent-violet hover:text-violet-500 transition-colors"
            >
              {t("home.viewAllModels", { n: allModels.length })}
            </Link>
          </div>

          {/* Compact horizontal cards — 5 models, wraps to 2 rows on small screens */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {topPicks.map((model) => (
              <Link
                key={model.id}
                href={`/product/${model.id}`}
                className="rounded-xl border border-surface-border bg-surface-card p-3 sm:p-4 transition-all duration-200 hover:border-accent-violet/30 hover:shadow-md hover:-translate-y-0.5 group"
              >
                {/* Logo + Name row */}
                <div className="flex items-start gap-2.5 mb-2">
                  <div className="h-8 w-8 rounded shrink-0 bg-surface-base flex items-center justify-center overflow-hidden">
                    {model.logo ? (
                      <img
                        src={model.logo}
                        alt=""
                        className="h-6 w-6 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-text-muted">
                        {model.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-text-primary truncate group-hover:text-accent-violet transition-colors">
                      {model.name}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {model.company}
                    </div>
                  </div>
                </div>

                {/* Intelligence score */}
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-accent-violet">
                    {model.raw.intelligence?.toFixed(1) ?? "—"}
                  </span>
                  <span className="text-xs text-text-muted">{t("models.colIntelligence")}</span>
                </div>

                {/* Type badge */}
                <div className="mt-1.5">
                  <span className={cn(
                    "inline-block text-[10px] font-medium px-1.5 py-0.5 rounded",
                    model.type === "开源"
                      ? "bg-accent-lime/10 text-accent-lime"
                      : "bg-accent-violet/10 text-accent-violet"
                  )}>
                    {model.type}
                  </span>
                </div>

                {/* Recommendation tag — why this model is a top pick */}
                {getRecommendationTags(model).length > 0 && (
                  <div className="mt-1.5">
                    <span className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[10px] font-medium",
                      getRecommendationTags(model)[0].colorClass
                    )}>
                      <span>{getRecommendationTags(model)[0].icon}</span>
                      <span className="truncate max-w-[6rem]">{t(getRecommendationTags(model)[0].labelKey)}</span>
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* StatsStrip — below model list on all sizes */}
      <StatsStrip />

      {/* Footer */}
      <footer className="border-t border-surface-border bg-surface-elevated px-4 py-8 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-7xl text-center text-sm text-text-muted">
          <p>{t("home.footer")}</p>
          <p className="mt-1">{t("home.footerDisclaimer")}</p>
        </div>
      </footer>

      <CompareBar
        selectedModels={selectedCompareModels}
        onRemoveModel={handleRemoveCompare}
        onClear={handleClearCompare}
      />
    </div>
  );
}

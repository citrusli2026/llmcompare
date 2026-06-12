"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getAllModels, ModelType } from "@/lib/scoring";
import { RankingTable } from "@/components/ranking-table";
import type { SortKey } from "@/components/ranking-table/types";
import { FilterBar, type FilterOption } from "@/components/filter-bar";
import { useTranslation } from "@/lib/i18n";
import { Bot, SearchX, X, Sparkles, Trophy, TrendingUp } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { ModelLogo } from "@/components/model-logo";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { CompareBar } from "@/components/compare-bar";

type FilterKey = "all" | "open" | "closed";

const FILTERS: { key: FilterKey; labelKey: string; matchValue: string | undefined }[] = [
  { key: "all", labelKey: "models.filterAll", matchValue: undefined },
  { key: "open", labelKey: "models.filterOpen", matchValue: ModelType.Open },
  { key: "closed", labelKey: "models.filterClosed", matchValue: ModelType.Closed },
];

function isFilterKey(value: string): value is FilterKey {
  return FILTERS.some((f) => f.key === value);
}

function matchValueFor(key: FilterKey): string | undefined {
  return FILTERS.find((f) => f.key === key)?.matchValue;
}

export default function ModelsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const initialFilterRaw = searchParams.get("filter") ?? "all";
  const initialFilter: FilterKey = isFilterKey(initialFilterRaw) ? initialFilterRaw : "all";
  const initialSort = searchParams.get("sort") as SortKey | null;

  const [activeFilter, setActiveFilter] = useState<FilterKey>(initialFilter);

  // Compare feature
  const { selectedModels, isInCompare, isAtMax, toggleCompare, removeCompare, clearCompare, maxCompare } = useCompareIds();

  const updateUrl = useCallback(
    (filter: FilterKey) => {
      const params = new URLSearchParams(searchParams.toString());
      if (filter !== "all") {
        params.set("filter", filter);
      } else {
        params.delete("filter");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleFilterChange = useCallback(
    (key: string) => {
      if (!isFilterKey(key)) return;
      setActiveFilter(key);
      updateUrl(key);
    },
    [updateUrl]
  );

  const filterOptions: FilterOption[] = useMemo(
    () => FILTERS.map((f) => ({ key: f.key, label: t(f.labelKey) })),
    [t]
  );

  const allModels = useMemo(() => getAllModels(), []);

  const filteredModels = useMemo(() => {
    const filterMatchValue = matchValueFor(activeFilter);
    return allModels.filter((m) =>
      activeFilter === "all" ? true : m.type === filterMatchValue
    );
  }, [allModels, activeFilter]);

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setActiveFilter("all");
    router.replace("/models", { scroll: false });
  }, [router]);

  // Fallback: top 8 by intelligence for empty state recommendations
  const fallbackModels = useMemo(() => {
    return [...allModels]
      .filter((m) => m.raw.intelligence != null)
      .sort((a, b) => (b.raw.intelligence ?? 0) - (a.raw.intelligence ?? 0))
      .slice(0, 8);
  }, [allModels]);

  // Detect if any filter is active
  const hasActiveFilters = activeFilter !== "all";

  const isEmpty = filteredModels.length === 0;

  // Top picks from filtered results — top 3 by intelligence
  const topPicks = useMemo(() => {
    if (isEmpty) return [];
    return [...filteredModels]
      .filter((m) => m.raw.intelligence != null)
      .sort((a, b) => (b.raw.intelligence ?? 0) - (a.raw.intelligence ?? 0))
      .slice(0, 3);
  }, [filteredModels, isEmpty]);

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <div className="px-4 py-6 sm:py-12 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 sm:mb-8 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2 sm:mb-4">
                <Bot className="h-7 w-7 sm:h-8 sm:w-8 text-accent-violet" />
                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{t("models.title")}</h1>
              </div>
              <p className="hidden sm:block text-text-secondary">
                {t("models.desc")}
              </p>
            </div>
            <ShareButton size="sm" variant="ghost" className="shrink-0 mt-1" />
          </div>

          {/* 筛选条件 — 全部/开源/闭源 */}
          <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2">
            <FilterBar
              options={filterOptions}
              activeKey={activeFilter}
              onFilterChange={handleFilterChange}
            />
          </div>

          {isEmpty ? (
            /* Empty State — guidance instead of a dead-end */
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-elevated border border-surface-border">
                <SearchX className="h-7 w-7 text-text-muted" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-1">{t("models.emptyState")}</h3>
              <p className="text-sm text-text-secondary max-w-sm mb-6">{t("models.emptySuggestion")}</p>

              {hasActiveFilters && (
                <button
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-medium text-text-primary hover:border-accent-violet/30 hover:text-accent-violet hover:bg-accent-violet/5 transition-all mb-10"
                >
                  <X className="h-3.5 w-3.5" />
                  {t("models.emptyClear")}
                </button>
              )}

              {/* Fallback recommendations — top models by intelligence */}
              <div className="w-full max-w-xl">
                <div className="flex items-center gap-2 mb-4 justify-center">
                  <Sparkles className="h-4 w-4 text-accent-violet" />
                  <span className="text-sm font-medium text-text-secondary">{t("home.topPicks")}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {fallbackModels.map((model) => (
                    <Link
                      key={model.id}
                      href={`/models/${model.id}`}
                      className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card p-2.5 transition-all hover:border-accent-violet/30 hover:shadow-sm hover:-translate-y-0.5 group"
                    >
                      <ModelLogo src={model.logo} name={model.name} size="md" />
                      <div className="min-w-0 flex-1 text-left">
                        <div className="text-xs font-medium text-text-primary truncate group-hover:text-accent-violet transition-colors">
                          {model.name}
                        </div>
                        <div className="text-[10px] text-text-muted truncate">
                          {model.raw.intelligence?.toFixed(1) ?? "—"}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Recommendation banner — top 3 picks when results exist */}
              {topPicks.length > 0 && (
                <div className="mb-4 rounded-xl border border-accent-violet/20 bg-accent-violet/5 p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-accent-violet" />
                    <span className="text-sm font-semibold text-text-primary">{t("models.recommendTitle")}</span>
                    <span className="text-xs text-text-muted">{t(hasActiveFilters ? "models.recommendDesc" : "models.recommendFirstLoadDesc")}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {topPicks.map((model) => (
                      <Link
                        key={model.id}
                        href={`/models/${model.id}`}
                        className="flex items-center gap-2.5 rounded-lg bg-surface-card border border-surface-border px-3 py-2.5 transition-all hover:border-accent-violet/30 hover:shadow-sm hover:-translate-y-0.5 group"
                      >
                        <ModelLogo src={model.logo} name={model.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-text-primary truncate group-hover:text-accent-violet transition-colors">
                            {model.name}
                          </div>
                          <div className="text-[10px] text-text-muted truncate">
                            {t("models.colIntelligence")} {model.raw.intelligence?.toFixed(1) ?? "—"}
                          </div>
                        </div>
                        <TrendingUp className="h-3 w-3 text-text-muted shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <RankingTable
                models={filteredModels}
                initialSortKey={initialSort ?? undefined}
                compare={{ isInCompare, isAtMax, onToggle: toggleCompare }}
              />
              <div className="mt-8 text-center text-sm text-text-muted">
                {t("models.count", { count: String(filteredModels.length) })}
              </div>
            </>
          )}
        </div>
      </div>
      <CompareBar
        selectedModels={selectedModels}
        onRemoveModel={removeCompare}
        onClear={clearCompare}
        maxCompare={maxCompare}
      />
    </div>
  );
}

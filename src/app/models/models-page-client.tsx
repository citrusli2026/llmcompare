"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getAllModelsUnfiltered } from "@/lib/scoring";
import { RankingTable } from "@/components/ranking-table";
import type { SortKey } from "@/components/ranking-table/types";
import { FilterBar, type FilterOption } from "@/components/filter-bar";
import { FeatureFilter, type FeatureKey } from "@/components/feature-filter";
import { SearchInput } from "@/components/search-input";
import { CompareBar } from "@/components/compare-bar";
import { useTranslation } from "@/lib/i18n";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { cn } from "@/lib/utils";
import { Bot, SearchX, X, Sparkles, Trophy, Code, DollarSign, Home, TrendingUp } from "lucide-react";

const FILTER_KEYS = ["全部", "开源", "闭源"] as const;
type Filter = (typeof FILTER_KEYS)[number];

const FEATURE_KEYS: FeatureKey[] = ["frontier", "reasoning", "image_input", "chinese_eval", "open_weights"];

function parseFeatures(param: string | null): Set<FeatureKey> {
  if (!param) return new Set();
  const keys = param.split(",").filter((k): k is FeatureKey =>
    FEATURE_KEYS.includes(k as FeatureKey)
  );
  return new Set(keys);
}

export default function ModelsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const initialQuery = searchParams.get("q") ?? "";
  const initialFilter = (searchParams.get("filter") as Filter) ?? "全部";
  const initialCompany = searchParams.get("company") ?? "";

  const [activeFilter, setActiveFilter] = useState<Filter>(
    FILTER_KEYS.includes(initialFilter) ? initialFilter : "全部"
  );
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [companyFilter, setCompanyFilter] = useState(initialCompany);
  const [featureKeys, setFeatureKeys] = useState<Set<FeatureKey>>(
    parseFeatures(searchParams.get("feature"))
  );

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateUrl = useCallback(
    (query: string, filter: Filter, company: string, features: Set<FeatureKey>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      if (filter !== "全部") {
        params.set("filter", filter);
      } else {
        params.delete("filter");
      }
      if (company) {
        params.set("company", company);
      } else {
        params.delete("company");
      }
      if (features.size > 0) {
        params.set("feature", [...features].join(","));
      } else {
        params.delete("feature");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Refs to prevent stale closure in debounce/timeouts
  const activeFilterRef = useRef(activeFilter);
  const companyFilterRef = useRef(companyFilter);
  const searchQueryRef = useRef(searchQuery);
  const featureKeysRef = useRef(featureKeys);
  useEffect(() => { activeFilterRef.current = activeFilter; }, [activeFilter]);
  useEffect(() => { companyFilterRef.current = companyFilter; }, [companyFilter]);
  useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);
  useEffect(() => { featureKeysRef.current = featureKeys; }, [featureKeys]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        updateUrl(value, activeFilterRef.current, companyFilterRef.current, featureKeysRef.current);
      }, 300);
    },
    [updateUrl]
  );

  const handleFilterChange = useCallback(
    (key: string) => {
      const filter = key as Filter;
      setActiveFilter(filter);
      updateUrl(searchQueryRef.current, filter, companyFilterRef.current, featureKeysRef.current);
    },
    [updateUrl]
  );

  const handleCompanyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const company = e.target.value;
      setCompanyFilter(company);
      updateUrl(searchQueryRef.current, activeFilterRef.current, company, featureKeysRef.current);
    },
    [updateUrl]
  );

  const handleFeatureToggle = useCallback(
    (key: FeatureKey) => {
      setFeatureKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        // Update URL synchronously with new set
        updateUrl(searchQueryRef.current, activeFilterRef.current, companyFilterRef.current, next);
        return next;
      });
    },
    [updateUrl]
  );

  const filterOptions: FilterOption[] = useMemo(
    () =>
      FILTER_KEYS.map((key) => ({
        key,
        label: t(
          key === "全部"
            ? "models.filterAll"
            : key === "开源"
            ? "models.filterOpen"
            : "models.filterClosed"
        ),
      })),
    [t]
  );

  const allModels = useMemo(() => getAllModelsUnfiltered(), []);

  const companies = useMemo(
    () => [...new Set(allModels.map((m) => m.company).filter(Boolean))].sort(),
    [allModels]
  );

  // Compare selection from URL params (via shared hook)
  const { selectedCompareModels, handleRemoveCompare, handleClearCompare } = useCompareIds();

  const filteredModels = useMemo(() => {
    return allModels.filter((m) => {
      const matchesFilter =
        activeFilter === "全部" ? true : m.type === activeFilter;
      const matchesCompany =
        companyFilter === "" ? true : m.company === companyFilter;
      const matchesSearch =
        searchQuery === ""
          ? true
          : m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFeatures =
        featureKeys.size === 0
          ? true
          : [...featureKeys].every((k) => Boolean(m.flags[k]));
      return matchesFilter && matchesCompany && matchesSearch && matchesFeatures;
    });
  }, [allModels, activeFilter, companyFilter, searchQuery, featureKeys]);

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setActiveFilter("全部");
    setSearchQuery("");
    setCompanyFilter("");
    setFeatureKeys(new Set());
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
  const hasActiveFilters = activeFilter !== "全部" || searchQuery !== "" || companyFilter !== "" || featureKeys.size > 0;

  const isEmpty = filteredModels.length === 0;

  // Top picks from filtered results — top 3 by intelligence
  const topPicks = useMemo(() => {
    if (isEmpty) return [];
    return [...filteredModels]
      .filter((m) => m.raw.intelligence != null)
      .sort((a, b) => (b.raw.intelligence ?? 0) - (a.raw.intelligence ?? 0))
      .slice(0, 3);
  }, [filteredModels, isEmpty]);

  // Initial sort key from URL (for scene sort)
  const initialSort = searchParams.get("sort") as SortKey | null;

  // Scene sort buttons
  const SCENE_SORTS: { key: string; icon: React.ComponentType<{ className?: string }>; labelKey: string; sortKey: SortKey }[] = [
    { key: "intelligence", icon: Trophy, labelKey: "models.sortByIntelligence", sortKey: "intelligence" },
    { key: "coding", icon: Code, labelKey: "models.sortByCoding", sortKey: "coding" },
    { key: "agentic", icon: Bot, labelKey: "models.sortByAgent", sortKey: "agentic" },
    { key: "cost", icon: DollarSign, labelKey: "models.sortByValue", sortKey: "cost" },
  ];

  const handleSceneSort = (sortKey: SortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sortKey);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <div className="px-4 py-6 sm:py-12 sm:px-6 lg:px-8 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 sm:mb-8">
            <div className="flex items-center gap-3 mb-2 sm:mb-4">
              <Bot className="h-7 w-7 sm:h-8 sm:w-8 text-accent-violet" />
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{t("models.title")}</h1>
            </div>
            <p className="hidden sm:block text-text-secondary">
              {t("models.desc")}
            </p>
          </div>

          {/* 搜索框—独立一行 */}
          <div className="mb-4 sm:mb-6 w-full sm:w-auto">
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={t("models.searchPlaceholder")}
              className="max-w-none sm:max-w-md w-full"
            />
          </div>

          {/* 筛选条件 — 统一排版 */}
          <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2">
            <FilterBar
              options={filterOptions}
              activeKey={activeFilter}
              onFilterChange={handleFilterChange}
            />
            <div className="h-5 w-px bg-surface-border mx-0.5 hidden sm:block" />
            <select
              value={companyFilter}
              onChange={handleCompanyChange}
              className="h-9 rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet/40"
            >
              <option value="">{t("models.filterAllCompanies")}</option>
              {companies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="h-5 w-px bg-surface-border mx-0.5 hidden sm:block" />
            <FeatureFilter
              activeKeys={featureKeys}
              onToggle={handleFeatureToggle}
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
                      href={`/product/${model.id}`}
                      className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card p-2.5 transition-all hover:border-accent-violet/30 hover:shadow-sm hover:-translate-y-0.5 group"
                    >
                      <div className="h-8 w-8 rounded shrink-0 bg-surface-base flex items-center justify-center overflow-hidden">
                        {model.logo ? (
                          <img src={model.logo} alt="" className="h-5 w-5 object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <span className="text-xs font-bold text-text-muted">{model.name.charAt(0)}</span>
                        )}
                      </div>
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
                        href={`/product/${model.id}`}
                        className="flex items-center gap-2.5 rounded-lg bg-surface-card border border-surface-border px-3 py-2.5 transition-all hover:border-accent-violet/30 hover:shadow-sm hover:-translate-y-0.5 group"
                      >
                        <div className="h-7 w-7 rounded shrink-0 bg-surface-base flex items-center justify-center overflow-hidden">
                          {model.logo ? (
                            <img src={model.logo} alt="" className="h-4 w-4 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <span className="text-xs font-bold text-text-muted">{model.name.charAt(0)}</span>
                          )}
                        </div>
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

              {/* Scene sort bar — always visible, not just when filters are active */}
              <div className={cn(
                "mb-4",
                !hasActiveFilters && "rounded-xl border border-accent-violet/10 bg-accent-violet/[0.02] p-3 sm:p-4"
              )}>
                <div className="flex flex-wrap items-center gap-1.5">
                  {!hasActiveFilters && (
                    <span className="flex items-center gap-1.5 text-xs text-text-muted mr-1 whitespace-nowrap">
                      <span className="hidden sm:inline w-px h-3 bg-accent-violet/20" />
                      {t("models.sortBy")}：
                    </span>
                  )}
                  {SCENE_SORTS.map((scene) => {
                  const SceneIcon = scene.icon;
                  const isActiveSort = initialSort === scene.sortKey || (!initialSort && scene.sortKey === "intelligence");
                  return (
                    <button
                      key={scene.key}
                      onClick={() => handleSceneSort(scene.sortKey)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                        isActiveSort
                          ? "border-accent-violet/30 bg-accent-violet/10 text-accent-violet"
                          : "border-surface-border bg-surface-card text-text-secondary hover:border-accent-violet/20 hover:text-accent-violet"
                      )}
                    >
                      <SceneIcon className="h-3 w-3" />
                      {t(scene.labelKey)}
                    </button>
                  );
                })}
                </div>
              </div>

              {/* Scene context indicator — shows when user arrived from home page scene selection */}
              {initialSort && ["intelligence", "coding", "agentic", "cost"].includes(initialSort) && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-accent-violet/10 bg-accent-violet/[0.03] px-4 py-3">
                  <span className="text-sm">🎯</span>
                  <span className="text-sm text-text-primary font-medium">
                    {t("models.sceneBrowsing", {
                      scene: t(
                        initialSort === "intelligence"
                          ? "models.sortByIntelligence"
                          : initialSort === "coding"
                          ? "models.sortByCoding"
                          : initialSort === "agentic"
                          ? "models.sortByAgent"
                          : "models.sortByValue"
                      ),
                    })}
                  </span>
                  <Link
                    href="/"
                    className="ml-auto flex items-center gap-1 text-xs text-accent-violet hover:text-violet-500 transition-colors whitespace-nowrap"
                  >
                    <Home className="h-3 w-3" />
                    {t("models.sceneBrowsingBack")}
                  </Link>
                </div>
              )}

              <RankingTable models={filteredModels} initialSortKey={initialSort ?? undefined} />
              <div className="mt-8 text-center text-sm text-text-muted">
                {t("models.count", { count: String(filteredModels.length) })}
              </div>
            </>
          )}
        </div>
      </div>

      <CompareBar
        selectedModels={selectedCompareModels}
        onRemoveModel={handleRemoveCompare}
        onClear={handleClearCompare}
      />
    </div>
  );
}

"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { getAllModels, ModelType } from "@/lib/scoring";
import { RankingTable } from "@/components/ranking-table";
import type { SortKey } from "@/components/ranking-table/types";
import { FilterBar, type FilterOption } from "@/components/filter-bar";
import { filterModels, hasActiveFilters, listCompanies } from "@/lib/filter-models";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Bot, Search, SearchX, X, Sparkles, ArrowLeftRight, ChevronDown } from "lucide-react";
import { ShareButton } from "@/components/share-button";
import { ModelLogo } from "@/components/model-logo";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { CompareBar } from "@/components/compare-bar";

type FilterKey = "open" | "closed";

const FILTERS: { key: FilterKey; labelKey: string; matchValue: string | undefined }[] = [
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

  const initialFilterRaw = searchParams.get("filter") ?? "open";
  const initialFilter: FilterKey = isFilterKey(initialFilterRaw) ? initialFilterRaw : "open";
  const initialSort = searchParams.get("sort") as SortKey | null;
  const initialQuery = searchParams.get("q") ?? "";
  const initialCompany = searchParams.get("company") ?? "";

  const [activeFilter, setActiveFilter] = useState<FilterKey>(initialFilter);
  const [query, setQuery] = useState(initialQuery);
  const [company, setCompany] = useState(initialCompany);

  // 开源默认按用量（tokens），闭源默认按智能（intelligence）
  const defaultSortKey: SortKey = activeFilter === "open" ? "tokens" : "intelligence";
  const initialSortKey = initialSort ?? defaultSortKey;

  // Compare feature
  const [compareActive, setCompareActive] = useState(false);
  const { selectedModels, isInCompare, isAtMax, toggleCompare, removeCompare, clearCompare, maxCompare } = useCompareIds();

  const handleToggleCompareMode = useCallback(() => {
    setCompareActive((prev) => {
      // When turning OFF compare mode, clear selections
      // Use queueMicrotask to avoid setState-during-render warning
      if (prev) queueMicrotask(() => clearCompare());
      return !prev;
    });
  }, [clearCompare]);

  // URL 同步：filter 始终写入；q / company 为空时删除参数，保持 URL 干净
  const updateUrl = useCallback(
    (updates: { filter?: FilterKey; q?: string; company?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.filter !== undefined) params.set("filter", updates.filter);
      if (updates.q !== undefined) {
        if (updates.q) params.set("q", updates.q);
        else params.delete("q");
      }
      if (updates.company !== undefined) {
        if (updates.company) params.set("company", updates.company);
        else params.delete("company");
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/models", { scroll: false });
    },
    [router, searchParams]
  );

  const handleFilterChange = useCallback(
    (key: string) => {
      if (!isFilterKey(key)) return;
      setActiveFilter(key);
      updateUrl({ filter: key });
    },
    [updateUrl]
  );

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setQuery(q);
      updateUrl({ q });
    },
    [updateUrl]
  );

  const handleCompanyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const c = e.target.value;
      setCompany(c);
      updateUrl({ company: c });
    },
    [updateUrl]
  );

  const filterOptions: FilterOption[] = useMemo(
    () => FILTERS.map((f) => ({ key: f.key, label: t(f.labelKey) })),
    [t]
  );

  const allModels = useMemo(() => getAllModels(), []);

  // 公司下拉选项：全量模型去重，按模型数降序
  const companyOptions = useMemo(() => listCompanies(allModels), [allModels]);

  const filteredModels = useMemo(
    () =>
      filterModels(allModels, {
        type: matchValueFor(activeFilter),
        query,
        company,
      }),
    [allModels, activeFilter, query, company]
  );

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setActiveFilter("open");
    setQuery("");
    setCompany("");
    router.replace("/models", { scroll: false });
  }, [router]);

  // Fallback: top 8 by intelligence for empty state recommendations
  const fallbackModels = useMemo(() => {
    return [...allModels]
      .filter((m) => m.raw.intelligence != null)
      .sort((a, b) => (b.raw.intelligence ?? 0) - (a.raw.intelligence ?? 0))
      .slice(0, 8);
  }, [allModels]);

  // 由实际筛选状态推导（默认：开源 + 无搜索词 + 全部公司）
  const filtersActive = hasActiveFilters(
    { type: matchValueFor(activeFilter), query, company },
    ModelType.Open
  );

  const isEmpty = filteredModels.length === 0;

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

          {/* 筛选条件 — 搜索 + 公司 + 开源/闭源 + 对比模式 */}
          <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                value={query}
                onChange={handleQueryChange}
                placeholder={t("models.searchPlaceholder")}
                aria-label={t("models.searchAriaLabel")}
                className="w-full rounded-lg border border-surface-border bg-surface-card py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
              />
            </div>
            <div className="relative">
              <select
                value={company}
                onChange={handleCompanyChange}
                aria-label={t("models.companyAriaLabel")}
                className="appearance-none rounded-lg border border-surface-border bg-surface-card py-2 pl-3 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet/30"
              >
                <option value="">{t("models.companyAll")}</option>
                {companyOptions.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.count})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            </div>
            <FilterBar
              options={filterOptions}
              activeKey={activeFilter}
              onFilterChange={handleFilterChange}
            />
            <button
              onClick={handleToggleCompareMode}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all",
                compareActive
                  ? "border-accent-violet bg-accent-violet/10 text-accent-violet"
                  : "border-surface-border bg-surface-card text-text-secondary hover:border-accent-violet/30 hover:text-accent-violet"
              )}
            >
              {t(compareActive ? "compare.modeOn" : "compare.startCompare")}
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {isEmpty ? (
            /* Empty State — guidance instead of a dead-end */
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-elevated border border-surface-border">
                <SearchX className="h-7 w-7 text-text-muted" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-1">{t("models.emptyState")}</h3>
              <p className="text-sm text-text-secondary max-w-sm mb-6">{t("models.emptySuggestion")}</p>

              {filtersActive && (
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
              <RankingTable
                key={activeFilter}
                models={filteredModels}
                initialSortKey={initialSortKey}
                compare={{ isInCompare, isAtMax, onToggle: toggleCompare, active: compareActive }}
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
        active={compareActive}
        onToggleActive={handleToggleCompareMode}
      />
    </div>
  );
}

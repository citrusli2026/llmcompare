"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { RankingTable } from "@/components/ranking-table";
import { FilterBar, type FilterOption } from "@/components/filter-bar";
import { SearchInput } from "@/components/search-input";
import { CompareBar } from "@/components/compare-bar";

import { Bot } from "lucide-react";
import { getAllModelsUnfiltered, getModelById, type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

const FILTER_KEYS = ["全部", "开源", "闭源"] as const;
type Filter = (typeof FILTER_KEYS)[number];

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

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateUrl = useCallback(
    (query: string, filter: Filter, company: string) => {
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
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        updateUrl(value, activeFilter, companyFilter);
      }, 300);
    },
    [activeFilter, updateUrl, companyFilter]
  );

  const handleFilterChange = useCallback(
    (key: string) => {
      const filter = key as Filter;
      setActiveFilter(filter);
      updateUrl(searchQuery, filter, companyFilter);
    },
    [searchQuery, updateUrl, companyFilter]
  );

  const handleCompanyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const company = e.target.value;
      setCompanyFilter(company);
      updateUrl(searchQuery, activeFilter, company);
    },
    [searchQuery, activeFilter, updateUrl]
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

  // Compare selection from URL params
  const compareFromUrl = useMemo(
    () => searchParams.get("compare")?.split(",").filter(Boolean) ?? [],
    [searchParams]
  );
  const selectedCompareModels = useMemo(
    () => compareFromUrl.map((id) => getModelById(id)).filter((m): m is ModelWithScores => m != null),
    [compareFromUrl]
  );

  const handleRemoveCompare = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const remaining = compareFromUrl.filter((cid) => cid !== id);
      if (remaining.length > 0) {
        params.set("compare", remaining.join(","));
      } else {
        params.delete("compare");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, compareFromUrl]
  );

  const handleClearCompare = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("compare");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

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
      return matchesFilter && matchesCompany && matchesSearch;
    });
  }, [allModels, activeFilter, companyFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <div className="px-4 py-6 sm:py-12 sm:px-6 lg:px-8">
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

          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <FilterBar
              options={filterOptions}
              activeKey={activeFilter}
              onFilterChange={handleFilterChange}
            />
            <div className="flex gap-3 flex-1">
              <select
                value={companyFilter}
                onChange={handleCompanyChange}
                className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-violet/40"
              >
                <option value="">{t("models.filterAllCompanies")}</option>
                {companies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <SearchInput
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={t("models.searchPlaceholder")}
              />
            </div>
          </div>

          <RankingTable models={filteredModels} />

          <div className="mt-8 text-center text-sm text-text-muted">
            {t("models.count", { count: String(filteredModels.length) })}
          </div>
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

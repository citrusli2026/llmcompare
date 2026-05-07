"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { RankingTable } from "@/components/ranking-table";
import { FilterBar, type FilterOption } from "@/components/filter-bar";
import { SearchInput } from "@/components/search-input";

import { Bot } from "lucide-react";
import { getAllModelsUnfiltered } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

const FILTER_KEYS = ["全部", "开源", "闭源"] as const;
type Filter = (typeof FILTER_KEYS)[number];

export default function ModelsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const initialQuery = searchParams.get("q") ?? "";
  const initialFilter = (searchParams.get("filter") as Filter) ?? "全部";

  const [activeFilter, setActiveFilter] = useState<Filter>(
    FILTER_KEYS.includes(initialFilter) ? initialFilter : "全部"
  );
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const updateUrl = useCallback(
    (query: string, filter: Filter) => {
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
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      updateUrl(value, activeFilter);
    },
    [activeFilter, updateUrl]
  );

  const handleFilterChange = useCallback(
    (key: string) => {
      const filter = key as Filter;
      setActiveFilter(filter);
      updateUrl(searchQuery, filter);
    },
    [searchQuery, updateUrl]
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
  const filteredModels = allModels.filter((m) => {
    const matchesFilter =
      activeFilter === "全部" ? true : m.type === activeFilter;
    const matchesSearch =
      searchQuery === ""
        ? true
        : m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={t("models.searchPlaceholder")}
            />
          </div>

          <RankingTable models={filteredModels} />

          <div className="mt-8 text-center text-sm text-text-muted">
            {t("models.count", { count: String(filteredModels.length) })}
          </div>
        </div>
      </div>
    </div>
  );
}

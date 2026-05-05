"use client";

import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { RankingTable } from "@/components/ranking-table";
import { FilterBar, type FilterOption } from "@/components/filter-bar";
import { SearchInput } from "@/components/search-input";

import Link from "next/link";
import { Bot, Globe } from "lucide-react";
import { getAllModelsUnfiltered } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

const FILTER_KEYS = ["全部", "开源", "闭源"] as const;
type Filter = typeof FILTER_KEYS[number];

function getQueryParam(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

export default function ModelsPageClient() {
  const [activeFilter, setActiveFilter] = useState<Filter>("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  // 从 URL 恢复搜索词；SSR 阶段无 window，只能在 mount 后读取
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery(getQueryParam());
  }, []);

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

      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Bot className="h-8 w-8 text-accent-violet" />
              <h1 className="text-3xl font-bold text-text-primary">{t("models.title")}</h1>
            </div>
            <p className="text-text-secondary">
              {t("models.desc")}
            </p>
          </div>

          <div className="mb-6 rounded-lg border border-surface-border bg-surface-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">{t("models.comparePrompt")}</p>
                <p className="text-xs text-text-secondary">{t("models.comparePromptDesc")}</p>
              </div>
              <Link
                href="/compare"
                className="inline-flex items-center gap-1 rounded-lg bg-accent-violet px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-violet/90 transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                {t("models.compareBtn")}
              </Link>
            </div>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <FilterBar
              options={filterOptions}
              activeKey={activeFilter}
              onFilterChange={(key) => setActiveFilter(key as Filter)}
            />
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
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

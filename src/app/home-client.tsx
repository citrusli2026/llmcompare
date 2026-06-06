"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Bot, ArrowRight, TrendingUp, ChevronUp } from "lucide-react";
import { getAllModelsUnfiltered } from "@/lib/scoring";
import { RankingTable } from "@/components/ranking-table";
import { StatsStrip } from "@/components/stats-strip";
import { CompareBar } from "@/components/compare-bar";
import { SearchInput } from "@/components/search-input";
import { useTranslation } from "@/lib/i18n";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { cn } from "@/lib/utils";

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    // Watch a sentinel at the top of the page
    const sentinel = document.createElement("div");
    sentinel.id = "scroll-sentinel";
    sentinel.style.position = "absolute";
    sentinel.style.top = "0";
    sentinel.style.height = "1px";
    sentinel.style.width = "1px";
    document.body.prepend(sentinel);
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-accent-violet text-white shadow-lg transition-all duration-300 hover:bg-violet-600",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
      aria-label="Back to top"
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}

export default function HomeClient() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const allModels = useMemo(() => getAllModelsUnfiltered(), []);

  const displayModels = useMemo(() => {
    // 按 release_date 降序排列（null 排最后）
    const sorted = [...allModels].sort((a, b) => {
      if (!a.raw.release_date) return 1;
      if (!b.raw.release_date) return -1;
      return b.raw.release_date.localeCompare(a.raw.release_date);
    });
    if (!searchQuery) return sorted.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return sorted.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.company.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allModels, searchQuery]);

  // Compare selection from URL params (via shared hook)
  const { selectedCompareModels, handleRemoveCompare, handleClearCompare } = useCompareIds();

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      {/* Hero Section — Sentry ambient glow */}
      <section
        className="relative overflow-hidden px-4 pt-10 pb-6 sm:pt-16 sm:pb-10 lg:px-8"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(106,95,193,0.15) 0%, transparent 60%)",
        }}
      >
        <div className="mx-auto max-w-4xl text-center relative z-10">
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

          <p className="mt-3 text-sm sm:text-base md:text-lg text-text-secondary">
            {t("home.heroDesc")}
          </p>
          <p className="hidden sm:block mt-4 max-w-2xl mx-auto text-sm text-text-muted">
            {t("home.seoDesc")}
          </p>
        </div>
      </section>

      {/* Model Directory Table — moved before StatsStrip on mobile via ordering */}
      <section className="px-4 pt-4 pb-4 sm:px-6 lg:px-8 order-first sm:order-none">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-accent-violet" />
              <h2 className="text-2xl font-bold text-text-primary">{t("home.rankingTitle")}</h2>
            </div>
            <Link
              href="/models"
              className="flex items-center gap-1 text-sm text-accent-violet hover:text-violet-500 transition-colors"
            >
              {t("home.rankingViewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mb-4 sm:mb-6">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t("models.searchPlaceholder")}
              className="max-w-xl"
            />
          </div>

          <RankingTable models={displayModels} hideArenaCode />
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

      <BackToTop />
    </div>
  );
}

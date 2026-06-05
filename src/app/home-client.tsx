"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Bot, ArrowRight, TrendingUp } from "lucide-react";
import { getAllModelsUnfiltered, getModelById, type ModelWithScores } from "@/lib/scoring";
import { RankingTable } from "@/components/ranking-table";
import { StatsStrip } from "@/components/stats-strip";
import { CompareBar } from "@/components/compare-bar";
import { useTranslation } from "@/lib/i18n";

export default function HomeClient() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const displayModels = useMemo(() => {
    const all = getAllModelsUnfiltered();
    return all.slice(0, 20);
  }, []);

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

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      {/* Hero Section — Sentry ambient glow */}
      <section
        className="relative overflow-hidden px-4 pt-12 pb-8 sm:pt-16 sm:pb-10 lg:px-8"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(106,95,193,0.15) 0%, transparent 60%)",
        }}
      >
        <div className="mx-auto max-w-4xl text-center relative z-10">
          <Badge
            variant="secondary"
            className="mb-4 bg-accent-lime/10 text-accent-lime hover:bg-accent-lime/20 border-accent-lime/20"
          >
            <TrendingUp className="mr-1 h-3 w-3" />
            {t("home.badge")}
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
            {t("home.heroTitle")}
          </h1>

          <p className="mt-3 text-base text-text-secondary sm:text-lg">
            {t("home.heroDesc")}
          </p>
          <p className="hidden sm:block mt-4 max-w-2xl mx-auto text-sm text-text-muted">
            {t("home.seoDesc")}
          </p>
        </div>
      </section>

      <StatsStrip />

      {/* Model Directory Table */}
      <section className="px-4 pt-6 pb-10 sm:px-6 lg:px-8">
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

          <RankingTable models={displayModels} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border bg-surface-elevated px-4 py-8 sm:px-6 lg:px-8">
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

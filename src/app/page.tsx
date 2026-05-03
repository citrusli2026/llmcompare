"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { Bot, ArrowRight, TrendingUp } from "lucide-react";
import { getAllModels } from "@/lib/scoring";
import { RankingTable } from "@/components/ranking-table";
import { useTranslation } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useTranslation();
  const allModels = useMemo(() => getAllModels("balanced"), []);
  const frontierModels = useMemo(() => allModels.filter(m => m.flags.frontier).slice(0, 6), [allModels]);

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-10 pb-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 bg-violet-500/10 text-accent-violet hover:bg-violet-500/20 dark:bg-violet-500/20 dark:text-violet-300"
          >
            <TrendingUp className="mr-1 h-3 w-3" />
            {t("home.badge")}
          </Badge>

          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-5xl">
            {t("home.heroTitle")}
          </h1>

          <p className="mt-3 text-base text-text-secondary">
            {t("home.heroDesc")}
          </p>
        </div>
      </section>

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

          <RankingTable models={allModels.slice(0, 10)} />
        </div>
      </section>

      {/* Frontier Models Cards */}
      <section className="px-4 pt-6 pb-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-accent-violet" />
              <h2 className="text-2xl font-bold text-text-primary">{t("home.cardsTitle")}</h2>
            </div>
            <Link
              href="/models"
              className="flex items-center gap-1 text-sm text-accent-violet hover:text-violet-500 transition-colors"
            >
              {t("home.cardsViewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {frontierModels.map((model) => (
              <ProductCard key={model.id} product={model} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center text-sm text-text-muted">
          <p>{t("home.footer")}</p>
          <p className="mt-1">{t("home.footerDisclaimer")}</p>
        </div>
      </footer>
    </div>
  );
}

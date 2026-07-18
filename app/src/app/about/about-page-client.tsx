"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ArrowLeft, Brain, DollarSign, TrendingUp, Trophy, Database, ExternalLink, Calendar, BookOpen, Cpu, Bot, Zap, BarChart3, Award } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import metadataData from "@/data/metadata.json";

export default function AboutPageClient() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />

      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("about.backLink")}
          </Link>

          <h1 className="text-3xl font-bold text-text-primary mb-8">{t("about.title")}</h1>

          <div className="space-y-8">
            {/* Project Background */}
            <section className="rounded-xl border border-surface-border bg-surface-card p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-text-primary" />
                {t("about.backgroundTitle")}
              </h2>
              <p className="text-sm text-text-secondary">
                {t("about.backgroundDesc")}
              </p>
              <p className="text-sm text-text-secondary mt-3">
                {t("about.backgroundMission")}
              </p>
              <p className="text-sm text-text-secondary mt-3">
                {t("about.backgroundContribute")}{" "}
                <a
                  href="https://github.com/citrusli2026/llmcompare/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-violet hover:underline"
                >
                  GitHub Issues
                </a>。
              </p>
            </section>

            {/* Data Sources */}
            <section className="rounded-xl border border-surface-border bg-surface-card p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-accent-cyan" />
                {t("about.sourceTitle")}
              </h2>

              <div className="space-y-4 text-sm">
                <p className="text-text-secondary">{t("about.filterDesc")}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-lime/10 px-2.5 py-0.5 text-[10px] font-medium text-accent-lime">
                    <Database className="h-3 w-3" /> {t("about.updateFreq")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-text-dim">
                    <Calendar className="h-3 w-3" />
                    {t("about.lastUpdated")}: {new Date(metadataData.updated_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="rounded-lg bg-surface-hover p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-accent-violet" />
                    <p className="text-text-primary font-medium">Artificial Analysis</p>
                  </div>
                  <p className="text-text-secondary">{t("about.sourceDesc")}</p>
                </div>
                <div className="rounded-lg bg-surface-hover p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-accent-emerald" />
                    <p className="text-text-primary font-medium">OpenRouter</p>
                  </div>
                  <p className="text-text-secondary">{t("about.orDesc")}</p>
                </div>
                <div className="rounded-lg bg-surface-hover p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-accent-amber" />
                    <p className="text-text-primary font-medium">{t("about.sourcePriceTitle")}</p>
                  </div>
                  <p className="text-text-secondary">{t("about.priceDetail")}</p>
                </div>
                <div className="rounded-lg bg-surface-hover p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-accent-amber" />
                    <p className="text-text-primary font-medium">Arena</p>
                  </div>
                  <p className="text-text-secondary">{t("about.arenaDesc")}</p>
                </div>
              </div>
            </section>

            {/* Field Guide */}
            <section className="rounded-xl border border-surface-border bg-surface-card p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent-violet" />
                {t("about.fieldGuideTitle")}
              </h2>
              <p className="text-sm text-text-secondary mb-4">{t("about.fieldGuideDesc")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-hover p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-accent-violet" />
                    <p className="text-text-primary font-medium text-sm">{t("source.intelligenceLabel")}</p>
                  </div>
                  <p className="text-xs text-text-secondary">{t("about.fieldIntelligence")}</p>
                </div>
                <div className="rounded-lg bg-surface-hover p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="h-4 w-4 text-accent-cyan" />
                    <p className="text-text-primary font-medium text-sm">{t("source.codingLabel")}</p>
                  </div>
                  <p className="text-xs text-text-secondary">{t("about.fieldCoding")}</p>
                </div>
                <div className="rounded-lg bg-surface-hover p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="h-4 w-4 text-accent-emerald" />
                    <p className="text-text-primary font-medium text-sm">{t("source.agenticLabel")}</p>
                  </div>
                  <p className="text-xs text-text-secondary">{t("about.fieldAgentic")}</p>
                </div>
                <div className="rounded-lg bg-surface-hover p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-accent-amber" />
                    <p className="text-text-primary font-medium text-sm">{t("source.speedLabel")}</p>
                  </div>
                  <p className="text-xs text-text-secondary">{t("about.fieldSpeed")}</p>
                </div>
                <div className="rounded-lg bg-surface-hover p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-accent-lime" />
                    <p className="text-text-primary font-medium text-sm">{t("product.priceTitle")}</p>
                  </div>
                  <p className="text-xs text-text-secondary">{t("about.fieldPricing")}</p>
                </div>
                <div className="rounded-lg bg-surface-hover p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="h-4 w-4 text-accent-rose" />
                    <p className="text-text-primary font-medium text-sm">{t("product.arenaRankings")}</p>
                  </div>
                  <p className="text-xs text-text-secondary">{t("about.fieldArena")}</p>
                </div>
                <div className="rounded-lg bg-surface-hover p-4 sm:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-accent-indigo" />
                    <p className="text-text-primary font-medium text-sm">{t("product.dataCompleteness")}</p>
                  </div>
                  <p className="text-xs text-text-secondary">{t("about.fieldCompleteness")}</p>
                </div>
              </div>
            </section>

            <p className="text-xs text-text-muted text-center">{t("about.disclaimerDesc")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

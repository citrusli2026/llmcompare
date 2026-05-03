"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ArrowLeft, Brain, Zap, DollarSign, TrendingUp, Database, Filter, ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function AboutPage() {
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
              <div className="text-sm text-text-secondary space-y-3">
                <p>{t("about.backgroundDesc")}</p>
                <p>{t("about.backgroundContribute")}{" "}
                  <a
                    href="https://github.com/citrusli/llmcompare/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-violet hover:underline"
                  >
                    GitHub Issues
                  </a>
                </p>
              </div>
            </section>

            {/* Scoring Methodology */}
            <section className="rounded-xl border border-surface-border bg-surface-card p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-accent-violet" />
                {t("about.scoringTitle")}
              </h2>

              <div className="space-y-4 text-text-secondary text-sm">
                <p>{t("about.scoringDesc")}</p>

                <div className="rounded-lg bg-surface-hover p-4">
                  <h3 className="font-medium text-text-primary mb-2">{t("product.intelligence")}</h3>
                  <p>{t("about.scoringDetail")}</p>
                </div>

                <div className="rounded-lg bg-surface-hover p-4">
                  <h3 className="font-medium text-text-primary mb-2">{t("models.colCost")}</h3>
                  <p>{t("about.costDetail")}</p>
                </div>
              </div>
            </section>

            {/* Data Sources */}
            <section className="rounded-xl border border-surface-border bg-surface-card p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-accent-cyan" />
                {t("about.sourceTitle")}
              </h2>

              <div className="space-y-4 text-sm">
                <div className="rounded-lg bg-surface-hover p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-accent-violet" />
                    <p className="text-text-primary font-medium">Artificial Analysis</p>
                  </div>
                  <p className="text-text-secondary mb-2">{t("about.sourceDesc")}</p>
                  <p className="text-text-secondary">{t("about.sourceAaDetail")}</p>
                </div>
                <div className="rounded-lg bg-surface-hover p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-accent-amber" />
                    <p className="text-text-primary font-medium">{t("product.priceTitle")}</p>
                  </div>
                  <p className="text-text-secondary mb-2">{t("about.priceSourceDesc")}</p>
                  <p className="text-text-secondary">{t("about.priceDetail")}</p>
                </div>
              </div>
            </section>

            {/* Ranking Filter Pipeline */}
            <section className="rounded-xl border border-surface-border bg-surface-card p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5 text-accent-amber" />
                {t("about.filterTitle")}
              </h2>

              <div className="text-sm text-text-secondary">
                <p>{t("about.filterDesc")}</p>
              </div>
            </section>

            {/* Update Frequency */}
            <section className="rounded-xl border border-surface-border bg-surface-card p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent-emerald" />
                {t("about.updateTitle")}
              </h2>

              <div className="text-sm text-text-secondary space-y-2">
                <p>{t("about.updateDesc")}</p>
              </div>
            </section>

            {/* Disclaimer */}
            <section className="rounded-xl border border-surface-border bg-surface-card p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">{t("about.disclaimerTitle")}</h2>
              <div className="text-sm text-text-secondary space-y-2">
                <p>{t("about.disclaimerDesc")}</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

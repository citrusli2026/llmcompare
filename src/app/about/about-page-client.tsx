"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ArrowLeft, Brain, DollarSign, TrendingUp, Database, ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

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
                {t("about.backgroundDesc")}{" "}
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
                    <TrendingUp className="h-4 w-4 text-accent-rose" />
                    <p className="text-text-primary font-medium">{t("about.sourceSftTitle")}</p>
                  </div>
                  <p className="text-text-secondary">{t("about.sftDesc")}</p>
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

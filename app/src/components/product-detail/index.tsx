"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ArrowLeft } from "lucide-react";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

import { ModelHeader } from "./model-header";
import { CtaGroup } from "./cta-group";
import { QuickFacts } from "./quick-facts";
import { DataCompletionCallout } from "./data-completion-callout";
import { BenchmarkSection } from "./benchmark-section";
import { SpeedSection } from "./speed-section";
import { PricingSection } from "./pricing-section";
import { ScoreOverview } from "./score-overview";
import { TrendSection } from "./trend-section";
import { SimilarModels } from "./similar-models";

interface ProductDetailClientProps {
  model: ModelWithScores;
}

export function ProductDetailClient({ model }: ProductDetailClientProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />
      <div className="px-4 py-6 sm:py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/models"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("product.backLink")}
          </Link>

          <ModelHeader model={model} />

          {/* Primary CTA group — the main reason to land on a model page */}
          <CtaGroup model={model} />

          <QuickFacts model={model} />

          <DataCompletionCallout model={model} />

          <div className="mt-6">
            <ScoreOverview model={model} />
          </div>

          <div className="mt-6">
            <TrendSection model={model} />
          </div>

          <div className="mt-6">
            <PricingSection model={model} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2 mt-6">
            <BenchmarkSection model={model} />
            <SpeedSection model={model} />
          </div>

          {/* Similar model recommendations — "you might also like" */}
          <SimilarModels model={model} />
        </div>
      </div>
    </div>
  );
}

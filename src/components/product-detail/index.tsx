"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { ArrowLeft } from "lucide-react";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

import { ModelHeader } from "./model-header";
import { VendorLinks } from "./vendor-links";
import { QuickFacts } from "./quick-facts";
import { BenchmarkSection } from "./benchmark-section";
import { SpeedSection } from "./speed-section";
import { PricingSection } from "./pricing-section";
import { ArenaRankings } from "./arena-rankings";
import { TokenUsage } from "./token-usage";
import { DataCompleteness } from "./data-completeness";
import { ScoreOverview } from "./score-overview";
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
          <VendorLinks model={model} />
          <QuickFacts model={model} />
          <div className="mt-4">
            <DataCompleteness model={model} />
          </div>

          <div className="mt-6">
            <ScoreOverview model={model} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3 mt-6">
            {/* On mobile: pricing + arena first, then benchmark + speed */}
            <div className="lg:col-span-2 space-y-6">
              <div className="block lg:hidden space-y-6">
                <PricingSection model={model} />
                <ArenaRankings model={model} />
              </div>
              <BenchmarkSection model={model} />
              <SpeedSection model={model} />
            </div>

            <div className="space-y-6">
              <div className="hidden lg:block space-y-6">
                <PricingSection model={model} />
                <ArenaRankings model={model} />
              </div>
              <TokenUsage model={model} />
            </div>
          </div>

          {/* Similar model recommendations — "you might also like" */}
          <SimilarModels model={model} />
        </div>
      </div>
    </div>
  );
}

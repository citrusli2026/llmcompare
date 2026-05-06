"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import type { ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

import { ModelHeader } from "./model-header";
import { VendorLinks } from "./vendor-links";
import { QuickFacts } from "./quick-facts";
import { BenchmarkSection } from "./benchmark-section";
import { SpeedSection } from "./speed-section";
import { PricingSection } from "./pricing-section";
import { ArenaRankings } from "./arena-rankings";
import { TokenUsage } from "./token-usage";

interface ProductDetailClientProps {
  model: ModelWithScores;
}

export function ProductDetailClient({ model }: ProductDetailClientProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface-base">
      <Navbar />
      <div className="px-4 py-12 sm:px-6 lg:px-8">
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

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <BenchmarkSection model={model} />
              <SpeedSection model={model} />
            </div>

            <div className="space-y-6">
              <PricingSection model={model} />
              <ArenaRankings model={model} />
              <TokenUsage model={model} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

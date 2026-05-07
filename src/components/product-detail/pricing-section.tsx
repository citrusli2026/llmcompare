"use client";

import { DollarSign } from "lucide-react";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface PricingSectionProps {
  model: ModelWithScores;
}

export function PricingSection({ model }: PricingSectionProps) {
  const { t } = useTranslation();
  const r = model.raw;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-text-muted" /> {t("product.priceTitle")}
      </h2>
      {r.cn_display && (
        <div className="mb-3">
          <p className="text-xs text-text-muted mb-2">{t("product.cnPriceLabel")}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">{t("product.input")}</span>
              <span className="text-text-primary">¥{r.cn_input}/M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">{t("product.output")}</span>
              <span className="text-text-primary">¥{r.cn_output}/M</span>
            </div>
          </div>
          <div className="border-t border-surface-border mt-3" />
        </div>
      )}
      <div className="mb-3">
        <p className="text-xs text-text-muted mb-2">Artificial Analysis</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">{t("product.inputAa")}</span>
            <span className="text-text-primary">${r.input}/M</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">{t("product.outputAa")}</span>
            <span className="text-text-primary">${r.output}/M</span>
          </div>
        </div>
      </div>
      {r.openrouter_pricing != null && (
        <>
          <div className="border-t border-surface-border mb-3" />
          <div className="mb-3">
            <p className="text-xs text-text-muted mb-2">{t("product.orPricing")}</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">{t("product.input")}</span>
                <span className="text-text-primary">${r.openrouter_pricing.prompt}/M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">{t("product.output")}</span>
                <span className="text-text-primary">${r.openrouter_pricing.completion}/M</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

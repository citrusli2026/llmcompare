"use client";

import { Target } from "lucide-react";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface BenchmarkSectionProps {
  model: ModelWithScores;
}

export function BenchmarkSection({ model }: BenchmarkSectionProps) {
  const { t } = useTranslation();
  const r = model.raw;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
        <Target className="h-5 w-5 text-accent-amber" /> {t("product.benchmarkTitle")}
      </h2>
      <p className="text-xs text-text-muted mb-5">{t("product.benchmarkSubtitle")}</p>

      {/* Detailed benchmark sub-scores */}
      {r.omniscience != null && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-surface-hover p-3">
            <p className="text-xs text-text-muted">{t("product.hallucinationControl")}</p>
            <p className="text-base font-semibold text-text-primary tabular-nums">
              {r.omniscience.toFixed(1)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">{t("product.hallucinationNote")}</p>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-text-muted">{t("product.sourceAa")}</p>
    </div>
  );
}

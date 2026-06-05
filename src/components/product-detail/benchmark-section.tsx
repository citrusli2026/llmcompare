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
      <h2 className="text-lg font-semibold text-text-primary mb-5 flex items-center gap-2">
        <Target className="h-5 w-5 text-accent-amber" /> {t("product.benchmarkTitle")}
      </h2>

      {/* Primary metric: intelligence */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm text-text-secondary">{t("product.intelligence")}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-text-primary tabular-nums">
              {r.intelligence != null ? r.intelligence.toFixed(1) : "—"}
            </span>
            {r.intelligence != null && <span className="text-xs text-text-muted">/100</span>}
          </div>
        </div>
        <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              r.intelligence != null
                ? r.intelligence >= 80 ? "bg-accent-lime"
                  : r.intelligence >= 65 ? "bg-accent-violet"
                  : r.intelligence >= 50 ? "bg-accent-coral"
                  : "bg-text-muted"
                : ""
            }`}
            style={{ width: r.intelligence != null ? `${Math.min(Math.max(r.intelligence, 0), 100)}%` : "0%" }}
          />
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-surface-hover p-3">
          <p className="text-xs text-text-muted">{t("product.coding")}</p>
          <p className="text-base font-semibold text-text-primary tabular-nums">
            {r.coding != null ? r.coding.toFixed(1) : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-surface-hover p-3">
          <p className="text-xs text-text-muted">{t("product.agentic")}</p>
          <p className="text-base font-semibold text-text-primary tabular-nums">
            {r.agentic != null ? r.agentic.toFixed(1) : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-surface-hover p-3">
          <p className="text-xs text-text-muted">{t("product.benchmarkMmluPro")}</p>
          <p className="text-base font-semibold text-text-primary tabular-nums">
            {r.benchmarks.mmlu_pro != null ? r.benchmarks.mmlu_pro.toFixed(1) : "—"}
          </p>
        </div>
        {r.omniscience != null && (
          <div className="rounded-lg bg-surface-hover p-3">
            <p className="text-xs text-text-muted">{t("product.hallucinationControl")}</p>
            <p className="text-base font-semibold text-text-primary tabular-nums">
              {r.omniscience.toFixed(1)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">{t("product.hallucinationNote")}</p>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-text-muted">{t("product.sourceAa")}</p>
    </div>
  );
}

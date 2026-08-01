"use client";

import { Target } from "lucide-react";
import { type ModelWithScores } from "@/lib/scoring";
import { BENCHMARK_DEFS, formatBenchmarkValue } from "@/lib/benchmarks";
import { useTranslation } from "@/lib/i18n";

interface BenchmarkSectionProps {
  model: ModelWithScores;
}

export function BenchmarkSection({ model }: BenchmarkSectionProps) {
  const { t } = useTranslation();
  const r = model.raw;

  // 只展示有值的 benchmark，顺序沿用 BENCHMARK_DEFS（覆盖率/重要性降序）
  const entries = BENCHMARK_DEFS
    .map((def) => ({ def, value: r.benchmarks[def.key] }))
    .filter((e): e is { def: (typeof BENCHMARK_DEFS)[number]; value: number } => e.value != null);

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
        <Target className="h-5 w-5 text-accent-amber" /> {t("product.benchmarkTitle")}
      </h2>
      <p className="text-xs text-text-muted mb-5">{t("product.benchmarkSubtitle")}</p>

      {/* Detailed benchmark sub-scores */}
      {r.omniscience != null && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="rounded-lg bg-surface-hover p-3">
            <p className="text-xs text-text-muted">{t("product.hallucinationControl")}</p>
            <p className="text-base font-semibold text-text-primary tabular-nums">
              {r.omniscience.toFixed(1)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">{t("product.hallucinationNote")}</p>
          </div>
        </div>
      )}

      {/* Individual benchmark scores — 0-1 values shown as percentages */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {entries.map(({ def, value }) => (
            <div key={def.key} className="rounded-lg bg-surface-hover p-3">
              <p className="text-xs text-text-muted truncate">{t(def.labelKey)}</p>
              <p className="text-base font-semibold text-text-primary tabular-nums">
                {formatBenchmarkValue(value)}
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-text-muted">{t("product.sourceAa")}</p>
    </div>
  );
}

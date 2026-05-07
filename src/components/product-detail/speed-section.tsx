"use client";

import { Zap } from "lucide-react";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface SpeedSectionProps {
  model: ModelWithScores;
}

export function SpeedSection({ model }: SpeedSectionProps) {
  const { t } = useTranslation();
  const r = model.raw;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-accent-cyan" /> {t("product.speedTitle")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-surface-hover p-3">
          <p className="text-xs text-text-muted">{t("product.medianTps")}</p>
          <p className="text-lg font-semibold text-text-primary">
            {r.median_tps != null ? (
              <>
                {r.median_tps.toFixed(1)}{" "}
                <span className="text-xs text-text-muted">TPS</span>
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="rounded-lg bg-surface-hover p-3">
          <p className="text-xs text-text-muted">{t("product.ttft")}</p>
          <p className="text-lg font-semibold text-text-primary">
            {r.ttft_seconds != null ? `${r.ttft_seconds.toFixed(1)}s` : "—"}
          </p>
        </div>
        <div className="rounded-lg bg-surface-hover p-3">
          <p className="text-xs text-text-muted">{t("product.e2e")}</p>
          <p className="text-lg font-semibold text-text-primary">
            {r.e2e_seconds != null ? `${r.e2e_seconds.toFixed(1)}s` : "—"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-text-muted">{t("product.sourceAa")}</p>
    </div>
  );
}

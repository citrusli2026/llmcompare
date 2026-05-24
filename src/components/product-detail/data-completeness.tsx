"use client";

import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import { Progress } from "@/components/ui/progress";

interface DataCompletenessProps {
  model: ModelWithScores;
}

export function DataCompleteness({ model }: DataCompletenessProps) {
  const { t } = useTranslation();
  const pct = model.raw.data_completeness_pct ?? 0;

  const getColor = (value: number) => {
    if (value >= 90) return "text-emerald-400";
    if (value >= 75) return "text-amber-400";
    return "text-red-400";
  };

  const getProgressColor = (value: number) => {
    if (value >= 90) return "bg-emerald-500";
    if (value >= 75) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center gap-2" title={t("product.dataCompletenessDesc")}>
      <span className="text-xs text-text-secondary">{t("product.dataCompleteness")}</span>
      <span className={`text-xs font-semibold ${getColor(pct)}`}>{pct}%</span>
      <div className="w-16">
        <Progress value={pct} className="h-1.5" indicatorClassName={getProgressColor(pct)} />
      </div>
    </div>
  );
}

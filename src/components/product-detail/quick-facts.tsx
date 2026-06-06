"use client";

import { Calendar, Building2, Cpu, BookOpen } from "lucide-react";
import { type ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import { FieldTip } from "@/components/field-tip";

interface QuickFactsProps {
  model: ModelWithScores;
}

export function QuickFacts({ model }: QuickFactsProps) {
  const { t } = useTranslation();
  const r = model.raw;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 rounded-xl border border-surface-border bg-surface-card p-4">
      <div className="flex items-center gap-3">
        <Building2 className="h-4 w-4 text-text-muted shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">{t("product.company")}</p>
          <p className="text-sm font-medium text-text-primary truncate">{model.company}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Cpu className="h-4 w-4 text-text-muted shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-text-muted"><FieldTip tip={t("tip.parameters")}>{t("product.parameters")}</FieldTip></p>
          <p className="text-sm font-medium text-text-primary truncate">{r.parameters != null ? `${r.parameters}B` : "—"}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <BookOpen className="h-4 w-4 text-text-muted shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-text-muted"><FieldTip tip={t("tip.contextWindow")}>{t("product.contextWindow")}</FieldTip></p>
          <p className="text-sm font-medium text-text-primary truncate">
            {r.context_window != null
              ? typeof r.context_window === "number"
                ? `${(r.context_window / 1000).toFixed(0)}K`
                : String(r.context_window)
              : "—"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <BookOpen className="h-4 w-4 text-text-muted shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">{t("product.outputTokens")}</p>
          <p className="text-sm font-medium text-text-primary truncate">{r.output_tokens != null ? `${(r.output_tokens / 1000).toFixed(0)}K` : "—"}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-text-muted shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">{t("product.releaseDate")}</p>
          <p className="text-sm font-medium text-text-primary truncate">{r.release_date ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}

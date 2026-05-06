"use client";

import { TrendingUp, ExternalLink } from "lucide-react";
import { formatTokenCount } from "@/lib/utils";
import type { ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface TokenUsageProps {
  model: ModelWithScores;
}

export function TokenUsage({ model }: TokenUsageProps) {
  const { t } = useTranslation();
  const r = model.raw;

  if (r.openrouter_weekly_tokens == null) {
    return null;
  }

  const { value, unit } = formatTokenCount(r.openrouter_weekly_tokens);

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-accent-emerald" /> {t("product.orTokens")}
      </h2>
      <p className="text-2xl font-bold text-text-primary">
        {value}
        <span className="text-sm text-text-muted ml-1">{unit}</span>
        <span className="text-sm text-text-muted ml-1">
          {t("product.orTokensUnit")}
        </span>
      </p>
      <a
        href="https://openrouter.ai/rankings"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-2 text-xs text-text-muted hover:text-accent-violet transition-colors"
      >
        <ExternalLink className="h-3 w-3" /> {t("product.orSource")}
      </a>
    </div>
  );
}

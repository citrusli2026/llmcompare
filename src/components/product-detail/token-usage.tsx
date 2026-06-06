"use client";

import { BarChart3 } from "lucide-react";
import { type ModelWithScores } from "@/lib/scoring";
import { formatTokenCount } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { FieldTip } from "@/components/field-tip";

interface TokenUsageProps {
  model: ModelWithScores;
}

export function TokenUsage({ model }: TokenUsageProps) {
  const { t } = useTranslation();
  const r = model.raw;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-accent-violet" /> {t("product.orSection")}
      </h2>

      {r.arena_votes != null && (
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-1">{t("product.orTokens")}<FieldTip tip={t("tip.arenaVotes")} /></p>
          <p className="text-2xl font-bold text-text-primary tabular-nums">
            {formatTokenCount(r.arena_votes).value}
            {formatTokenCount(r.arena_votes).unit && (
              <span className="text-sm text-text-muted ml-1">{formatTokenCount(r.arena_votes).unit}</span>
            )}
          </p>
          <p className="text-xs text-text-muted mt-0.5">{t("product.orTokensUnit")}</p>
        </div>
      )}

      {r.openrouter_weekly_tokens != null && (
        <div className={r.arena_votes != null ? "border-t border-surface-border pt-4" : ""}>
          <p className="text-xs text-text-muted mb-1">{t("product.orWeeklyTokens")}<FieldTip tip={t("tip.orWeeklyTokens")} /></p>
          <p className="text-2xl font-bold text-text-primary tabular-nums">
            {formatTokenCount(r.openrouter_weekly_tokens).value}
            {formatTokenCount(r.openrouter_weekly_tokens).unit && (
              <span className="text-sm text-text-muted ml-1">{formatTokenCount(r.openrouter_weekly_tokens).unit}</span>
            )}
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-text-muted">{t("product.orSource")}</p>
    </div>
  );
}

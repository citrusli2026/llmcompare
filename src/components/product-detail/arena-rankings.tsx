"use client";

import { Trophy, ExternalLink } from "lucide-react";
import type { ModelWithScores } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";

interface ArenaRankingsProps {
  model: ModelWithScores;
}

export function ArenaRankings({ model }: ArenaRankingsProps) {
  const { t } = useTranslation();
  const r = model.raw;

  if (!r.arena_rankings || Object.keys(r.arena_rankings).length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-accent-amber" /> {t("product.arenaRankings")}
      </h2>
      <div className="space-y-3">
        {Object.entries(r.arena_rankings).map(([key, data]) => (
          <div key={key} className="rounded-lg bg-surface-hover p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-text-primary">
                {t(
                  `product.arena${key.charAt(0).toUpperCase() + key.slice(1)}` as const
                )}
              </span>
              <span className="text-xs text-text-muted">#{data.rank}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-text-primary tabular-nums">
                {data.score}
              </span>
              <span className="text-xs text-text-muted">ELO</span>
            </div>
          </div>
        ))}
      </div>
      <a
        href="https://lmarena.ai/?leaderboard"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-3 text-xs text-text-muted hover:text-accent-violet transition-colors"
      >
        <ExternalLink className="h-3 w-3" /> {t("product.arenaSource")}
      </a>
    </div>
  );
}

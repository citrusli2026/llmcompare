"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { type ModelWithScores } from "@/lib/scoring";
import { getTypeBadgeClasses, getFeatureBadgeClasses } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { cn } from "@/lib/utils";
import { getRecommendationTags, getModelOneLiner } from "@/lib/recommendation-tags";
import { Plus, Check } from "lucide-react";
import { ShareButton } from "@/components/share-button";

interface ModelHeaderProps {
  model: ModelWithScores;
}

export function ModelHeader({ model }: ModelHeaderProps) {
  const { t } = useTranslation();
  const f = model.flags;
  const [logoError, setLogoError] = useState(false);
  const { isInCompare, toggleCompare } = useCompareIds();
  const inCompare = isInCompare(model.id);

  // Recommendation Tags — turns raw data into decision guidance
  const recommendationTags = useMemo(() => getRecommendationTags(model), [model]);
  const modelOneLiner = useMemo(() => getModelOneLiner(model), [model]);

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-4 min-w-0 flex-1">
        {model.logo && !logoError ? (
          <img
            src={model.logo}
            alt={model.name}
            className="h-16 w-16 rounded-xl shrink-0 object-contain bg-surface-elevated border border-surface-border p-2"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-elevated border border-surface-border text-2xl font-semibold text-text-primary shrink-0">
            {model.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{model.name}</h1>
            <Badge
              variant={model.type === "开源" ? "default" : "secondary"}
              className={getTypeBadgeClasses(model.type)}
            >
              {t(model.type === "开源" ? "common.open" : "common.closed")}
            </Badge>
          </div>

          {/* One-liner — data-driven summary of what this model is good for */}
          {modelOneLiner.labelKey && (
            <p className="text-sm text-text-secondary mb-3">{t(modelOneLiner.labelKey)}</p>
          )}

          {/* Recommendation Tags — turns raw data into decision guidance */}
          {recommendationTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {recommendationTags.map((tag) => (
                <span
                  key={tag.key}
                  className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tag.colorClass)}
                >
                  <span>{tag.icon}</span>
                  <span>{t(tag.labelKey)}</span>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {f.frontier && (
              <Badge className={cn(getFeatureBadgeClasses("frontier"), "text-xs")}>{t("common.frontier")}</Badge>
            )}
            {f.reasoning && (
              <Badge className={cn(getFeatureBadgeClasses("reasoning"), "text-xs")}>{t("common.reasoning")}</Badge>
            )}
            {f.open_weights && (
              <Badge className={cn(getFeatureBadgeClasses("open_weights"), "text-xs")}>{t("common.openWeights")}</Badge>
            )}
            {f.image_input && (
              <Badge className={cn(getFeatureBadgeClasses("image_input"), "text-xs")}>{t("common.imageInput")}</Badge>
            )}
            {f.chinese_eval && (
              <Badge className={cn(getFeatureBadgeClasses("chinese_eval"), "text-xs")}>{t("common.chineseEval")}</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <ShareButton size="sm" variant="ghost" showLabel={false} />
        <button
          onClick={() => toggleCompare(model.id)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-violet/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
            inCompare
              ? "bg-accent-lime/10 text-accent-lime border-accent-lime/30"
              : "bg-surface-elevated text-text-secondary border-surface-border hover:border-accent-violet/30 hover:text-accent-violet hover:bg-accent-violet/5"
          )}
          aria-label={inCompare ? t("compare.remove") : t("compare.addToCompare")}
        >
          {inCompare ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {inCompare ? t("compare.remove") : t("compare.addToCompare")}
          </span>
        </button>
      </div>
    </div>
  );
}

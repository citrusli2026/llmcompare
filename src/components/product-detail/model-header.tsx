"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { type ModelWithScores } from "@/lib/scoring";
import { getTypeBadgeClasses, getFeatureBadgeClasses } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getRecommendationTags, getModelOneLiner } from "@/lib/recommendation-tags";
import { ShareButton } from "@/components/share-button";
import { FavoriteButton } from "@/components/favorite-button";

interface ModelHeaderProps {
  model: ModelWithScores;
}

export function ModelHeader({ model }: ModelHeaderProps) {
  const { t } = useTranslation();
  const f = model.flags;
  const [logoError, setLogoError] = useState(false);

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
            className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl shrink-0 object-contain bg-surface-elevated border border-surface-border p-1.5 sm:p-2"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-surface-elevated border border-surface-border text-xl sm:text-2xl font-semibold text-text-primary shrink-0">
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

          {/* Feature badges — limit to 3 most important */}
          <div className="flex flex-wrap gap-1.5">
            {[
              f.frontier && <Badge key="frontier" className={cn(getFeatureBadgeClasses("frontier"), "text-xs")}>{t("common.frontier")}</Badge>,
              f.reasoning && <Badge key="reasoning" className={cn(getFeatureBadgeClasses("reasoning"), "text-xs")}>{t("common.reasoning")}</Badge>,
              f.open_weights && <Badge key="open_weights" className={cn(getFeatureBadgeClasses("open_weights"), "text-xs")}>{t("common.openWeights")}</Badge>,
              f.image_input && <Badge key="image_input" className={cn(getFeatureBadgeClasses("image_input"), "text-xs")}>{t("common.imageInput")}</Badge>,
              f.chinese_eval && <Badge key="chinese_eval" className={cn(getFeatureBadgeClasses("chinese_eval"), "text-xs")}>{t("common.chineseEval")}</Badge>,
            ].filter(Boolean).slice(0, 3)}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <FavoriteButton modelId={model.id} size="lg" />
        <ShareButton size="sm" variant="ghost" showLabel={false} />
      </div>
    </div>
  );
}

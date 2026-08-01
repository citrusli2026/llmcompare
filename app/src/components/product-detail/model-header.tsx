"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { type ModelWithScores } from "@/lib/scoring";
import { getTypeBadgeClasses, getFeatureBadgeClasses } from "@/lib/utils";
import { ModelType } from "@/lib/scoring";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getRecommendationTags, getModelOneLiner } from "@/lib/recommendation-tags";
import { ShareButton } from "@/components/share-button";
import { FavoriteButton } from "@/components/favorite-button";
import { ModelLogo } from "@/components/model-logo";
import { useCompareIds } from "@/hooks/use-compare-ids";
import { Plus, X } from "lucide-react";

interface ModelHeaderProps {
  model: ModelWithScores;
}

export function ModelHeader({ model }: ModelHeaderProps) {
  const { t } = useTranslation();
  const f = model.flags;

  // Recommendation Tags — turns raw data into decision guidance
  const recommendationTags = useMemo(() => getRecommendationTags(model), [model]);
  const modelOneLiner = useMemo(() => getModelOneLiner(model), [model]);

  // 加入/移出对比：复用 use-compare-ids 的状态与上限逻辑（桌面 3 / 移动 2）
  const { isInCompare, isAtMax, toggleCompare, maxCompare } = useCompareIds();
  const inCompare = isInCompare(model.id);
  const addDisabled = !inCompare && isAtMax;

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-4 min-w-0 flex-1">
        <ModelLogo src={model.logo} name={model.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">{model.name}</h1>
            <Badge
              variant={model.type === ModelType.Open ? "default" : "secondary"}
              className={getTypeBadgeClasses(model.type)}
            >
              {t(model.type === ModelType.Open ? "common.open" : "common.closed")}
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
        <button
          onClick={() => toggleCompare(model.id)}
          disabled={addDisabled}
          aria-pressed={inCompare}
          title={addDisabled ? t("compare.maxReached", { n: String(maxCompare) }) : undefined}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2.5 h-9 text-xs font-medium border transition-all",
            inCompare
              ? "border-accent-violet bg-accent-violet/10 text-accent-violet"
              : "border-surface-border bg-surface-card text-text-secondary hover:border-accent-violet/30 hover:text-accent-violet",
            addDisabled && "opacity-50 cursor-not-allowed hover:border-surface-border hover:text-text-secondary",
          )}
        >
          {inCompare ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{inCompare ? t("compare.removeFrom") : t("compare.add")}</span>
        </button>
        <FavoriteButton modelId={model.id} size="lg" />
        <ShareButton size="sm" variant="ghost" showLabel={false} />
      </div>
    </div>
  );
}

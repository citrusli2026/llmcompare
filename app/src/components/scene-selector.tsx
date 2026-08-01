"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Brain, Flame, Code2, Bot, ArrowRight } from "lucide-react";
import { cn, formatTokenCount } from "@/lib/utils";
import { type ModelWithScores, getAllModels } from "@/lib/scoring";
import { rankByScore, pickTopN, type SceneKey } from "@/lib/scene-recommendations";
import { getRecommendationTags } from "@/lib/recommendation-tags";
import { useTranslation } from "@/lib/i18n";
import { ModelLogo } from "@/components/model-logo";

interface SceneDef {
  key: SceneKey;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  /** 展开区主分数的着色 */
  scoreColorClass: string;
  labelKey: string;
  descKey: string;
  /** 排序指标；返回 null 的模型被排除 */
  score: (m: ModelWithScores) => number | null;
  displayScore: (m: ModelWithScores) => string | null;
  secondaryPrice: (m: ModelWithScores) => number | null;
}

const SCENES: SceneDef[] = [
  {
    key: "hotness",
    icon: Flame,
    accentClass: "text-amber-500 border-amber-500/30 bg-amber-500/5",
    scoreColorClass: "text-amber-500",
    labelKey: "home.sceneHotness",
    descKey: "home.sceneHotnessDesc",
    score: (m) => m.raw.openrouter_weekly_tokens,
    displayScore: (m) => {
      const t = m.raw.openrouter_weekly_tokens;
      if (!t) return null;
      const { value, unit } = formatTokenCount(t);
      return `${value}${unit}`;
    },
    secondaryPrice: (m) => m.raw.blended ?? null,
  },
  {
    key: "intelligence",
    icon: Brain,
    accentClass: "text-accent-violet border-accent-violet/30 bg-accent-violet/5",
    scoreColorClass: "text-accent-violet",
    labelKey: "home.sceneIntelligence",
    descKey: "home.sceneIntelligenceDesc",
    score: (m) => m.raw.intelligence,
    displayScore: (m) => (m.raw.intelligence != null ? m.raw.intelligence.toFixed(1) : null),
    secondaryPrice: (m) => m.raw.blended ?? null,
  },
  {
    key: "coding",
    icon: Code2,
    accentClass: "text-accent-cyan border-accent-cyan/30 bg-accent-cyan/5",
    scoreColorClass: "text-accent-cyan",
    labelKey: "home.sceneCoding",
    descKey: "home.sceneCodingDesc",
    score: (m) => m.raw.coding,
    displayScore: (m) => (m.raw.coding != null ? m.raw.coding.toFixed(1) : null),
    secondaryPrice: (m) => m.raw.blended ?? null,
  },
  {
    key: "agentic",
    icon: Bot,
    accentClass: "text-accent-blue border-accent-blue/30 bg-accent-blue/5",
    scoreColorClass: "text-accent-blue",
    labelKey: "home.sceneAgentic",
    descKey: "home.sceneAgenticDesc",
    score: (m) => m.raw.agentic,
    displayScore: (m) => (m.raw.agentic != null ? m.raw.agentic.toFixed(1) : null),
    secondaryPrice: (m) => m.raw.blended ?? null,
  },
];

const TOP_N = 4;

const SCENE_SORT_MAP: Record<SceneKey, string> = {
  hotness: "tokens",
  intelligence: "intelligence",
  coding: "coding",
  agentic: "agentic",
};

interface SceneSelectorProps {
  hideHeader?: boolean;
}

export function SceneSelector({ hideHeader }: SceneSelectorProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<SceneKey>("hotness");

  const allModels = useMemo(() => getAllModels(), []);

  const sceneModels = useMemo(() => {
    const result: Record<SceneKey, ModelWithScores[]> = {} as Record<SceneKey, ModelWithScores[]>;
    for (const scene of SCENES) {
      result[scene.key] = pickTopN(rankByScore(allModels, scene.score), TOP_N);
    }
    return result;
  }, [allModels]);

  const toggle = (key: SceneKey) => {
    setExpanded(key);
  };

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {!hideHeader && (
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
              🎯 {t("home.sceneTitle")}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-text-secondary">
              {t("home.sceneDesc")}
            </p>
          </div>
        )}

        {/* Scene Cards Grid — 移动端 2 列，桌面 4 列 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {SCENES.map((scene) => {
            const Icon = scene.icon;
            const isActive = expanded === scene.key;

            return (
              <button
                key={scene.key}
                onClick={() => toggle(scene.key)}
                className={cn(
                  "w-full rounded-xl border p-3 sm:p-4 text-left transition-all duration-200",
                  "hover:shadow-md",
                  isActive
                    ? "ring-2 ring-accent-violet/40 border-accent-violet/40 bg-surface-elevated"
                    : "border-surface-border bg-surface-base hover:border-surface-border-hover"
                )}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                  <Icon className={cn("h-5 w-5", scene.accentClass.split(" ")[0])} />
                  <span className="font-semibold text-text-primary text-sm sm:text-base">
                    {t(scene.labelKey)}
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{t(scene.descKey)}</p>
              </button>
            );
          })}
        </div>

        {/* Expanded model list */}
        {expanded && (() => {
          const scene = SCENES.find(s => s.key === expanded)!;
          const Icon = scene.icon;
          const models = sceneModels[expanded];

          return (
            <div className="mt-3 rounded-xl border border-surface-border bg-surface-elevated overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                <Icon className={cn("h-4 w-4", scene.accentClass.split(" ")[0])} />
                <span className="text-sm font-semibold text-text-primary">
                  {t(scene.labelKey)} — {t("home.topPicks")}
                </span>
              </div>
              <div className="px-1 pb-1">
                {models.map((model) => (
                  <Link
                    key={model.id}
                    href={`/models/${model.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-base transition-colors group"
                  >
                    {/* Logo */}
                    <ModelLogo src={model.logo} name={model.name} size="sm" />

                    {/* Name + Company */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate group-hover:text-accent-violet transition-colors">
                        {model.name}
                      </div>
                      <div className="text-xs text-text-muted truncate">
                        {model.company}
                      </div>
                      {getRecommendationTags(model).length > 0 && (
                        <div className="mt-0.5">
                          <span className={cn(
                            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-[1px] text-[10px] font-medium",
                            getRecommendationTags(model)[0].colorClass
                          )}>
                            <span>{getRecommendationTags(model)[0].icon}</span>
                            <span className="truncate max-w-[6rem]">{t(getRecommendationTags(model)[0].labelKey)}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Score + secondary */}
                    <div className="text-right shrink-0">
                      <div className={cn("text-sm font-bold", scene.scoreColorClass)}>
                        {scene.displayScore(model)}
                      </div>
                      <div className="text-xs text-text-muted">
                        {(() => {
                          const price = scene.secondaryPrice(model);
                          if (price == null) return model.type;
                          return price === 0 ? t("common.free") : `$${price.toFixed(2)}/M`;
                        })()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                href={`/models?sort=${SCENE_SORT_MAP[expanded]}`}
                className="flex items-center justify-center gap-1 py-2.5 text-sm text-accent-violet hover:text-violet-500 border-t border-surface-border transition-colors"
              >
                {t("home.sceneBrowseAll")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        })()}
      </div>
    </section>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Code, Bot, DollarSign, Brain, ArrowRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ModelWithScores, getAllModelsUnfiltered } from "@/lib/scoring";
import { getRecommendationTags } from "@/lib/recommendation-tags";
import { useTranslation } from "@/lib/i18n";

type SceneKey = "coding" | "agent" | "value" | "reasoning";

interface SceneDef {
  key: SceneKey;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  labelKey: string;
  descKey: string;
  /** The score label (e.g., "编程 59.1") */
  metricLabelKey: string;
  /** Sort function for this scene */
  sorter: (a: ModelWithScores, b: ModelWithScores) => number;
  /** Filter — which models belong in this scene */
  filter: (m: ModelWithScores) => boolean;
  /** What score to display for each model */
  displayScore: (m: ModelWithScores) => string | null;
  /** Secondary info to display (e.g., price) */
  secondaryInfo: (m: ModelWithScores) => string | null;
}

const SCENES: SceneDef[] = [
  {
    key: "coding",
    icon: Code,
    accentClass: "text-accent-lime border-accent-lime/30 bg-accent-lime/5",
    labelKey: "home.sceneCoding",
    descKey: "home.sceneCodingDesc",
    metricLabelKey: "models.colCoding",
    filter: (m) => m.raw.coding != null,
    sorter: (a, b) => (b.raw.coding ?? 0) - (a.raw.coding ?? 0),
    displayScore: (m) => (m.raw.coding != null ? m.raw.coding.toFixed(1) : null),
    secondaryInfo: (m) => m.type,
  },
  {
    key: "agent",
    icon: Bot,
    accentClass: "text-accent-violet border-accent-violet/30 bg-accent-violet/5",
    labelKey: "home.sceneAgent",
    descKey: "home.sceneAgentDesc",
    metricLabelKey: "models.colAgentic",
    filter: (m) => m.raw.agentic != null,
    sorter: (a, b) => (b.raw.agentic ?? 0) - (a.raw.agentic ?? 0),
    displayScore: (m) => (m.raw.agentic != null ? m.raw.agentic.toFixed(1) : null),
    secondaryInfo: (m) => {
      const price = m.raw.display;
      return price && price !== "—" ? `${price}/M` : m.type;
    },
  },
  {
    key: "value",
    icon: DollarSign,
    accentClass: "text-emerald-500 border-emerald-500/30 bg-emerald-500/5",
    labelKey: "home.sceneValue",
    descKey: "home.sceneValueDesc",
    metricLabelKey: "models.colIntelligence",
    filter: (m) => m.raw.intelligence != null && m.raw.intelligence >= 30 && m.raw.blended != null && m.raw.blended > 0,
    sorter: (a, b) => {
      const ratioA = a.raw.blended ? (a.raw.intelligence ?? 0) / (a.raw.blended * 100) : 0;
      const ratioB = b.raw.blended ? (b.raw.intelligence ?? 0) / (b.raw.blended * 100) : 0;
      return ratioB - ratioA;
    },
    displayScore: (m) => (m.raw.intelligence != null ? m.raw.intelligence.toFixed(1) : null),
    secondaryInfo: (m) => {
      if (m.raw.blended != null) return `$${m.raw.blended.toFixed(2)}/M`;
      return m.type;
    },
  },
  {
    key: "reasoning",
    icon: Brain,
    accentClass: "text-amber-500 border-amber-500/30 bg-amber-500/5",
    labelKey: "home.sceneReasoning",
    descKey: "home.sceneReasoningDesc",
    metricLabelKey: "models.colIntelligence",
    filter: (m) => m.flags.reasoning === true,
    sorter: (a, b) => (b.raw.intelligence ?? 0) - (a.raw.intelligence ?? 0),
    displayScore: (m) => (m.raw.intelligence != null ? m.raw.intelligence.toFixed(1) : null),
    secondaryInfo: (m) => m.type,
  },
];

const TOP_N = 4;

/** Map scene keys to /models sort params for seamless context transfer */
const SCENE_SORT_MAP: Record<SceneKey, string> = {
  coding: "coding",
  agent: "agentic",
  value: "cost",
  reasoning: "intelligence",
};

interface SceneSelectorProps {
  hideHeader?: boolean;
}

export function SceneSelector({ hideHeader }: SceneSelectorProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<SceneKey | null>("coding");

  const allModels = useMemo(() => getAllModelsUnfiltered(), []);

  // Precompute top models for each scene
  const sceneModels = useMemo(() => {
    const result: Record<SceneKey, ModelWithScores[]> = {} as Record<SceneKey, ModelWithScores[]>;
    for (const scene of SCENES) {
      result[scene.key] = allModels
        .filter(scene.filter)
        .sort(scene.sorter)
        .slice(0, TOP_N);
    }
    return result;
  }, [allModels]);

  const toggle = (key: SceneKey) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  const totalCount = allModels.length;

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Title — only shown when not integrated into hero */}
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

        {/* Scene Cards Grid — only the buttons, no expanded content inside grid */}
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
                <p className="text-[10px] sm:text-xs text-text-muted">{t(scene.descKey)}</p>
                <div className="mt-1.5 flex items-center justify-end">
                  {isActive ? (
                    <Minus className="h-3.5 w-3.5 text-accent-violet" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-text-muted" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Expanded model list — full width below the entire grid */}
        {expanded && (() => {
          const scene = SCENES.find(s => s.key === expanded)!;
          const Icon = scene.icon;
          const models = sceneModels[expanded];

          return (
            <div className="mt-3 rounded-xl border border-surface-border bg-surface-elevated overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Scene label header */}
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
                    <div className="h-7 w-7 rounded shrink-0 bg-surface-base flex items-center justify-center overflow-hidden">
                      {model.logo ? (
                        <img
                          src={model.logo}
                          alt=""
                          className="h-5 w-5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-xs font-bold text-text-muted">
                          {model.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Name + Company */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate group-hover:text-accent-violet transition-colors">
                        {model.name}
                      </div>
                      <div className="text-xs text-text-muted truncate">
                        {model.company}
                      </div>
                      {/* Recommendation tag — why this model is recommended */}
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

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-text-primary">
                        {scene.displayScore(model)}
                      </div>
                      <div className="text-xs text-text-muted">
                        {scene.secondaryInfo(model)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Browse all link — carries scene context as sort param */}
              <Link
                href={`/models?sort=${SCENE_SORT_MAP[expanded]}`}
                className="flex items-center justify-center gap-1 py-2.5 text-sm text-accent-violet hover:text-violet-500 border-t border-surface-border transition-colors"
              >
                {t("home.sceneBrowseAll", { n: totalCount })}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        })()}
      </div>
    </section>
  );
}

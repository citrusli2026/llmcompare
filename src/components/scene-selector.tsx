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

// ── 场景专属打分函数:4 个不同维度,避免 Top 5 重叠 ──
// Coding: 代码实战(coding 分 + Arena Code 实战得分)
// Agent:  OpenRouter 真实流量(代表生产中被大量使用)
// Reasoning: 硬推理基准(hle + gpqa)
// Value:  性价比(intelligence / blended)
const SCORE_FNS: Record<SceneKey, (m: ModelWithScores) => number | null> = {
  coding: (m) => {
    if (m.raw.coding == null) return null;
    return m.raw.coding * 1000 + (m.raw.arena_code ?? 0);
  },
  agent: (m) => m.raw.openrouter_weekly_tokens ?? null,
  reasoning: (m) => {
    const hle = m.raw.benchmarks.hle;
    if (!hle) return null;
    return hle * 1000 + (m.raw.benchmarks.gpqa ?? 0);
  },
  value: (m) => {
    if (m.raw.blended && m.raw.blended > 0 && m.raw.intelligence >= 30) {
      return m.raw.intelligence / (m.raw.blended * 100);
    }
    return null;
  },
};

const SCENES: SceneDef[] = [
  {
    key: "coding",
    icon: Code,
    accentClass: "text-accent-lime border-accent-lime/30 bg-accent-lime/5",
    labelKey: "home.sceneCoding",
    descKey: "home.sceneCodingDesc",
    metricLabelKey: "models.colCoding",
    filter: (m) => SCORE_FNS.coding(m) != null,
    sorter: (a, b) => (SCORE_FNS.coding(b) ?? 0) - (SCORE_FNS.coding(a) ?? 0),
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
    filter: (m) => SCORE_FNS.agent(m) != null,
    sorter: (a, b) => (SCORE_FNS.agent(b) ?? 0) - (SCORE_FNS.agent(a) ?? 0),
    displayScore: (m) => {
      const t = m.raw.openrouter_weekly_tokens;
      if (!t) return null;
      return t >= 1e9 ? `${(t / 1e9).toFixed(1)}B` : `${(t / 1e6).toFixed(0)}M`;
    },
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
    filter: (m) => SCORE_FNS.value(m) != null,
    sorter: (a, b) => (SCORE_FNS.value(b) ?? 0) - (SCORE_FNS.value(a) ?? 0),
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
    filter: (m) => SCORE_FNS.reasoning(m) != null,
    sorter: (a, b) => (SCORE_FNS.reasoning(b) ?? 0) - (SCORE_FNS.reasoning(a) ?? 0),
    displayScore: (m) => {
      const h = m.raw.benchmarks.hle;
      return h != null ? h.toFixed(3) : null;
    },
    secondaryInfo: (m) => m.type,
  },
];

const TOP_N = 5;

/** 反聚簇:排序后逐个加入,同 company 出现 ≥ 1 次时跳过,留给后面 */
function pickTopN(items: ModelWithScores[], n: number): ModelWithScores[] {
  const out: ModelWithScores[] = [];
  const seenCo = new Map<string, number>();
  for (const m of items) {
    if (out.length >= n) break;
    const c = m.company;
    if ((seenCo.get(c) ?? 0) >= 1) continue;
    out.push(m);
    seenCo.set(c, 1);
  }
  return out;
}

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

  // Precompute top models for each scene (反聚簇:每公司最多 1 个)
  const sceneModels = useMemo(() => {
    const result: Record<SceneKey, ModelWithScores[]> = {} as Record<SceneKey, ModelWithScores[]>;
    for (const scene of SCENES) {
      const filtered = allModels.filter(scene.filter);
      const sorted = [...filtered].sort(scene.sorter);
      result[scene.key] = pickTopN(sorted, TOP_N);
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

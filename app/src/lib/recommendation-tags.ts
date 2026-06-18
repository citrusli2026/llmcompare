import { type ModelWithScores, getAllModels } from "./scoring";
import { isValuePick, BADGE_PALETTE } from "./utils";

export interface RecommendationTag {
  key: string;
  labelKey: string;
  icon: string;
  colorClass: string;
}

// ── Cached sorted score arrays ──
// Avoids re-sorting on every call (shared by getRecommendationTags + getModelOneLiner).
let _sortedCache: {
  models: ModelWithScores[];
  intel: number[];
  coding: number[];
  agentic: number[];
} | null = null;

function getSortedScores() {
  const models = getAllModels();
  if (_sortedCache && _sortedCache.models === models) return _sortedCache;

  const validNums = (arr: (number | null | undefined)[]) =>
    arr.filter((s): s is number => s != null).sort((a, b) => b - a);

  _sortedCache = {
    models,
    intel: validNums(models.map((m) => m.raw.intelligence)),
    coding: validNums(models.map((m) => m.raw.coding)),
    agentic: validNums(models.map((m) => m.raw.agentic)),
  };
  return _sortedCache;
}

/** Threshold at a given percentile rank (top P%) in a descending-sorted array. */
function topPThreshold(sortedDesc: number[], pct: number): number {
  const idx = Math.floor(sortedDesc.length * (pct / 100));
  return sortedDesc[Math.min(idx, sortedDesc.length - 1)];
}

/**
 * Compute percentile-based recommendation tags for a model.
 * Compares the model's scores against all models to determine
 * which recommendation badges to show on the detail page.
 */
export function getRecommendationTags(model: ModelWithScores, maxTags = 2): RecommendationTag[] {
  const { models: allModels, intel: intelScores, coding: codingScores, agentic: agenticScores } = getSortedScores();
  const tags: RecommendationTag[] = [];

  // 1. 编程能力突出 ⌨️ — coding score in top 25% AND ≥ 40
  if (model.raw.coding != null && codingScores.length > 0) {
    if (model.raw.coding >= topPThreshold(codingScores, 25) && model.raw.coding >= 40) {
      tags.push({ key: "badgeCoding", labelKey: "product.badgeCoding", icon: "⌨️", colorClass: BADGE_PALETTE.openWeights });
    }
  }

  // 2. Agent场景推荐 🤖 — agentic score in top 25% AND ≥ 35
  if (model.raw.agentic != null && agenticScores.length > 0) {
    if (model.raw.agentic >= topPThreshold(agenticScores, 25) && model.raw.agentic >= 35) {
      tags.push({ key: "badgeAgent", labelKey: "product.badgeAgent", icon: "🤖", colorClass: BADGE_PALETTE.frontier });
    }
  }

  // 3. 性价比之选 — uses shared isValuePick definition
  if (isValuePick(model, allModels)) {
    tags.push({ key: "badgeValue", labelKey: "product.badgeValue", icon: "💰", colorClass: BADGE_PALETTE.value });
  }

  // 4. 前沿推理模型 🧠 — reasoning flag AND intelligence in top 25%
  if (model.flags.reasoning && intelScores.length > 0) {
    if (model.raw.intelligence >= topPThreshold(intelScores, 25)) {
      tags.push({ key: "badgeReasoning", labelKey: "product.badgeReasoning", icon: "🧠", colorClass: BADGE_PALETTE.reasoning });
    }
  }

  // 5. 经济实惠 💰 — blended price < $1/M AND intelligence ≥ 30
  if (model.raw.blended != null && model.raw.blended < 1 && model.raw.intelligence >= 30) {
    tags.push({ key: "badgeBudget", labelKey: "product.badgeBudget", icon: "💰", colorClass: "bg-accent-cyan/10 text-accent-cyan" });
  }

  // 6. 开源标杆 🌐 — open_weights AND intelligence ≥ 50
  if (model.flags.open_weights && model.raw.intelligence >= 50) {
    tags.push({ key: "badgeOpenLeader", labelKey: "product.badgeOpenLeader", icon: "🌐", colorClass: "bg-accent-cyan/10 text-accent-cyan" });
  }

  return tags.slice(0, maxTags);
}

/**
 * Generate a one-line summary for a model based on its ranking data.
 * Displayed under the model name on the detail page.
 */
export function getModelOneLiner(model: ModelWithScores): { labelKey: string } {
  const { models: allModels } = getSortedScores();

  // Rank intelligence (descending)
  const rankedByIntel = [...allModels]
    .filter((m) => m.raw.intelligence != null)
    .sort((a, b) => (b.raw.intelligence ?? 0) - (a.raw.intelligence ?? 0));
  const intelRank = rankedByIntel.findIndex((m) => m.id === model.id) + 1;

  // Rank coding (descending)
  const rankedByCoding = [...allModels]
    .filter((m) => m.raw.coding != null)
    .sort((a, b) => (b.raw.coding ?? 0) - (a.raw.coding ?? 0));
  const codingRank = rankedByCoding.findIndex((m) => m.id === model.id) + 1;

  // Rank agentic (descending)
  const rankedByAgent = [...allModels]
    .filter((m) => m.raw.agentic != null)
    .sort((a, b) => (b.raw.agentic ?? 0) - (a.raw.agentic ?? 0));
  const agentRank = rankedByAgent.findIndex((m) => m.id === model.id) + 1;

  // Priority chain — first match wins
  if (intelRank > 0 && intelRank <= 5) return { labelKey: "product.oneLinerTopIntel" };
  if (model.flags.frontier && model.raw.blended != null && model.raw.blended > 0 && model.raw.blended < 1) {
    return { labelKey: "product.oneLinerFrontierValue" };
  }
  if (codingRank > 0 && codingRank <= 10) return { labelKey: "product.oneLinerCoding" };
  if (agentRank > 0 && agentRank <= 10) return { labelKey: "product.oneLinerAgentic" };
  if (model.flags.reasoning) return { labelKey: "product.oneLinerReasoning" };
  return { labelKey: "product.oneLinerDefault" };
}

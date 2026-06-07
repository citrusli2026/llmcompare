import { type ModelWithScores, getAllModels } from "./scoring";

export interface RecommendationTag {
  key: string;
  labelKey: string;
  icon: string;
  colorClass: string;
}

/**
 * Compute percentile-based recommendation tags for a model.
 * Compares the model's scores against all models to determine
 * which recommendation badges to show on the detail page.
 * This transforms the detail page from "here's raw data" to
 * "here's why this model is good for X".
 */
export function getRecommendationTags(model: ModelWithScores): RecommendationTag[] {
  const allModels = getAllModels();
  const tags: RecommendationTag[] = [];

  // Helper: find the threshold at a given percentile rank (top P%)
  const topPThreshold = (sortedDesc: number[], pct: number): number => {
    const idx = Math.floor(sortedDesc.length * (pct / 100));
    return sortedDesc[Math.min(idx, sortedDesc.length - 1)];
  };

  // Pre-compute sorted score arrays
  const intelScores = allModels
    .map((m) => m.raw.intelligence)
    .filter((s): s is number => s != null)
    .sort((a, b) => b - a);

  const codingScores = allModels
    .map((m) => m.raw.coding)
    .filter((s): s is number => s != null)
    .sort((a, b) => b - a);

  const agenticScores = allModels
    .map((m) => m.raw.agentic)
    .filter((s): s is number => s != null)
    .sort((a, b) => b - a);

  const pricedModels = allModels
    .map((m) => m.raw.blended)
    .filter((p): p is number => p != null && p > 0)
    .sort((a, b) => a - b); // ascending for price

  // 1. 编程能力突出 ⌨️ — coding score in top 25% AND ≥ 40
  if (model.raw.coding != null && codingScores.length > 0) {
    const top25Coding = topPThreshold(codingScores, 25);
    if (model.raw.coding >= top25Coding && model.raw.coding >= 40) {
      tags.push({
        key: "badgeCoding",
        labelKey: "product.badgeCoding",
        icon: "⌨️",
        colorClass: "bg-accent-lime/10 text-accent-lime",
      });
    }
  }

  // 2. Agent场景推荐 🤖 — agentic score in top 25% AND ≥ 35
  if (model.raw.agentic != null && agenticScores.length > 0) {
    const top25Agent = topPThreshold(agenticScores, 25);
    if (model.raw.agentic >= top25Agent && model.raw.agentic >= 35) {
      tags.push({
        key: "badgeAgent",
        labelKey: "product.badgeAgent",
        icon: "🤖",
        colorClass: "bg-accent-violet/10 text-accent-violet",
      });
    }
  }

  // 3. 性价比之选 💎 — intelligence ≥ 40 AND blended price in bottom 50% of priced models
  if (model.raw.intelligence >= 40 && model.raw.blended != null && model.raw.blended > 0 && pricedModels.length > 0) {
    const medianPriceIdx = Math.floor(pricedModels.length / 2);
    const medianPrice = pricedModels[medianPriceIdx];
    if (model.raw.blended <= medianPrice) {
      tags.push({
        key: "badgeValue",
        labelKey: "product.badgeValue",
        icon: "💎",
        colorClass: "bg-emerald-500/10 text-emerald-500",
      });
    }
  }

  // 4. 前沿推理模型 🧠 — reasoning flag AND intelligence in top 25%
  if (model.flags.reasoning && intelScores.length > 0) {
    const top25Intel = topPThreshold(intelScores, 25);
    if (model.raw.intelligence >= top25Intel) {
      tags.push({
        key: "badgeReasoning",
        labelKey: "product.badgeReasoning",
        icon: "🧠",
        colorClass: "bg-amber-500/10 text-amber-500",
      });
    }
  }

  // 5. 经济实惠 💰 — blended price < $1/M AND intelligence ≥ 30
  if (model.raw.blended != null && model.raw.blended < 1 && model.raw.intelligence >= 30) {
    tags.push({
      key: "badgeBudget",
      labelKey: "product.badgeBudget",
      icon: "💰",
      colorClass: "bg-sky-500/10 text-sky-500",
    });
  }

  // 6. 开源标杆 🌐 — open_weights AND intelligence ≥ 50
  if (model.flags.open_weights && model.raw.intelligence >= 50) {
    tags.push({
      key: "badgeOpenLeader",
      labelKey: "product.badgeOpenLeader",
      icon: "🌐",
      colorClass: "bg-cyan-500/10 text-cyan-500",
    });
  }

  return tags;
}

/**
 * Generate a one-line summary for a model based on its ranking data.
 * This is displayed under the model name on the detail page to provide
 * an immediate sense of what the model is good for — transforming
 * the page from raw data display to decision guidance.
 */
export function getModelOneLiner(model: ModelWithScores): { labelKey: string } {
  const allModels = getAllModels();

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

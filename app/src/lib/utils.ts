import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAllModels, type ModelWithScores, ModelType, type ModelTypeValue } from "@/lib/scoring"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTokenCount(val: number): { value: string; unit: "T" | "B" | "M" | "" } {
  if (val >= 1e12) return { value: (val / 1e12).toFixed(2), unit: "T" };
  if (val >= 1e9) return { value: (val / 1e9).toFixed(1), unit: "B" };
  if (val >= 1e6) return { value: (val / 1e6).toFixed(1), unit: "M" };
  return { value: val.toLocaleString(), unit: "" };
}

/**
 * Format a token limit (context window / max output) for display.
 * 128000 → "128K", 1048576 → "1M"
 */
export function formatTokenLimit(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

/**
 * Format a model parameter count (in billions) for display.
 * 7B → "7B", 1000B → "1T", 1600B → "1.6T"
 */
export function formatParameters(billions: number): string {
  if (billions >= 1000) {
    const trillions = billions / 1000;
    return Number.isInteger(trillions) ? `${trillions}T` : `${trillions.toFixed(1)}T`;
  }
  return `${billions}B`;
}

/**
 * Badge palette for type/feature chips.
 * Single source of truth — all component Badges should use this map.
 * Each entry has a tinted bg + accessible fg (≥ 4.5:1 on white).
 */
export const BADGE_PALETTE = {
  open: "bg-accent-lime/10 text-accent-lime",
  closed: "bg-accent-violet/10 text-accent-violet",
  frontier: "bg-accent-violet/10 text-accent-violet",
  reasoning: "bg-accent-amber/10 text-accent-amber",
  openWeights: "bg-accent-lime/10 text-accent-lime",
  imageInput: "bg-accent-cyan/10 text-accent-cyan",
  chineseEval: "bg-accent-blue/10 text-accent-blue",
  value: "bg-accent-emerald/10 text-accent-emerald",
  danger: "bg-accent-fuchsia/10 text-accent-fuchsia",
  neutral: "bg-surface-elevated text-text-secondary border border-surface-border",
} as const;

export function getTypeBadgeClasses(type: ModelTypeValue): string {
  return type === ModelType.Open ? BADGE_PALETTE.open : BADGE_PALETTE.closed;
}

export function getFeatureBadgeClasses(feature: "frontier" | "reasoning" | "open_weights" | "image_input" | "chinese_eval"): string {
  const map = {
    frontier: BADGE_PALETTE.frontier,
    reasoning: BADGE_PALETTE.reasoning,
    open_weights: BADGE_PALETTE.openWeights,
    image_input: BADGE_PALETTE.imageInput,
    chinese_eval: BADGE_PALETTE.chineseEval,
  };
  return map[feature];
}

/**
 * Single source of truth for "value pick" — used by both the recommendation
 * tags system (detail page) and the table row (mobile card + list).
 * Definition: intelligence ≥ 40 AND blended price in bottom 50% of priced models.
 */
export function isValuePick(model: ModelWithScores, allModels?: ModelWithScores[]): boolean {
  const intelligence = model.raw.intelligence;
  const blended = model.raw.blended;
  if (intelligence == null || intelligence < 40) return false;
  if (blended == null || blended <= 0) return false;
  const models = allModels ?? getAllModels();
  const pricedModels = models
    .map((m) => m.raw.blended)
    .filter((p): p is number => p != null && p > 0)
    .sort((a, b) => a - b);
  if (pricedModels.length === 0) return false;
  const medianPrice = pricedModels[Math.floor(pricedModels.length / 2)];
  return blended <= medianPrice;
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAllModels, type ModelWithScores } from "@/lib/scoring"

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

export function getTypeBadgeClasses(type: "开源" | "闭源"): string {
  return type === "开源" ? BADGE_PALETTE.open : BADGE_PALETTE.closed;
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

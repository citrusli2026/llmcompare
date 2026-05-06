import type { Percentiles } from "./percentiles";

export type ColoredKey = "intelligence" | "coding" | "agentic" | "arenaCode" | "cost";

export const COLOR_BY_BUCKET = {
  emerald: "text-emerald-500 dark:text-emerald-400",
  blue: "text-blue-500 dark:text-blue-300",
  amber: "text-amber-500 dark:text-amber-300",
  red: "text-red-500 dark:text-red-400",
  dim: "text-text-dim",
} as const;

export const ASCENDING: Record<ColoredKey, boolean> = {
  intelligence: true,
  coding: true,
  agentic: true,
  arenaCode: true,
  cost: false,
};

export function bucketByPercentile(
  val: number,
  p: Percentiles,
  ascending: boolean
): keyof typeof COLOR_BY_BUCKET {
  if (ascending) {
    if (val >= p.p75) return "emerald";
    if (val >= p.p50) return "blue";
    if (val >= p.p25) return "amber";
    return "red";
  }
  if (val <= p.p25) return "emerald";
  if (val <= p.p50) return "blue";
  if (val <= p.p75) return "amber";
  return "red";
}

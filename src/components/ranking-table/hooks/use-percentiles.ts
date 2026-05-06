import { useMemo } from "react";
import type { ModelWithScores } from "@/lib/scoring";
import { computePercentiles, type Percentiles } from "../utils/percentiles";
import type { ColoredKey } from "../utils/color-buckets";

export function usePercentiles(models: ModelWithScores[]): Record<ColoredKey, Percentiles | null> {
  return useMemo(
    () => ({
      intelligence: computePercentiles(models.map((m) => m.raw.intelligence)),
      coding: computePercentiles(models.map((m) => m.raw.coding)),
      agentic: computePercentiles(models.map((m) => m.raw.agentic)),
      arenaCode: computePercentiles(models.map((m) => m.raw.arena_code)),
      cost: computePercentiles(models.map((m) => m.raw.openrouter_pricing?.completion ?? null)),
    }),
    [models]
  );
}

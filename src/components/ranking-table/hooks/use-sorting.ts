import { useMemo } from "react";
import type { ModelWithScores } from "@/lib/scoring";

export type SortKey = "intelligence" | "coding" | "agentic" | "arenaCode" | "cost" | "tokens" | "date";

export function getRawValue(model: ModelWithScores, key: SortKey): number | null {
  switch (key) {
    case "intelligence":
      return model.raw.intelligence;
    case "coding":
      return model.raw.coding ?? null;
    case "agentic":
      return model.raw.agentic ?? null;
    case "arenaCode":
      return model.raw.arena_code ?? null;
    case "cost":
      return model.raw.openrouter_pricing?.completion ?? null;
    case "tokens":
      return model.raw.openrouter_weekly_tokens ?? null;
    case "date":
      return null;
  }
}

interface UseSortingOptions {
  models: ModelWithScores[];
  sortKey: SortKey;
  sortDesc: boolean;
}

export function useSortedModels({ models, sortKey, sortDesc }: UseSortingOptions) {
  const intlModels = useMemo(
    () => models.filter((m) => m.raw.isInternational),
    [models]
  );
  const frontierModels = useMemo(
    () => models.filter((m) => !m.raw.isInternational && m.flags.frontier),
    [models]
  );
  const mainstreamModels = useMemo(
    () => models.filter((m) => !m.raw.isInternational && !m.flags.frontier),
    [models]
  );

  const sortFn = useMemo(() => {
    return (a: ModelWithScores, b: ModelWithScores) => {
      if (sortKey === "date") {
        const aDate = a.raw.release_date ?? "";
        const bDate = b.raw.release_date ?? "";
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return sortDesc ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
      }
      const aVal = getRawValue(a, sortKey);
      const bVal = getRawValue(b, sortKey);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      return sortDesc ? bVal - aVal : aVal - bVal;
    };
  }, [sortKey, sortDesc]);

  const sortedIntl = useMemo(() => [...intlModels].sort(sortFn), [intlModels, sortFn]);
  const sortedFrontier = useMemo(() => [...frontierModels].sort(sortFn), [frontierModels, sortFn]);
  const sortedMainstream = useMemo(() => [...mainstreamModels].sort(sortFn), [mainstreamModels, sortFn]);

  return {
    sortedIntl,
    sortedFrontier,
    sortedMainstream,
    frontierCount: frontierModels.length,
  };
}

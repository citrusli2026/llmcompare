"use client";

import { useMemo } from "react";
import { type ModelWithScores } from "@/lib/scoring";
import { type SortKey, type ModelGroup } from "./types";
import { getRawValue } from "./utils";

/** Compare two models by sort key — nulls sort last. */
function compareModels(a: ModelWithScores, b: ModelWithScores, sortKey: SortKey, sortDesc: boolean): number {
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
}

/**
 * Returns a single sorted group of all models.
 * Previously supported multiple groups (international/domestic); simplified to one.
 */
export function useModelGroups(models: ModelWithScores[], sortKey: SortKey, sortDesc: boolean): ModelGroup[] {
  return useMemo(() => {
    const sorted = [...models].sort((a, b) => compareModels(a, b, sortKey, sortDesc));
    return [{
      key: "all",
      labelKey: "common.models",
      badgeClass: "",
      badgeTextClass: "",
      filter: () => true,
      showRank: true,
      rankOffset: 0,
      items: sorted,
    }];
  }, [models, sortKey, sortDesc]);
}

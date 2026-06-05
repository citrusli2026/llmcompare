"use client";

import { useMemo } from "react";
import { type ModelWithScores } from "@/lib/scoring";
import { type SortKey, type ModelGroup } from "./types";
import { getRawValue } from "./utils";

// 单组模型：所有模型统一排序，不再按国际/国内分组
const GROUPS: Omit<ModelGroup, "rankOffset" | "items">[] = [
  {
    key: "all",
    labelKey: "common.models",
    badgeClass: "",
    badgeTextClass: "",
    filter: () => true,
    showRank: true,
  },
];

export function useModelGroups(models: ModelWithScores[], sortKey: SortKey, sortDesc: boolean) {
  const groups = useMemo(() => {
    const sortFn = (a: ModelWithScores, b: ModelWithScores) => {
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

    return GROUPS.reduce<{ groups: ModelGroup[]; rankOffset: number }>(
      (acc, g) => {
        const items = models.filter(g.filter).sort(sortFn);
        acc.groups.push({ ...g, items, rankOffset: acc.rankOffset });
        if (g.showRank) acc.rankOffset += items.length;
        return acc;
      },
      { groups: [], rankOffset: 0 }
    ).groups;
  }, [models, sortKey, sortDesc]);

  return groups;
}

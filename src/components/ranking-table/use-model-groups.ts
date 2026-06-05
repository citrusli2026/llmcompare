"use client";

import { useMemo } from "react";
import { type ModelWithScores } from "@/lib/scoring";
import { type SortKey, type ModelGroup } from "./types";
import { getRawValue } from "./utils";

// 分离三组模型：国际标杆、国内前沿、国内主力，各自内部排序，组间不混排
const GROUPS: Omit<ModelGroup, "rankOffset" | "items">[] = [
  {
    key: "intl",
    labelKey: "common.intlBaseline",
    badgeClass: "bg-amber-500/10",
    badgeTextClass: "text-amber-600 dark:text-amber-300",
    filter: (m) => m.raw.isInternational,
    showRank: false,
  },
  {
    key: "frontier",
    labelKey: "common.frontier",
    badgeClass: "bg-violet-500/10",
    badgeTextClass: "text-violet-400",
    borderClass: "border-t-2 border-t-surface-border",
    filter: (m) => !m.raw.isInternational && m.flags.frontier,
    showRank: true,
  },
  {
    key: "mainstream",
    labelKey: "common.mainstream",
    badgeClass: "bg-blue-500/10",
    badgeTextClass: "text-blue-400",
    borderClass: "border-t-2 border-t-surface-border",
    filter: (m) => !m.raw.isInternational && !m.flags.frontier,
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

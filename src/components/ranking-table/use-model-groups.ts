"use client";

import { useMemo } from "react";
import { type ModelWithScores } from "@/lib/scoring";
import { type SortKey, type ModelGroup } from "./types";
import { getRawValue } from "./utils";

const GROUPS: Omit<ModelGroup, "rankOffset" | "items">[] = [
  {
    key: "intl",
    labelKey: "common.intlBaseline",
    badgeClass: "bg-amber-500/10",
    badgeTextClass: "text-amber-600 dark:text-amber-300",
    rowBgClass: "bg-amber-500/[0.06] dark:bg-amber-500/[0.08]",
    borderClass: "border-t-2 border-t-amber-400/50",
    filter: (m) => m.raw.isInternational,
    showRank: false,
  },
  {
    key: "frontier",
    labelKey: "common.frontier",
    badgeClass: "bg-violet-500/10",
    badgeTextClass: "text-violet-400",
    rowBgClass: "bg-violet-500/[0.03] dark:bg-violet-500/[0.04]",
    filter: (m) => !m.raw.isInternational && m.flags.frontier,
    showRank: true,
  },
  {
    key: "mainstream",
    labelKey: "common.mainstream",
    badgeClass: "bg-blue-500/10",
    badgeTextClass: "text-blue-400",
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

    let rankOffset = 0;
    return GROUPS.map((g) => {
      const items = models.filter(g.filter).sort(sortFn);
      const group = { ...g, items, rankOffset };
      if (g.showRank) rankOffset += items.length;
      return group;
    });
  }, [models, sortKey, sortDesc]);

  return groups;
}

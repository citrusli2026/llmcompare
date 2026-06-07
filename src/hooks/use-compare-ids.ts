"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getModelById, type ModelWithScores } from "@/lib/scoring";

export const MAX_COMPARE = 6;

/**
 * Hook for managing model compare selection state via URL search params.
 *
 * Returns:
 * - compareIds: selected model IDs from URL
 * - selectedCompareModels: resolved ModelWithScores objects
 * - isInCompare(id): check if a given model is selected
 * - toggleCompare(id): add/remove a model
 * - handleRemoveCompare(id): remove a specific model
 * - handleClearCompare: clear all selections
 */
export function useCompareIds() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const compareIds = useMemo(
    () => searchParams.get("compare")?.split(",").filter(Boolean) ?? [],
    [searchParams]
  );

  const selectedCompareModels = useMemo(
    () =>
      compareIds
        .map((id) => getModelById(id))
        .filter((m): m is ModelWithScores => m != null),
    [compareIds]
  );

  const updateUrl = useCallback(
    (ids: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (ids.length > 0) {
        params.set("compare", ids.join(","));
      } else {
        params.delete("compare");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const isInCompare = useCallback(
    (id: string) => compareIds.includes(id),
    [compareIds]
  );

  const toggleCompare = useCallback(
    (id: string) => {
      let next: string[];
      if (compareIds.includes(id)) {
        next = compareIds.filter((cid) => cid !== id);
      } else {
        if (compareIds.length >= MAX_COMPARE) return;
        next = [...compareIds, id];
      }
      updateUrl(next);
    },
    [compareIds, updateUrl]
  );

  const handleRemoveCompare = useCallback(
    (id: string) => {
      const next = compareIds.filter((cid) => cid !== id);
      updateUrl(next);
    },
    [compareIds, updateUrl]
  );

  const handleClearCompare = useCallback(() => {
    updateUrl([]);
  }, [updateUrl]);

  return {
    compareIds,
    selectedCompareModels,
    isInCompare,
    toggleCompare,
    handleRemoveCompare,
    handleClearCompare,
  };
}

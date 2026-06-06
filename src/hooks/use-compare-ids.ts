"use client";

import { useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getModelById, type ModelWithScores } from "@/lib/scoring";

const MAX_COMPARE = 6;

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
      let current = compareIds;
      if (compareIds.includes(id)) {
        current = current.filter((cid) => cid !== id);
      } else {
        if (current.length >= MAX_COMPARE) return;
        current = [...current, id];
      }
      updateUrl(current);
    },
    [compareIds, updateUrl]
  );

  const handleRemoveCompare = useCallback(
    (id: string) => {
      updateUrl(compareIds.filter((cid) => cid !== id));
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

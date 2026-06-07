"use client";

import { useMemo, useCallback } from "react";
import { getModelById, type ModelWithScores } from "@/lib/scoring";
import { useUrlSearchParams } from "./use-url-search-params";

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
  const searchParams = useUrlSearchParams();

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
      const params = new URLSearchParams(window.location.search);
      if (ids.length > 0) {
        params.set("compare", ids.join(","));
      } else {
        params.delete("compare");
      }
      const qs = params.toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.pushState({}, "", url);
      // Dispatch popstate so useUrlSearchParams detects the change
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    []
  );

  const isInCompare = useCallback(
    (id: string) => compareIds.includes(id),
    [compareIds]
  );

  const toggleCompare = useCallback(
    (id: string) => {
      const current = compareIds;
      let next: string[];
      if (current.includes(id)) {
        next = current.filter((cid) => cid !== id);
      } else {
        if (current.length >= MAX_COMPARE) return;
        next = [...current, id];
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

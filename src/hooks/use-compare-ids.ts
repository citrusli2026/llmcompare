"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getModelById, type ModelWithScores } from "@/lib/scoring";

const MAX_COMPARE_DESKTOP = 3;
const MAX_COMPARE_MOBILE = 2;
const MOBILE_BREAKPOINT = 640;

function getMaxCompare(): number {
  if (typeof window === "undefined") return MAX_COMPARE_DESKTOP;
  return window.innerWidth < MOBILE_BREAKPOINT
    ? MAX_COMPARE_MOBILE
    : MAX_COMPARE_DESKTOP;
}

/**
 * Hook for managing model compare selection state via URL search params.
 *
 * Compare limit is responsive: 2 on mobile (< 640px), 3 on desktop (>= 640px).
 *
 * Returns:
 * - compareIds: selected model IDs from URL
 * - selectedCompareModels: resolved ModelWithScores objects
 * - isInCompare(id): check if a given model is selected
 * - toggleCompare(id): add/remove a model
 * - handleRemoveCompare(id): remove a specific model
 * - handleClearCompare: clear all selections
 * - maxCompare: current max for the viewport
 * - isAtMax: true when count reaches max
 */
export function useCompareIds() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [maxCompare, setMaxCompare] = useState<number>(MAX_COMPARE_DESKTOP);

  useEffect(() => {
    const update = () => setMaxCompare(getMaxCompare());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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
      // Mirror to localStorage so /compare can fall back when opened without ?models=
      try {
        if (typeof window !== "undefined") {
          if (ids.length > 0) {
            window.localStorage.setItem("llmcompare-compare", ids.join(","));
          } else {
            window.localStorage.removeItem("llmcompare-compare");
          }
        }
      } catch {
        // ignore quota / privacy errors
      }
    },
    [searchParams, router]
  );

  const isInCompare = useCallback(
    (id: string) => compareIds.includes(id),
    [compareIds]
  );

  const isAtMax = compareIds.length >= maxCompare;

  const toggleCompare = useCallback(
    (id: string) => {
      let next: string[];
      if (compareIds.includes(id)) {
        next = compareIds.filter((cid) => cid !== id);
      } else {
        if (compareIds.length >= maxCompare) return;
        next = [...compareIds, id];
      }
      updateUrl(next);
    },
    [compareIds, updateUrl, maxCompare]
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
    maxCompare,
    isAtMax,
  };
}

"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getModelById, type ModelWithScores } from "@/lib/scoring";

const MAX_COMPARE_DESKTOP = 3;
const MAX_COMPARE_MOBILE = 2;
const MOBILE_BREAKPOINT = 640;

function getMaxCompare(): number {
  if (typeof window === "undefined") return MAX_COMPARE_DESKTOP;
  return window.innerWidth < MOBILE_BREAKPOINT ? MAX_COMPARE_MOBILE : MAX_COMPARE_DESKTOP;
}

/**
 * Responsive compare limit (2 mobile / 3 desktop), kept in sync on resize.
 * Shared by useCompareIds and the /compare page add-model control.
 */
export function useMaxCompare(): number {
  const [maxCompare, setMaxCompare] = useState<number>(MAX_COMPARE_DESKTOP);

  useEffect(() => {
    const update = () => setMaxCompare(getMaxCompare());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return maxCompare;
}

/**
 * Manages model compare selection via URL ?compare=id1,id2&id3 + localStorage fallback.
 * Responsive limit: 2 mobile / 3 desktop.
 */
export function useCompareIds() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const maxCompare = useMaxCompare();

  const compareIds = useMemo(
    () => searchParams.get("compare")?.split(",").filter(Boolean) ?? [],
    [searchParams],
  );

  const selectedModels = useMemo(
    () => compareIds.map((id) => getModelById(id)).filter((m): m is ModelWithScores => m != null),
    [compareIds],
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
      // Mirror to localStorage for /compare fallback
      try {
        if (typeof window !== "undefined") {
          if (ids.length > 0) {
            window.localStorage.setItem("llmcompare-compare", ids.join(","));
          } else {
            window.localStorage.removeItem("llmcompare-compare");
          }
        }
      } catch {}
    },
    [searchParams, router],
  );

  const isInCompare = useCallback((id: string) => compareIds.includes(id), [compareIds]);
  const isAtMax = compareIds.length >= maxCompare;

  const toggleCompare = useCallback(
    (id: string) => {
      if (compareIds.includes(id)) {
        updateUrl(compareIds.filter((cid) => cid !== id));
      } else if (compareIds.length < maxCompare) {
        updateUrl([...compareIds, id]);
      }
    },
    [compareIds, updateUrl, maxCompare],
  );

  const removeCompare = useCallback(
    (id: string) => updateUrl(compareIds.filter((cid) => cid !== id)),
    [compareIds, updateUrl],
  );

  const clearCompare = useCallback(() => updateUrl([]), [updateUrl]);

  return {
    compareIds,
    selectedModels,
    isInCompare,
    isAtMax,
    toggleCompare,
    removeCompare,
    clearCompare,
    maxCompare,
  };
}

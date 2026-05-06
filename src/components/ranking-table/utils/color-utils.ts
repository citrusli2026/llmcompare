import type { Percentiles } from "../utils/percentiles";
import { COLOR_BY_BUCKET, ASCENDING, type ColoredKey } from "../utils/color-buckets";
import type { SortKey } from "../hooks/use-sorting";

export function getScoreColor(
  val: number | null | undefined,
  key: SortKey,
  percentiles: Record<ColoredKey, Percentiles | null>
): string {
  if (val == null) return COLOR_BY_BUCKET.dim;
  if (key === "date" || key === "tokens") return "";
  const p = percentiles[key];
  if (!p) return COLOR_BY_BUCKET.dim;
  return COLOR_BY_BUCKET[bucketByPercentile(val, p, ASCENDING[key])];
}

function bucketByPercentile(
  val: number,
  p: Percentiles,
  ascending: boolean
): keyof typeof COLOR_BY_BUCKET {
  if (ascending) {
    if (val >= p.p75) return "emerald";
    if (val >= p.p50) return "blue";
    if (val >= p.p25) return "amber";
    return "red";
  }
  if (val <= p.p25) return "emerald";
  if (val <= p.p50) return "blue";
  if (val <= p.p75) return "amber";
  return "red";
}

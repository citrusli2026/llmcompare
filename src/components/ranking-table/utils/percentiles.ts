export type Percentiles = { p25: number; p50: number; p75: number };

export function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

export function computePercentiles(values: (number | null | undefined)[]): Percentiles | null {
  const valid = values
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .sort((a, b) => a - b);
  if (valid.length < 2) return null;
  return { p25: quantile(valid, 0.25), p50: quantile(valid, 0.5), p75: quantile(valid, 0.75) };
}

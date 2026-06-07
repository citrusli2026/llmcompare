/**
 * Shared utility functions for the Compare page.
 * Extracted from compare-client.tsx so they can be unit-tested
 * without code duplication.
 */

export function formatNum(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "\u2014";
  return v.toFixed(decimals);
}

export function isBestValue(
  val: number | null,
  vals: (number | null)[],
  higherIsBetter: boolean
): boolean {
  if (val == null) return false;
  const valid = vals.filter((v): v is number => v != null);
  if (valid.length === 0) return false;
  return higherIsBetter ? val >= Math.max(...valid) : val <= Math.min(...valid);
}

export function barColor(fillPct: number): string {
  return fillPct >= 80 ? "bg-accent-lime"
    : fillPct >= 65 ? "bg-accent-violet"
    : fillPct >= 50 ? "bg-accent-coral"
    : "bg-text-muted";
}

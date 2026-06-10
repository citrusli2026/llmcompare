/**
 * Shared utility functions for the Compare page.
 * Extracted from compare-client.tsx so they can be unit-tested
 * without code duplication.
 */

export function formatNum(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "\u2014";
  return v.toFixed(decimals);
}

/**
 * Format a model parameter count (in billions) for display.
 * 7B \u2192 "7B", 1000B \u2192 "1T", 1600B \u2192 "1.6T", 1234B \u2192 "1.2T"
 */
export function formatParameters(billions: number): string {
  if (billions >= 1000) {
    const trillions = billions / 1000;
    return Number.isInteger(trillions) ? `${trillions}T` : `${trillions.toFixed(1)}T`;
  }
  return `${billions}B`;
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

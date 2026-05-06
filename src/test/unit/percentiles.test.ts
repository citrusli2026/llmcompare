import { describe, it, expect } from 'vitest';
import { quantile, computePercentiles } from '@/components/ranking-table/utils/percentiles';
import { bucketByPercentile, COLOR_BY_BUCKET, ASCENDING } from '@/components/ranking-table/utils/color-buckets';

describe('quantile', () => {
  it('calculates median correctly for odd-length array', () => {
    const sorted = [1, 2, 3, 4, 5];
    expect(quantile(sorted, 0.5)).toBe(3);
  });

  it('handles even-length arrays with interpolation', () => {
    const sorted = [1, 2, 3, 4];
    const result = quantile(sorted, 0.5);
    expect(result).toBeGreaterThanOrEqual(2);
    expect(result).toBeLessThanOrEqual(4);
  });

  it('handles single element', () => {
    const sorted = [42];
    expect(quantile(sorted, 0.5)).toBe(42);
  });

  it('calculates p25 correctly', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = quantile(sorted, 0.25);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(4);
  });
});

describe('computePercentiles', () => {
  it('returns null for insufficient data', () => {
    expect(computePercentiles([])).toBeNull();
    expect(computePercentiles([1])).toBeNull();
  });

  it('computes percentiles for valid data with correct ordering', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80];
    const result = computePercentiles(values);
    expect(result).not.toBeNull();
    expect(result!.p25).toBeLessThanOrEqual(result!.p50);
    expect(result!.p50).toBeLessThanOrEqual(result!.p75);
  });

  it('handles null and undefined values', () => {
    const values = [10, null, 20, undefined, 30];
    const result = computePercentiles(values);
    expect(result).not.toBeNull();
    expect(result!.p25).toBeGreaterThanOrEqual(10);
    expect(result!.p25).toBeLessThanOrEqual(30);
  });

  it('handles NaN and Infinity', () => {
    const values = [10, NaN, Infinity, 20, -Infinity, 30];
    const result = computePercentiles(values);
    expect(result).not.toBeNull();
  });
});

describe('bucketByPercentile - ascending values', () => {
  const percentiles = { p25: 25, p50: 50, p75: 75 };

  it('returns emerald for top tier (>= p75)', () => {
    expect(bucketByPercentile(100, percentiles, true)).toBe('emerald');
    expect(bucketByPercentile(80, percentiles, true)).toBe('emerald');
  });

  it('returns blue for upper-mid tier (>= p50, < p75)', () => {
    expect(bucketByPercentile(60, percentiles, true)).toBe('blue');
    expect(bucketByPercentile(50, percentiles, true)).toBe('blue');
  });

  it('returns amber for lower-mid tier (>= p25, < p50)', () => {
    expect(bucketByPercentile(35, percentiles, true)).toBe('amber');
    expect(bucketByPercentile(25, percentiles, true)).toBe('amber');
  });

  it('returns red for bottom tier (< p25)', () => {
    expect(bucketByPercentile(10, percentiles, true)).toBe('red');
    expect(bucketByPercentile(0, percentiles, true)).toBe('red');
  });
});

describe('bucketByPercentile - descending values (cost)', () => {
  const percentiles = { p25: 10, p50: 50, p75: 100 };

  it('returns emerald for cheapest (<= p25)', () => {
    expect(bucketByPercentile(5, percentiles, false)).toBe('emerald');
    expect(bucketByPercentile(10, percentiles, false)).toBe('emerald');
  });

  it('returns blue for mid-cost (<= p50, > p25)', () => {
    expect(bucketByPercentile(30, percentiles, false)).toBe('blue');
    expect(bucketByPercentile(50, percentiles, false)).toBe('blue');
  });

  it('returns amber for higher-cost (<= p75, > p50)', () => {
    expect(bucketByPercentile(75, percentiles, false)).toBe('amber');
  });

  it('returns red for most expensive (> p75)', () => {
    expect(bucketByPercentile(150, percentiles, false)).toBe('red');
  });
});

describe('COLOR_BY_BUCKET', () => {
  it('has all required color keys', () => {
    expect(COLOR_BY_BUCKET).toHaveProperty('emerald');
    expect(COLOR_BY_BUCKET).toHaveProperty('blue');
    expect(COLOR_BY_BUCKET).toHaveProperty('amber');
    expect(COLOR_BY_BUCKET).toHaveProperty('red');
    expect(COLOR_BY_BUCKET).toHaveProperty('dim');
  });
});

describe('ASCENDING config', () => {
  it('has correct direction for each key', () => {
    expect(ASCENDING.intelligence).toBe(true);
    expect(ASCENDING.coding).toBe(true);
    expect(ASCENDING.agentic).toBe(true);
    expect(ASCENDING.arenaCode).toBe(true);
    expect(ASCENDING.cost).toBe(false);
  });
});

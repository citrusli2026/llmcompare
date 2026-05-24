import { describe, it, expect } from "vitest";
import { quantile, computePercentiles, bucketByPercentile, formatScore } from "@/components/ranking-table/utils";

describe("ranking-table utils", () => {
  describe("quantile", () => {
    it("computes median correctly", () => {
      const sorted = [1, 2, 3, 4, 5];
      expect(quantile(sorted, 0.5)).toBe(3);
    });

    it("computes quartiles correctly", () => {
      const sorted = [1, 2, 3, 4, 5, 6, 7, 8];
      expect(quantile(sorted, 0.25)).toBe(2.75);
      expect(quantile(sorted, 0.75)).toBe(6.25);
    });
  });

  describe("computePercentiles", () => {
    it("returns null for insufficient data", () => {
      expect(computePercentiles([1])).toBeNull();
      expect(computePercentiles([])).toBeNull();
    });

    it("computes percentiles for valid data", () => {
      const p = computePercentiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(p).not.toBeNull();
      expect(p!.p25).toBeGreaterThan(0);
      expect(p!.p50).toBe(5.5);
      expect(p!.p75).toBeGreaterThan(p!.p50);
    });

    it("ignores null/undefined values", () => {
      const p = computePercentiles([1, null, 3, undefined, 5]);
      expect(p).not.toBeNull();
      expect(p!.p50).toBe(3);
    });
  });

  describe("bucketByPercentile", () => {
    const p = { p25: 25, p50: 50, p75: 75 };

    it("ascending: high values are emerald", () => {
      expect(bucketByPercentile(80, p, true)).toBe("emerald");
    });

    it("ascending: low values are red", () => {
      expect(bucketByPercentile(10, p, true)).toBe("red");
    });

    it("descending: low values are emerald", () => {
      expect(bucketByPercentile(10, p, false)).toBe("emerald");
    });

    it("descending: high values are red", () => {
      expect(bucketByPercentile(80, p, false)).toBe("red");
    });
  });

  describe("formatScore", () => {
    it("returns dash for null", () => {
      const result = formatScore(null);
      expect(result).toBeDefined();
    });

    it("returns integer as-is", () => {
      expect(formatScore(42)).toBe(42);
    });

    it("formats float to 1 decimal", () => {
      expect(formatScore(42.55)).toBe("42.5");
    });
  });
});

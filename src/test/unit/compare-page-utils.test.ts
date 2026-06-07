import { describe, it, expect } from "vitest";
import { formatNum, isBestValue } from "@/lib/compare-utils";

describe("formatNum", () => {
  it("formats number with default decimals", () => {
    expect(formatNum(85.5)).toBe("85.50");
  });

  it("formats number with custom decimals", () => {
    expect(formatNum(120.567, 1)).toBe("120.6");
  });

  it("returns — for null", () => {
    expect(formatNum(null)).toBe("\u2014");
  });

  it("returns — for undefined", () => {
    expect(formatNum(undefined)).toBe("\u2014");
  });

  it("handles zero", () => {
    expect(formatNum(0)).toBe("0.00");
  });

  it("handles negative numbers", () => {
    expect(formatNum(-5.5)).toBe("-5.50");
  });
});

describe("isBestValue", () => {
  describe("higher is better", () => {
    it("returns true for highest value", () => {
      expect(isBestValue(95, [80, 95, 70], true)).toBe(true);
    });

    it("returns false for non-highest", () => {
      expect(isBestValue(80, [80, 95, 70], true)).toBe(false);
    });

    it("handles tie by returning true (equal highest)", () => {
      expect(isBestValue(95, [80, 95, 95], true)).toBe(true);
    });
  });

  describe("lower is better (price)", () => {
    it("returns true for lowest value", () => {
      expect(isBestValue(5, [10, 5, 20], false)).toBe(true);
    });

    it("returns false for non-lowest", () => {
      expect(isBestValue(10, [10, 5, 20], false)).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false when val is null", () => {
      expect(isBestValue(null, [50, 100], true)).toBe(false);
    });

    it("returns false when all values are null", () => {
      expect(isBestValue(50, [null, null], true)).toBe(false);
    });

    it("handles single element array", () => {
      expect(isBestValue(50, [50], true)).toBe(true);
    });

    it("handles mixed null and values", () => {
      expect(isBestValue(null, [50, null, 90], true)).toBe(false);
      expect(isBestValue(90, [null, 90, null], true)).toBe(true);
    });
  });
});

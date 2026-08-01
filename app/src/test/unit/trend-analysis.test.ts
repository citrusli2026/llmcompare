import { describe, expect, it } from "vitest";
import { findChangePoints } from "@/lib/trend-analysis";

describe("findChangePoints", () => {
  it("returns empty for a completely flat series", () => {
    expect(findChangePoints([5, 5, 5, 5])).toEqual([]);
  });

  it("marks indices where the value changes, with the previous value", () => {
    expect(findChangePoints([1, 1, 2, 2, 3])).toEqual([
      { i: 2, v: 2, prev: 1 },
      { i: 4, v: 3, prev: 2 },
    ]);
  });

  it("skips null gaps and compares against the previous non-null value", () => {
    expect(findChangePoints([1, null, null, 2, null])).toEqual([{ i: 3, v: 2, prev: 1 }]);
  });

  it("does not mark the first non-null point as a change", () => {
    expect(findChangePoints([null, null, 7, 7])).toEqual([]);
  });

  it("returns empty for all-null and single-point series", () => {
    expect(findChangePoints([null, null])).toEqual([]);
    expect(findChangePoints([3])).toEqual([]);
    expect(findChangePoints([])).toEqual([]);
  });

  it("treats a value returning to an earlier level as changes both ways", () => {
    expect(findChangePoints([10, 20, 10])).toEqual([
      { i: 1, v: 20, prev: 10 },
      { i: 2, v: 10, prev: 20 },
    ]);
  });
});

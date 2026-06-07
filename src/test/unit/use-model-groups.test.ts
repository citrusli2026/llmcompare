import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useModelGroups } from "@/components/ranking-table/use-model-groups";
import { type SortKey } from "@/components/ranking-table/types";
import { type ModelWithScores } from "@/lib/scoring";
import { makeModel } from "../fixtures";

describe("useModelGroups", () => {
  it("returns a single group with all models", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { isInternational: true }),
      makeModel("m2", { flags: { frontier: true } }),
      makeModel("m3", {}),
    ];

    const { result } = renderHook(() => useModelGroups(models, "date", true));
    const groups = result.current;

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("all");
    expect(groups[0].items).toHaveLength(3);
  });

  it("sorts by intelligence descending", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60 }),
      makeModel("m2", { intelligence: 90 }),
      makeModel("m3", { intelligence: 70 }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "intelligence", true));
    const group = result.current[0];
    expect(group.items.map((m) => m.id)).toEqual(["m2", "m3", "m1"]);
  });

  it("sorts by intelligence ascending", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60 }),
      makeModel("m2", { intelligence: 90 }),
      makeModel("m3", { intelligence: 70 }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "intelligence", false));
    const group = result.current[0];
    expect(group.items.map((m) => m.id)).toEqual(["m1", "m3", "m2"]);
  });

  it("sorts by date descending", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { release_date: "2024-01-01" }),
      makeModel("m2", { release_date: "2024-06-01" }),
      makeModel("m3", { release_date: "2024-03-01" }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "date", true));
    const group = result.current[0];
    expect(group.items.map((m) => m.id)).toEqual(["m2", "m3", "m1"]);
  });

  it("sorts by date ascending", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { release_date: "2024-01-01" }),
      makeModel("m2", { release_date: "2024-06-01" }),
      makeModel("m3", { release_date: "2024-03-01" }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "date", false));
    const group = result.current[0];
    expect(group.items.map((m) => m.id)).toEqual(["m1", "m3", "m2"]);
  });

  it("handles null dates by pushing them to end when descending", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { release_date: "2024-01-01" }),
      makeModel("m2", { release_date: null }),
      makeModel("m3", { release_date: "2024-06-01" }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "date", true));
    const group = result.current[0];
    expect(group.items.map((m) => m.id)).toEqual(["m3", "m1", "m2"]);
  });

  it("handles null values in numeric sort by pushing them to end", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60 }),
      makeModel("m2", { intelligence: null as unknown as number }),
      makeModel("m3", { intelligence: 80 }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "intelligence", true));
    const group = result.current[0];
    expect(group.items.map((m) => m.id)).toEqual(["m3", "m1", "m2"]);
  });

  it("calculates rankOffset correctly (starts at 0 for all)", () => {
    const models: ModelWithScores[] = [
      makeModel("f1", { flags: { frontier: true } }),
      makeModel("f2", { flags: { frontier: true } }),
      makeModel("m1", {}),
    ];

    const { result } = renderHook(() => useModelGroups(models, "intelligence", true));
    const group = result.current[0];

    expect(group.key).toBe("all");
    expect(group.rankOffset).toBe(0);
    expect(group.items).toHaveLength(3);
    expect(group.showRank).toBe(true);
  });

  it("returns empty group when no models", () => {
    const models: ModelWithScores[] = [];
    const { result } = renderHook(() => useModelGroups(models, "intelligence", true));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].items.length).toBe(0);
  });

  it("includes all models regardless of isInternational flag", () => {
    const models: ModelWithScores[] = [
      makeModel("intl-1", { isInternational: true }),
      makeModel("intl-2", { isInternational: true }),
      makeModel("cn-1", { isInternational: false }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "date", true));
    const group = result.current[0];
    expect(group.items).toHaveLength(3);
    expect(group.items.map((m) => m.id)).toEqual(["intl-1", "intl-2", "cn-1"]);
  });

  it("recomputes when sortKey changes", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60, coding: 90 }),
      makeModel("m2", { intelligence: 90, coding: 60 }),
    ];

    const { result, rerender } = renderHook(
      ({ sortKey }) => useModelGroups(models, sortKey, true),
      { initialProps: { sortKey: "intelligence" as SortKey } }
    );

    expect(result.current[0].items.map((m) => m.id)).toEqual(["m2", "m1"]);

    rerender({ sortKey: "coding" });
    expect(result.current[0].items.map((m) => m.id)).toEqual(["m1", "m2"]);
  });
});

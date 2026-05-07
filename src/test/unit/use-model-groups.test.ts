import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useModelGroups } from "@/components/ranking-table/use-model-groups";
import { type ModelWithScores } from "@/lib/scoring";
import { makeModel } from "../fixtures";

describe("useModelGroups", () => {
  it("groups models by category (intl / frontier / mainstream)", () => {
    const models: ModelWithScores[] = [
      makeModel("intl-1", { isInternational: true }),
      makeModel("frontier-1", { flags: { frontier: true } }),
      makeModel("mainstream-1", {}),
    ];

    const { result } = renderHook(() => useModelGroups(models, "date", true));
    const groups = result.current;

    expect(groups).toHaveLength(3);
    expect(groups[0].key).toBe("intl");
    expect(groups[0].items.map((m) => m.id)).toEqual(["intl-1"]);
    expect(groups[1].key).toBe("frontier");
    expect(groups[1].items.map((m) => m.id)).toEqual(["frontier-1"]);
    expect(groups[2].key).toBe("mainstream");
    expect(groups[2].items.map((m) => m.id)).toEqual(["mainstream-1"]);
  });

  it("sorts by intelligence descending", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60 }),
      makeModel("m2", { intelligence: 90 }),
      makeModel("m3", { intelligence: 70 }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "intelligence", true));
    const mainstream = result.current.find((g) => g.key === "mainstream")!;
    expect(mainstream.items.map((m) => m.id)).toEqual(["m2", "m3", "m1"]);
  });

  it("sorts by intelligence ascending", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60 }),
      makeModel("m2", { intelligence: 90 }),
      makeModel("m3", { intelligence: 70 }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "intelligence", false));
    const mainstream = result.current.find((g) => g.key === "mainstream")!;
    expect(mainstream.items.map((m) => m.id)).toEqual(["m1", "m3", "m2"]);
  });

  it("sorts by date descending", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { release_date: "2024-01-01" }),
      makeModel("m2", { release_date: "2024-06-01" }),
      makeModel("m3", { release_date: "2024-03-01" }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "date", true));
    const mainstream = result.current.find((g) => g.key === "mainstream")!;
    expect(mainstream.items.map((m) => m.id)).toEqual(["m2", "m3", "m1"]);
  });

  it("sorts by date ascending", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { release_date: "2024-01-01" }),
      makeModel("m2", { release_date: "2024-06-01" }),
      makeModel("m3", { release_date: "2024-03-01" }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "date", false));
    const mainstream = result.current.find((g) => g.key === "mainstream")!;
    expect(mainstream.items.map((m) => m.id)).toEqual(["m1", "m3", "m2"]);
  });

  it("handles null dates by pushing them to end when descending", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { release_date: "2024-01-01" }),
      makeModel("m2", { release_date: null }),
      makeModel("m3", { release_date: "2024-06-01" }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "date", true));
    const mainstream = result.current.find((g) => g.key === "mainstream")!;
    expect(mainstream.items.map((m) => m.id)).toEqual(["m3", "m1", "m2"]);
  });

  it("handles null values in numeric sort by pushing them to end", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60 }),
      makeModel("m2", { intelligence: null as unknown as number }),
      makeModel("m3", { intelligence: 80 }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "intelligence", true));
    const mainstream = result.current.find((g) => g.key === "mainstream")!;
    expect(mainstream.items.map((m) => m.id)).toEqual(["m3", "m1", "m2"]);
  });

  it("calculates rankOffset correctly", () => {
    const models: ModelWithScores[] = [
      makeModel("f1", { flags: { frontier: true } }),
      makeModel("f2", { flags: { frontier: true } }),
      makeModel("m1", {}),
    ];

    const { result } = renderHook(() => useModelGroups(models, "intelligence", true));
    const groups = result.current;

    expect(groups[0].key).toBe("intl");
    expect(groups[0].rankOffset).toBe(0);
    expect(groups[0].showRank).toBe(false);

    expect(groups[1].key).toBe("frontier");
    expect(groups[1].rankOffset).toBe(0);
    expect(groups[1].showRank).toBe(true);

    expect(groups[2].key).toBe("mainstream");
    expect(groups[2].rankOffset).toBe(2); // offset by frontier count
    expect(groups[2].showRank).toBe(true);
  });

  it("returns empty groups when no models match", () => {
    const models: ModelWithScores[] = [];
    const { result } = renderHook(() => useModelGroups(models, "intelligence", true));
    expect(result.current).toHaveLength(3);
    expect(result.current.every((g) => g.items.length === 0)).toBe(true);
  });

  it("filters international models correctly", () => {
    const models: ModelWithScores[] = [
      makeModel("intl-1", { isInternational: true }),
      makeModel("intl-2", { isInternational: true }),
      makeModel("cn-1", { isInternational: false }),
    ];

    const { result } = renderHook(() => useModelGroups(models, "date", true));
    const intl = result.current.find((g) => g.key === "intl")!;
    expect(intl.items.map((m) => m.id)).toEqual(["intl-1", "intl-2"]);
  });

  it("recomputes when sortKey changes", () => {
    const models: ModelWithScores[] = [
      makeModel("m1", { intelligence: 60, coding: 90 }),
      makeModel("m2", { intelligence: 90, coding: 60 }),
    ];

    const { result, rerender } = renderHook(
      ({ sortKey }) => useModelGroups(models, sortKey, true),
      { initialProps: { sortKey: "intelligence" as const } }
    );

    expect(result.current[2].items.map((m) => m.id)).toEqual(["m2", "m1"]);

    rerender({ sortKey: "coding" });
    expect(result.current[2].items.map((m) => m.id)).toEqual(["m1", "m2"]);
  });
});

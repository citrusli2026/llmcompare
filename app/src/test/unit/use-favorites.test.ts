import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFavorites } from "@/hooks/use-favorites";

describe("useFavorites", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty favorites initially", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  it("adds a favorite", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggleFavorite("gpt-4o");
    });

    expect(result.current.favorites).toEqual(["gpt-4o"]);
    expect(result.current.isFavorite("gpt-4o")).toBe(true);
  });

  it("removes a favorite when toggled again", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggleFavorite("gpt-4o");
    });
    act(() => {
      result.current.toggleFavorite("gpt-4o");
    });

    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite("gpt-4o")).toBe(false);
  });

  it("clears all favorites", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggleFavorite("a");
    });
    act(() => {
      result.current.toggleFavorite("b");
    });
    act(() => {
      result.current.clearFavorites();
    });

    expect(result.current.favorites).toEqual([]);
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggleFavorite("gpt-4o");
    });

    const stored = JSON.parse(localStorage.getItem("llmcompare-favorites")!);
    expect(stored).toEqual(["gpt-4o"]);
  });

  it("reads from localStorage on mount", () => {
    localStorage.setItem("llmcompare-favorites", JSON.stringify(["a", "b"]));

    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual(["a", "b"]);
  });

  it("handles invalid localStorage data gracefully", () => {
    localStorage.setItem("llmcompare-favorites", "not-json");

    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });
});

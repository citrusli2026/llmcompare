import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockReplace = vi.fn();
let mockSearch = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => mockSearch,
}));

vi.mock("@/lib/scoring", () => {
  const make = (id: string) => ({ id, name: id, raw: {}, flags: {} });
  return {
    getAllModels: () => [],
    getModelById: (id: string) => make(id),
  };
});

import { useCompareIds } from "@/hooks/use-compare-ids";

const setWidth = (w: number) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: w });
  window.dispatchEvent(new Event("resize"));
};

describe("useCompareIds — 响应式上限", () => {
  beforeEach(() => {
    mockSearch = new URLSearchParams();
    mockReplace.mockClear();
    setWidth(1280);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("桌面 (≥ 640px) 上限为 3", () => {
    setWidth(1280);
    const { result } = renderHook(() => useCompareIds());
    expect(result.current.maxCompare).toBe(3);
  });

  it("移动 (< 640px) 上限为 2", () => {
    setWidth(375);
    const { result } = renderHook(() => useCompareIds());
    expect(result.current.maxCompare).toBe(2);
  });

  it("viewport 切换时上限响应更新", () => {
    setWidth(1280);
    const { result } = renderHook(() => useCompareIds());
    expect(result.current.maxCompare).toBe(3);
    act(() => setWidth(375));
    expect(result.current.maxCompare).toBe(2);
    act(() => setWidth(1440));
    expect(result.current.maxCompare).toBe(3);
  });

  it("桌面达到 3 时 isAtMax=true,不能再加", () => {
    mockSearch = new URLSearchParams("compare=a,b,c");
    const { result } = renderHook(() => useCompareIds());
    expect(result.current.maxCompare).toBe(3);
    expect(result.current.isAtMax).toBe(true);

    act(() => result.current.toggleCompare("d"));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("移动达到 2 时 isAtMax=true,不能再加", () => {
    setWidth(375);
    mockSearch = new URLSearchParams("compare=a,b");
    const { result } = renderHook(() => useCompareIds());
    expect(result.current.maxCompare).toBe(2);
    expect(result.current.isAtMax).toBe(true);

    act(() => result.current.toggleCompare("d"));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("未达上限时允许添加", () => {
    mockSearch = new URLSearchParams("compare=a");
    const { result } = renderHook(() => useCompareIds());
    expect(result.current.isAtMax).toBe(false);
    act(() => result.current.toggleCompare("b"));
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("compare=a%2Cb"),
      expect.anything()
    );
  });

  it("已选中的模型在达到上限时仍可移除", () => {
    mockSearch = new URLSearchParams("compare=a,b,c");
    const { result } = renderHook(() => useCompareIds());
    expect(result.current.isAtMax).toBe(true);
    expect(result.current.isInCompare("a")).toBe(true);

    act(() => result.current.toggleCompare("a"));
    expect(mockReplace).toHaveBeenCalled();
    expect(mockReplace.mock.calls[0][0]).toContain("compare=b%2Cc");
  });
});
